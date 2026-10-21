"""Game predictions: win probability and expected margin for every upcoming
game, plus a walk-forward backtest of past seasons.

Usage:
    python -m euroleague_pipeline.predict

Inputs, each known before tip-off and expressed as home minus away:
- rating gap: pre-game Elo ratings (see ratings.py)
- efficiency gap: season-to-date net rating per 100 possessions, blended
  with 70% of last season's (worth six games), so early-season values lean
  on last season
- home court: 1, or 0 at the neutral-venue Final Four; plus a flag for the
  empty-arena 2020-21 season

A logistic regression turns the standardised inputs into a home win
probability; a linear regression on the same inputs gives the expected
margin. Both are trained on every completed game.

Recent form, rest days and player availability (impact of usual players who
missed the previous game) were tested and left out: in the walk-forward
backtest they made predictions worse, or helped in only 2 of 9 seasons.

Backtest (each season predicted by a model trained only on earlier ones,
2017-18 to 2026-27): 66.4% of winners and log loss 0.612, against 62.2% for
"the home team always wins"; well calibrated (games called at 70%+ were won
by the favourite 77% of the time); margin off by 9.2 points on average
against 10.0 for a constant home margin.

Upcoming games are re-predicted on every run until tip-off; after that a
prediction is never changed, so the public track record only contains
genuine pre-game calls.
"""
from __future__ import annotations

import argparse
import json
import logging
import math
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .models import Base, Game, GamePrediction, PlayerGameStat, TeamRating
from .ratings import home_edge, win_probability
from .simulate import current_ratings

log = logging.getLogger("predict")

MODEL_VERSION = "v1: rating + efficiency + home"
FEATURES = ("rating_diff", "net_diff", "home_court", "empty_arena")
EMPTY_ARENA_SEASONS = {"E2020"}
PRIOR_GAMES = 6
PRIOR_CARRY = 0.7
NEW_CLUB_NET = -3.0
L2 = 1.0


def possessions(fga: float, fta: float, oreb: float, tov: float) -> float:
    return fga + 0.44 * fta - oreb + tov


def build_rows(session: Session) -> list[dict]:
    """One row per game (played or not) with its pre-game inputs."""
    games = session.execute(
        select(Game).where(Game.utc_date.is_not(None)).order_by(Game.utc_date, Game.game_code)
    ).scalars().all()
    box: dict[tuple, dict[str, list[float]]] = defaultdict(lambda: defaultdict(lambda: [0.0] * 4))
    for s, g, club, f2, f3, fta, oreb, tov in session.execute(
        select(PlayerGameStat.season_code, PlayerGameStat.game_code, PlayerGameStat.club_code,
               PlayerGameStat.fg2a, PlayerGameStat.fg3a, PlayerGameStat.fta, PlayerGameStat.oreb, PlayerGameStat.tov)
    ):
        b = box[(s, g)][club]
        b[0] += (f2 or 0) + (f3 or 0)
        b[1] += fta or 0
        b[2] += oreb or 0
        b[3] += tov or 0
    elo = {
        (s, g, club): (rb, wp)
        for s, g, club, rb, wp in session.execute(
            select(TeamRating.season_code, TeamRating.game_code, TeamRating.club_code,
                   TeamRating.rating_before, TeamRating.win_prob)
        )
    }
    latest_season = max(g.season_code for g in games)
    live_ratings = current_ratings(
        session, latest_season,
        sorted({g.local_club_code for g in games if g.season_code == latest_season}
               | {g.road_club_code for g in games if g.season_code == latest_season}),
    )

    totals: dict[tuple, list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0])  # points for, against, possessions
    games_played: dict[tuple, int] = defaultdict(int)
    final_net: dict[tuple, float] = {}
    current = None
    rows = []
    for g in games:
        s = g.season_code
        if s != current:
            if current:
                for (ss, club), (pf, pa, pp) in totals.items():
                    if ss == current and pp:
                        final_net[(ss, club)] = 100 * (pf - pa) / pp
            current = s
        prev = f"E{int(s[1:]) - 1}"
        net = {}
        for club in (g.local_club_code, g.road_club_code):
            pf, pa, pp = totals[(s, club)]
            n = games_played[(s, club)]
            cur = 100 * (pf - pa) / pp if pp else 0.0
            prior = PRIOR_CARRY * final_net.get((prev, club), NEW_CLUB_NET)
            net[club] = (n * cur + PRIOR_GAMES * prior) / (n + PRIOR_GAMES)
        home, away = g.local_club_code, g.road_club_code
        e_h, e_a = elo.get((s, g.game_code, home)), elo.get((s, g.game_code, away))
        done = bool(g.played and g.local_score is not None)
        if done and e_h and e_a:
            rating_diff, elo_p = e_h[0] - e_a[0], e_h[1]
        elif not done and s == latest_season:
            rating_diff = live_ratings[home] - live_ratings[away]
            elo_p = win_probability(rating_diff + home_edge(s, g.phase_type))
        else:
            rating_diff = None
        if rating_diff is not None:
            rows.append({
                "season": s, "game": g.game_code, "date": g.utc_date, "phase": g.phase_type,
                "home": home, "away": away, "played": done,
                "rating_diff": rating_diff, "net_diff": net[home] - net[away],
                "home_court": 0.0 if g.phase_type == "FF" else 1.0,
                "empty_arena": 1.0 if (s in EMPTY_ARENA_SEASONS and g.phase_type != "FF") else 0.0,
                "elo_p": elo_p,
                "won": (1.0 if g.local_score > g.road_score else 0.0) if done else None,
                "margin": (g.local_score - g.road_score) if done else None,
            })
        if done and (s, g.game_code) in box:
            bh, ba = box[(s, g.game_code)].get(home), box[(s, g.game_code)].get(away)
            if bh and ba:
                poss = (possessions(*bh) + possessions(*ba)) / 2
                for club, pf, pa in ((home, g.local_score, g.road_score), (away, g.road_score, g.local_score)):
                    t = totals[(s, club)]
                    t[0] += pf
                    t[1] += pa
                    t[2] += poss
                    games_played[(s, club)] += 1
    return rows


