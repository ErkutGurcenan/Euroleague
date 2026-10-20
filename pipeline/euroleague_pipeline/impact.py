"""Adjusted plus/minus: each player's offensive and defensive impact.

Usage:
    python -m euroleague_pipeline.impact

Every valid stint of a usable game (see stints.py) gives two observations:
each team's offence against the other's defence, scored as points per 100
possessions and weighted by possessions. A ridge regression explains all of
them at once with one offensive and one defensive value per player, plus the
league average and a home-court edge, so a player's value accounts for the
teammates and opponents he shared the court with.

Seasons are fitted in order. Each season's ridge pulls toward a starting
point carried from earlier seasons (70% of the last estimate; 0 for players
new to the data) rather than toward zero, so early-season numbers are stable
and sharpen as games come in. The ridge strength is chosen per season by
5-fold cross-validation over whole games.

Validation (Oct 2026): starting from the previous season beats starting from
zero in every season's cross-validation, and last season's values predict
this season's stint scoring better than a no-player baseline in all 10
seasons, while raw on/off values make those predictions worse in 7 of 10.

The whole chain is recomputed on each run (about 15 s).
"""
from __future__ import annotations

import argparse
import logging
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .models import Base, ImpactSeason, LineupStint, PlayerGameStat, PlayerImpact, StintCheck

log = logging.getLogger("impact")

DECAY = 0.7
LAMBDAS = (3000.0, 5000.0, 8000.0)
FOLDS = 5
MIN_POSS = 0.5  # stints shorter than about one possession carry no signal


def possessions(fga: int, fta: int, oreb: int, tov: int) -> float:
    return fga + 0.44 * fta - oreb + tov


def load_season(session: Session, season: str):
    """Observations (game, offence players, defence players, home offence?,
    points per 100, weight) plus minutes and possessions on court per player."""
    stints = session.execute(
        select(LineupStint)
        .join(StintCheck, (StintCheck.season_code == LineupStint.season_code)
              & (StintCheck.game_code == LineupStint.game_code))
        .where(LineupStint.season_code == season, LineupStint.valid, StintCheck.usable)
    ).scalars().all()
    obs, minutes, poss_on = [], defaultdict(float), defaultdict(float)
    for st in stints:
        p = (possessions(st.home_fga, st.home_fta, st.home_oreb, st.home_tov)
             + possessions(st.away_fga, st.away_fta, st.away_oreb, st.away_tov)) / 2
        home, away = st.home_lineup.split("|"), st.away_lineup.split("|")
        for pl in home + away:
            minutes[pl] += (st.end_sec - st.start_sec) / 60
            poss_on[pl] += p
        if p <= MIN_POSS:
            continue
        obs.append((st.game_code, home, away, 1, 100 * st.home_pts / p, p))
        obs.append((st.game_code, away, home, 0, 100 * st.away_pts / p, p))
    return obs, minutes, poss_on


