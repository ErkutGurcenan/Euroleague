"""Season simulation: playoff, play-in, Final Four and title odds.

Usage:
    python -m euroleague_pipeline.simulate [--season E2026] [--sims 10000]

Plays out the rest of the regular season many times with the current Elo
ratings (see ratings.py), then the play-in (7v8 for the 7th seed, 9v10, then
the 7v8 loser hosts the 9v10 winner for the 8th seed), best-of-five
playoffs (1v8, 4v5, 3v6, 2v7; the higher seed hosts games 1, 2 and 5) and a
neutral-venue Final Four (1v8/4v5 winners, 3v6/2v7 winners).

Ratings are uncertain, so each simulated season shifts every club's rating
by a random amount (standard deviation RATING_NOISE = 50). Backtested from
rounds 6, 12 and 20 of past seasons, 50 predicted final top-6 and top-10
finishes best overall (log loss for top 6 about 0.34-0.42, against 0.64 for
giving every club the same chance). Ties in the standings
are broken by current point difference, then at random (the real
tie-breakers use head-to-head results, which the simulation approximates).
Only runs while regular-season games remain.
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

import numpy as np
from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .models import Base, Game, SeasonOdds, TeamRating
from .ratings import MEAN, NEWCOMER, SUMMER_CARRY, home_edge, win_probability

log = logging.getLogger("simulate")

RATING_NOISE = 50.0


def current_ratings(session: Session, season: str, clubs: list[str]) -> dict[str, float]:
    latest = {}
    for club, rating, season_code in session.execute(
        select(TeamRating.club_code, TeamRating.rating_after, TeamRating.season_code)
        .order_by(TeamRating.utc_date, TeamRating.game_code)
    ):
        latest[club] = (rating, season_code)
    out = {}
    for club in clubs:
        if club not in latest:
            out[club] = NEWCOMER
        elif latest[club][1] == season:
            out[club] = latest[club][0]
        else:  # no game yet this season: apply the summer regression
            out[club] = MEAN + SUMMER_CARRY * (latest[club][0] - MEAN)
    return out


def simulate(session: Session, season: str, sims: int, seed: int = 2026) -> int:
    games = session.execute(
        select(Game).where(Game.season_code == season, Game.phase_type == "RS")
    ).scalars().all()
    remaining = [g for g in games if not g.played]
    if not remaining:
        log.info("%s: regular season finished, nothing to simulate", season)
        return 0
    clubs = sorted({g.local_club_code for g in games} | {g.road_club_code for g in games})
    idx = {c: i for i, c in enumerate(clubs)}
    T = len(clubs)
    ratings = current_ratings(session, season, clubs)
    base = np.array([ratings[c] for c in clubs])
    edge = home_edge(season, "RS")

    wins = np.zeros(T)
    losses = np.zeros(T)
    point_diff = np.zeros(T)
    for g in games:
        if not g.played or g.local_score is None:
            continue
        h, a = idx[g.local_club_code], idx[g.road_club_code]
        home_won = g.local_score > g.road_score
        wins[h if home_won else a] += 1
        losses[a if home_won else h] += 1
        point_diff[h] += g.local_score - g.road_score
        point_diff[a] -= g.local_score - g.road_score

    rng = np.random.default_rng(seed)
    r = base[None, :] + rng.normal(0, RATING_NOISE, (sims, T))
    sim_wins = np.tile(wins, (sims, 1))
    H = np.array([idx[g.local_club_code] for g in remaining])
    A = np.array([idx[g.road_club_code] for g in remaining])
    p_home = win_probability(r[:, H] + edge - r[:, A])
    home_won = rng.random(p_home.shape) < p_home
    rows = np.arange(sims)
    for j in range(len(remaining)):
        sim_wins[rows, H[j]] += home_won[:, j]
        sim_wins[rows, A[j]] += ~home_won[:, j]

    score = sim_wins + point_diff[None, :] / 1e5 + rng.random((sims, T)) * 1e-7
    order = np.argsort(-score, axis=1)  # order[:, k] = club in position k+1

    def play(home_team, away_team, neutral=False):
        diff = r[rows, home_team] - r[rows, away_team] + (0.0 if neutral else edge)
        return np.where(rng.random(sims) < win_probability(diff), home_team, away_team)

    def series(high, low):
        p_home_game = win_probability(r[rows, high] - r[rows, low] + edge)
        p_away_game = win_probability(r[rows, high] - r[rows, low] - edge)
        high_wins = (rng.random((sims, 3)) < p_home_game[:, None]).sum(1) + (rng.random((sims, 2)) < p_away_game[:, None]).sum(1)
        return np.where(high_wins >= 3, high, low)

    s = [order[:, k] for k in range(10)]
    winner_a = play(s[6], s[7])
    loser_a = np.where(winner_a == s[6], s[7], s[6])
    winner_b = play(s[8], s[9])
    eighth = play(loser_a, winner_b)
    seventh = winner_a
    po_a = series(s[0], eighth)
    po_b = series(s[3], s[4])
    po_c = series(s[2], s[5])
    po_d = series(s[1], seventh)
    final_1 = play(po_a, po_b, neutral=True)
    final_2 = play(po_c, po_d, neutral=True)
    champion = play(final_1, final_2, neutral=True)

    def share(teams_by_sim):
        return np.bincount(teams_by_sim.ravel(), minlength=T) / sims

    position = np.empty_like(order)
    position[rows[:, None], order] = np.arange(T)[None, :]
    top6 = (position < 6).mean(0)
    play_in = ((position >= 6) & (position < 10)).mean(0)
    playoffs = share(np.stack([s[0], s[1], s[2], s[3], s[4], s[5], seventh, eighth], axis=1))
    final_four = share(np.stack([po_a, po_b, po_c, po_d], axis=1))
    first = (position == 0).mean(0)
    title = share(champion)
    games_per_club = len(games) * 2 / T

    now = datetime.utcnow()
    session.execute(delete(SeasonOdds).where(SeasonOdds.season_code == season))
    for c, i in idx.items():
        pw = float(sim_wins[:, i].mean())
        session.add(SeasonOdds(
            season_code=season, club_code=c, computed_at=now, simulations=sims,
            rating=round(float(base[i]), 1), wins=int(wins[i]), losses=int(losses[i]),
            proj_wins=round(pw, 1), proj_losses=round(games_per_club - pw, 1),
            first_seed=round(float(first[i]), 4), top6=round(float(top6[i]), 4),
            play_in=round(float(play_in[i]), 4), playoffs=round(float(playoffs[i]), 4),
            final_four=round(float(final_four[i]), 4), champion=round(float(title[i]), 4),
        ))
    session.commit()
    return len(remaining)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", help="default: latest season")
    parser.add_argument("--sims", type=int, default=10000)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        season = args.season or session.execute(select(func.max(Game.season_code))).scalar()
        n = simulate(session, season, args.sims)
        if n:
            log.info("%s: simulated %d remaining games x %d seasons", season, n, args.sims)
    return 0


if __name__ == "__main__":
    sys.exit(main())