class Model:
    def __init__(self, train: list[dict]):
        X = np.array([[r[f] for f in FEATURES] for r in train])
        self.mu = X.mean(0)
        self.sd = X.std(0)
        self.sd[self.sd == 0] = 1.0
        Xs = self._design(X)
        y = np.array([r["won"] for r in train])
        w = np.zeros(Xs.shape[1])
        for _ in range(50):
            p = 1 / (1 + np.exp(-Xs @ w))
            grad = Xs.T @ (p - y) + L2 * w
            hess = (Xs * (p * (1 - p))[:, None]).T @ Xs + L2 * np.eye(Xs.shape[1])
            w -= np.linalg.solve(hess, grad)
        self.w = w
        self.beta = np.linalg.lstsq(Xs, np.array([r["margin"] for r in train]), rcond=None)[0]

    def _design(self, X: np.ndarray) -> np.ndarray:
        return np.hstack([(X - self.mu) / self.sd, np.ones((len(X), 1))])

    def predict(self, rows: list[dict]) -> tuple[np.ndarray, np.ndarray]:
        Xs = self._design(np.array([[r[f] for f in FEATURES] for r in rows]))
        return 1 / (1 + np.exp(-Xs @ self.w)), Xs @ self.beta

    def factors(self, row: dict) -> dict[str, float]:
        """Each input's push on the log-odds relative to two equal teams on a
        neutral court (input = 0), for the "key factors" shown with a call."""
        return {f: round(float(self.w[i] * row[f] / self.sd[i]), 3) for i, f in enumerate(FEATURES)}


def run(session: Session) -> tuple[int, dict]:
    rows = build_rows(session)
    played = [r for r in rows if r["played"]]
    now = datetime.utcnow()

    # walk-forward backtest: each season predicted by a model trained on earlier seasons only
    seasons = sorted({r["season"] for r in played})
    session.execute(delete(GamePrediction).where(GamePrediction.backtest.is_(True)))
    summary = {"n": 0, "correct": 0, "ll": 0.0}
    for season in seasons[2:]:
        train = [r for r in played if r["season"] < season]
        test = [r for r in played if r["season"] == season]
        model = Model(train)
        probs, margins = model.predict(test)
        for r, p, m in zip(test, probs, margins):
            session.add(_record(r, float(p), float(m), model, now, backtest=True))
            summary["n"] += 1
            summary["correct"] += (p > 0.5) == (r["won"] == 1.0)
            summary["ll"] -= math.log(p if r["won"] else 1 - p)

    # live: train on everything played, predict upcoming games that haven't started
    model = Model(played)
    upcoming = [r for r in rows if not r["played"] and r["date"] and r["date"] > now]
    if upcoming:
        probs, margins = model.predict(upcoming)
        for r, p, m in zip(upcoming, probs, margins):
            session.execute(delete(GamePrediction).where(
                GamePrediction.season_code == r["season"], GamePrediction.game_code == r["game"],
                GamePrediction.backtest.is_(False)))
            session.add(_record(r, float(p), float(m), model, now, backtest=False))
    session.commit()
    return len(upcoming), summary


def _record(r: dict, p: float, m: float, model: Model, now: datetime, backtest: bool) -> GamePrediction:
    return GamePrediction(
        season_code=r["season"], game_code=r["game"], backtest=backtest, made_at=now,
        utc_date=r["date"], home_club=r["home"], away_club=r["away"],
        home_win_prob=round(p, 4), home_margin=round(m, 1), elo_home_prob=round(r["elo_p"], 4),
        rating_diff=round(r["rating_diff"], 1), net_diff=round(r["net_diff"], 2),
        home_court=r["home_court"], factors=json.dumps(model.factors(r)), model_version=MODEL_VERSION,
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        n, s = run(session)
    log.info("predicted %d upcoming games; backtest %d games: %.1f%% correct, log loss %.4f",
             n, s["n"], 100 * s["correct"] / max(s["n"], 1), s["ll"] / max(s["n"], 1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