class Design:
    """Normal equations X'WX and X'Wy per cross-validation fold.
    Columns: offence per player, defence per player, league average, home."""

    def __init__(self, obs: list[tuple], seed: int = 7):
        self.players: dict[str, int] = {}
        for _, off, de, *_ in obs:
            for pl in off + de:
                self.players.setdefault(pl, len(self.players))
        n = self.n = len(self.players)
        self.N = 2 * n + 2
        games = sorted({o[0] for o in obs})
        order = np.random.default_rng(seed).permutation(len(games)) % FOLDS
        fold_of = dict(zip(games, order))
        self.G = np.zeros((FOLDS, self.N, self.N))
        self.b = np.zeros((FOLDS, self.N))
        self.rows = []
        for g, off, de, h, y, w in obs:
            idx = np.array([self.players[p] for p in off] + [n + self.players[p] for p in de] + [2 * n, 2 * n + 1])
            val = np.array([1.0] * len(off) + [-1.0] * len(de) + [1.0, float(h)])
            f = fold_of[g]
            self.G[f][np.ix_(idx, idx)] += w * np.outer(val, val)
            self.b[f][idx] += w * val * y
            self.rows.append((f, idx, val, y, w))

    def penalty(self, lam: float) -> np.ndarray:
        P = np.full(self.N, lam)
        P[2 * self.n] = P[2 * self.n + 1] = 1e-6  # league average and home edge stay unpenalised
        return P

    def solve(self, lam: float, prior: np.ndarray, skip_fold: int | None = None) -> np.ndarray:
        G, b = self.G.sum(0), self.b.sum(0)
        if skip_fold is not None:
            G, b = G - self.G[skip_fold], b - self.b[skip_fold]
        P = self.penalty(lam)
        return np.linalg.solve(G + np.diag(P), b + P * prior)

    def cv_error(self, lam: float, prior: np.ndarray) -> float:
        sse = sw = 0.0
        for f in range(FOLDS):
            beta = self.solve(lam, prior, skip_fold=f)
            for ff, idx, val, y, w in self.rows:
                if ff == f:
                    e = y - val @ beta[idx]
                    sse += w * e * e
                    sw += w
        return sse / sw

    def standard_errors(self, lam: float, beta: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
        """Posterior covariance of the ridge fit: sigma^2 (X'WX + P)^-1, with
        sigma^2 from the weighted residuals and effective degrees of freedom."""
        G = self.G.sum(0)
        A_inv = np.linalg.inv(G + np.diag(self.penalty(lam)))
        sse = sum(w * (y - val @ beta[idx]) ** 2 for _, idx, val, y, w in self.rows)
        df = float(np.trace(G @ A_inv))
        sigma2 = sse / max(len(self.rows) - df, 1.0)
        return sigma2 * A_inv, A_inv


def run(session: Session) -> None:
    seasons = session.execute(select(LineupStint.season_code).distinct().order_by(LineupStint.season_code)).scalars().all()
    carried: dict[str, tuple[float, float]] = {}
    for season in seasons:
        obs, minutes, poss_on = load_season(session, season)
        if not obs:
            continue
        d = Design(obs)
        n = d.n
        prior = np.zeros(d.N)
        for pl, j in d.players.items():
            if pl in carried:
                prior[j], prior[n + j] = DECAY * carried[pl][0], DECAY * carried[pl][1]
        errors = {lam: d.cv_error(lam, prior) for lam in LAMBDAS}
        lam = min(errors, key=errors.get)
        baseline = d.cv_error(1e12, np.zeros(d.N))
        beta = d.solve(lam, prior)
        cov, _ = d.standard_errors(lam, beta)

        club_of = {}
        for pc, club, secs in session.execute(
            select(PlayerGameStat.player_code, PlayerGameStat.club_code, PlayerGameStat.seconds_played)
            .where(PlayerGameStat.season_code == season)
        ):
            club_of.setdefault(pc, defaultdict(int))[club] += secs or 0

        session.execute(delete(PlayerImpact).where(PlayerImpact.season_code == season))
        session.execute(delete(ImpactSeason).where(ImpactSeason.season_code == season))
        estimates = {}
        for pl, j in d.players.items():
            o, de = float(beta[j]), float(beta[n + j])
            var_o, var_d, cov_od = cov[j, j], cov[n + j, n + j], cov[j, n + j]
            clubs = club_of.get(pl)
            session.add(PlayerImpact(
                season_code=season, player_code=pl,
                club_code=max(clubs, key=clubs.get) if clubs else None,
                minutes=round(minutes[pl], 1), possessions=round(poss_on[pl], 1),
                off=round(o, 2), defense=round(de, 2), total=round(o + de, 2),
                off_se=round(float(np.sqrt(var_o)), 2), def_se=round(float(np.sqrt(var_d)), 2),
                total_se=round(float(np.sqrt(var_o + var_d + 2 * cov_od)), 2),
                prior_total=round(float(prior[j] + prior[n + j]), 2),
            ))
            estimates[pl] = (o, de)
        session.add(ImpactSeason(
            season_code=season, lam=lam, league_off=round(float(beta[2 * n]), 2),
            home_edge=round(float(beta[2 * n + 1]), 2), cv_baseline=round(baseline, 2),
            cv_model=round(errors[lam], 2), players=n, rows=len(obs),
        ))
        session.commit()
        log.info("%s: %d players, %d observations, lambda %.0f, held-out error %.1f vs %.1f without players",
                 season, n, len(obs), lam, errors[lam], baseline)
        # players absent this season keep a decayed older value for when they return
        carried = {**{pl: (DECAY * o, DECAY * de) for pl, (o, de) in carried.items()}, **estimates}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        run(session)
    return 0


if __name__ == "__main__":
    sys.exit(main())
