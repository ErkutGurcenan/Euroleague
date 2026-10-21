"""Elo team ratings for every club, game by game since 2016-17.

Usage:
    python -m euroleague_pipeline.ratings

Before each game the home team's win probability is
1 / (1 + 10^(-(home rating + home edge - away rating) / 400)). After it, both
ratings move by K x (result - probability), scaled up for bigger winning
margins (log of the margin, damped when the favourite wins, as in
FiveThirtyEight's NBA Elo).

- Home edge 100 points (64% for equal teams; home teams win 62.3% of games),
  50 in the empty-arena 2020-21 season (56.7% home wins), none at the
  neutral-venue Final Four.
- Every summer each rating moves 30% of the way back to 1500.
- Clubs new to the EuroLeague start at 1460 (first-season clubs have won
  43.8% of games); clubs returning after a gap keep a quarter of their old
  distance from 1460. Both learn twice as fast for their first 10 games.

Settings were tuned on pre-game log loss over 2017-18 to 2026-27 (2016-17
is the warm-up): 0.613 against 0.663 for a constant home-win rate, with
66% of winners picked against 62% for "the home team always wins".
The whole history is recomputed on each run (a few seconds).
"""
from __future__ import annotations

import argparse
import logging
import math
import sys
from pathlib import Path

from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .models import Base, Game, TeamRating

log = logging.getLogger("ratings")

MEAN = 1500.0
NEWCOMER = 1460.0
K = 10.0
HOME_EDGE = 100.0
HOME_EDGE_EMPTY_ARENAS = {"E2020": 50.0}
SUMMER_CARRY = 0.7
RETURNING_KEEP = 0.25
NEW_CLUB_K = 2.0
NEW_CLUB_GAMES = 10


def home_edge(season: str, phase: str | None) -> float:
    if phase == "FF":
        return 0.0
    return HOME_EDGE_EMPTY_ARENAS.get(season, HOME_EDGE)


def win_probability(diff: float) -> float:
    return 1 / (1 + 10 ** (-diff / 400))


def run(session: Session) -> int:
    games = session.execute(
        select(Game).where(Game.played, Game.local_score.is_not(None))
        .order_by(Game.utc_date, Game.game_code)
    ).scalars().all()
    seasons = sorted({g.season_code for g in games})
    order = {s: i for i, s in enumerate(seasons)}

    rating: dict[str, float] = {}
    last_season: dict[str, str] = {}
    fresh: set[str] = set()  # clubs new or returning this season
    played: dict[str, int] = {}
    current = None
    rows = []
    for g in games:
        if g.season_code != current:
            current = g.season_code
            played, fresh = {}, set()
            for club in rating:
                rating[club] = MEAN + SUMMER_CARRY * (rating[club] - MEAN)
        home, away = g.local_club_code, g.road_club_code
        for club in (home, away):
            if club not in rating:
                rating[club] = MEAN if current == seasons[0] else NEWCOMER
                if current != seasons[0]:
                    fresh.add(club)
            elif last_season[club] != current and order[current] - order[last_season[club]] > 1:
                rating[club] = NEWCOMER + RETURNING_KEEP * (rating[club] - NEWCOMER)
                fresh.add(club)
            last_season[club] = current

        diff = rating[home] + home_edge(current, g.phase_type) - rating[away]
        p_home = win_probability(diff)
        home_won = g.local_score > g.road_score
        margin = abs(g.local_score - g.road_score)
        winner_diff = diff if home_won else -diff
        multiplier = math.log(margin + 1) * (2.2 / (winner_diff * 0.001 + 2.2))
        change = multiplier * ((1.0 if home_won else 0.0) - p_home)

        before = {home: rating[home], away: rating[away]}
        for club, sign in ((home, 1), (away, -1)):
            played[club] = played.get(club, 0) + 1
            k = K * (NEW_CLUB_K if club in fresh and played[club] <= NEW_CLUB_GAMES else 1.0)
            rating[club] += sign * k * change
        for club, opp, is_home, p in ((home, away, True, p_home), (away, home, False, 1 - p_home)):
            rows.append(TeamRating(
                season_code=current, game_code=g.game_code, club_code=club, opponent_code=opp,
                home=is_home, utc_date=g.utc_date, rating_before=round(before[club], 1),
                rating_after=round(rating[club], 1), win_prob=round(p, 4),
                won=home_won if is_home else not home_won,
            ))

    session.execute(delete(TeamRating))
    session.add_all(rows)
    session.commit()
    return len(games)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        log.info("rated %d games", run(session))
    return 0


if __name__ == "__main__":
    sys.exit(main())
