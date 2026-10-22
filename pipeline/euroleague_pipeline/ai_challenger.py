"""AI challenger: Jev's pre-game call for every upcoming game, recorded next
to Eurostepper's own predictions so the two can be compared fairly.

Usage:
    python -m euroleague_pipeline.ai_challenger [--days 8]

For each game in the next few days, Jev (TypeSafe's decision model, through
Vercel AI Gateway) gets the same kind of facts our model uses: each team's
record, last five results, power rating and season efficiency, who is at
home, and the league's home-win rate. It never sees our prediction. It
answers a yes/no question ("will the home team win?") with the probability
of yes; the facts sent are stored with the call.

Until 22 Oct 2026 Jev was asked to pick the winner (a choice question). Its
answers were near-certain (half at 95%+ or 5%-, log loss 1.14 on this
season's first 60 games, worse than a coin flip), while the yes/no question
gave realistic probabilities (log loss 0.656, level with our model). One
graded call, Hapoel v Virtus on 21 Oct, used the old question.

Calls are rewritten on each run until tip-off, then frozen, exactly like
predict.py, so only genuine pre-game calls are compared. Jev costs about
$0.000015 per game.

Needs an AI Gateway key in AI_GATEWAY_API_KEY or in
~/.config/eurostepper/ai_gateway.env; without one it does nothing.
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

import requests
from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .models import AiPrediction, Base, Club, Game, PlayerGameStat
from .simulate import current_ratings

log = logging.getLogger("ai_challenger")

ENDPOINT = "https://ai-gateway.vercel.sh/typesafe/v1/systemone"
MODEL = "typesafe-ai/jev"
PROVIDER = "jev"
KEY_FILE = Path.home() / ".config" / "eurostepper" / "ai_gateway.env"
HOME_WIN_RATE = "62%"  # home teams' share of wins since 2016-17


def load_key() -> str | None:
    if os.environ.get("AI_GATEWAY_API_KEY"):
        return os.environ["AI_GATEWAY_API_KEY"].strip()
    if KEY_FILE.exists():
        for line in KEY_FILE.read_text().splitlines():
            if line.startswith("AI_GATEWAY_API_KEY="):
                return line.split("=", 1)[1].strip() or None
    return None


def possessions(fga: float, fta: float, oreb: float, tov: float) -> float:
    return fga + 0.44 * fta - oreb + tov


def team_facts(session: Session, season: str) -> dict[str, dict]:
    """Record, last five results and net rating per 100 possessions so far."""
    box: dict[tuple, list[float]] = defaultdict(lambda: [0.0] * 4)
    for g, club, f2, f3, fta, oreb, tov in session.execute(
        select(PlayerGameStat.game_code, PlayerGameStat.club_code, PlayerGameStat.fg2a,
               PlayerGameStat.fg3a, PlayerGameStat.fta, PlayerGameStat.oreb, PlayerGameStat.tov)
        .where(PlayerGameStat.season_code == season)
    ):
        b = box[(g, club)]
        b[0] += (f2 or 0) + (f3 or 0)
        b[1] += fta or 0
        b[2] += oreb or 0
        b[3] += tov or 0
    facts: dict[str, dict] = defaultdict(lambda: {"wins": 0, "losses": 0, "results": [], "pf": 0, "pa": 0, "poss": 0.0})
    for g in session.execute(
        select(Game).where(Game.season_code == season, Game.played, Game.local_score.is_not(None))
        .order_by(Game.utc_date)
    ).scalars():
        poss = None
        if (g.game_code, g.local_club_code) in box and (g.game_code, g.road_club_code) in box:
            poss = (possessions(*box[(g.game_code, g.local_club_code)])
                    + possessions(*box[(g.game_code, g.road_club_code)])) / 2
        for club, pf, pa in ((g.local_club_code, g.local_score, g.road_score),
                             (g.road_club_code, g.road_score, g.local_score)):
            f = facts[club]
            won = pf > pa
            f["wins" if won else "losses"] += 1
            f["results"].append("W" if won else "L")
            if poss:
                f["pf"] += pf
                f["pa"] += pa
                f["poss"] += poss
    return facts


def describe(name: str, side: str, f: dict, rating: float) -> str:
    net = 100 * (f["pf"] - f["pa"]) / f["poss"] if f["poss"] else 0.0
    last5 = " ".join(f["results"][-5:]) or "no games yet"
    return (f"{side} team: {name}. Record this season {f['wins']}-{f['losses']}. "
            f"Last five results (oldest first): {last5}. Power rating {rating:.0f} "
            f"(1500 is league average). Net rating {net:+.1f} points per 100 possessions this season.")


def ask_jev(key: str, state: str, home_name: str, away_name: str) -> dict:
    body = {
        "model": MODEL,
        "state": state,
        "questions": {
            "home_win": {
                "type": "noul",
                "instructions": f"Will {home_name} (the home team) win this game?",
                "criteria": {
                    "true": f"{home_name} (the home team) wins",
                    "false": f"{away_name} (the away team) wins",
                },
            }
        },
    }
    for attempt in range(2):
        r = requests.post(ENDPOINT, json=body, timeout=45,
                          headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
        if r.ok:
            return r.json()
        if attempt == 0 and r.status_code >= 500:
            continue
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")
    raise RuntimeError("no response")


def run(session: Session, key: str, days: int) -> tuple[int, float]:
    season = session.execute(select(func.max(Game.season_code))).scalar()
    now = datetime.utcnow()
    games = session.execute(
        select(Game).where(Game.season_code == season, Game.played.is_(False),
                           Game.utc_date > now, Game.utc_date < now + timedelta(days=days))
        .order_by(Game.utc_date)
    ).scalars().all()
    if not games:
        return 0, 0.0
    clubs = {c.code: c for c in session.execute(select(Club)).scalars()}
    facts = team_facts(session, season)
    codes = sorted({g.local_club_code for g in games} | {g.road_club_code for g in games})
    ratings = current_ratings(session, season, codes)
    label = f"{season[1:]}-{str(int(season[1:]) + 1)[-2:]}"

    done, cost = 0, 0.0
    for g in games:
        home, away = g.local_club_code, g.road_club_code
        home_name = clubs[home].name if home in clubs else home
        away_name = clubs[away].name if away in clubs else away
        where = "a neutral court (Final Four)" if g.phase_type == "FF" else f"{home_name}'s home court"
        state = (
            f"EuroLeague basketball, {label} season, {g.round_name or 'game'}, played on {where}. "
            f"Home teams win about {HOME_WIN_RATE} of EuroLeague games. "
            + describe(home_name, "Home", facts[home], ratings[home]) + " "
            + describe(away_name, "Away", facts[away], ratings[away])
        )
        try:
            data = ask_jev(key, state, home_name, away_name)
            p_home = float(data["answers"]["home_win"]["noul"])
        except Exception as exc:  # keep any earlier call; try again next run
            log.warning("game %s (%s v %s) failed: %s", g.game_code, home, away, exc)
            continue
        game_cost = float(data.get("provider_metadata", {}).get("gateway", {}).get("cost") or 0)
        session.execute(delete(AiPrediction).where(
            AiPrediction.season_code == season, AiPrediction.game_code == g.game_code,
            AiPrediction.provider == PROVIDER))
        session.add(AiPrediction(
            season_code=season, game_code=g.game_code, provider=PROVIDER,
            model=str(data.get("model") or MODEL), made_at=now, utc_date=g.utc_date,
            home_club=home, away_club=away, home_win_prob=round(p_home, 4),
            confidence=None, state=state[:1500], cost_usd=game_cost,  # yes/no answers carry no confidence
        ))
        session.commit()
        done += 1
        cost += game_cost
    return done, cost


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--days", type=int, default=8, help="predict games starting within this many days")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    key = load_key()
    if not key:
        log.info("no AI Gateway key configured; skipping")
        return 0
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        n, cost = run(session, key, args.days)
    log.info("recorded %d Jev calls, cost $%.6f", n, cost)
    return 0


if __name__ == "__main__":
    sys.exit(main())
