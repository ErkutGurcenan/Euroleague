"""Ingest a Euroleague season into the local database.

Usage:
    python -m euroleague_pipeline.ingest --season E2025 [--db path/to.db]

Idempotent: rows are upserted by natural key, so re-running refreshes data.
"""
from __future__ import annotations

import argparse
import logging
import re
import sys
from datetime import datetime
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from .api import EuroleagueApi
from .models import Base, Club, Game, GameReferee, PersonStint, StandingRow

log = logging.getLogger("ingest")

DEFAULT_DB = Path(__file__).resolve().parents[2] / "db" / "euroleague.db"


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    value = value.replace("Z", "+00:00")
    # Python 3.9 fromisoformat requires exactly 3 or 6 fractional digits;
    # the API emits arbitrary precision (e.g. ".73"), so drop the fraction.
    value = re.sub(r"\.\d+", "", value)
    return datetime.fromisoformat(value).replace(tzinfo=None)


def upsert(session: Session, model, keys: dict, values: dict) -> None:
    row = session.execute(select(model).filter_by(**keys)).scalar_one_or_none()
    if row is None:
        session.add(model(**keys, **values))
    else:
        for k, v in values.items():
            setattr(row, k, v)


def ingest_clubs(api: EuroleagueApi, session: Session, season: str) -> int:
    n = 0
    for c in api.clubs(season):
        country = c.get("country") or {}
        upsert(
            session,
            Club,
            {"code": c["code"]},
            {
                "name": c.get("name"),
                "abbreviated_name": c.get("abbreviatedName"),
                "country_code": country.get("code"),
                "country_name": country.get("name"),
                "city": c.get("city"),
                "venue": c.get("venueCode"),
                "crest_url": (c.get("images") or {}).get("crest"),
                "website": c.get("website"),
            },
        )
        n += 1
    return n


def ensure_club(session: Session, club: dict | None) -> str | None:
    """Games may reference clubs not in the season's club list (e.g. virtual
    Final Four placeholders). Insert a minimal row so the FK holds."""
    if not club or not club.get("code"):
        return None
    code = club["code"]
    if session.get(Club, code) is None:
        session.add(
            Club(
                code=code,
                name=club.get("name") or code,
                abbreviated_name=club.get("abbreviatedName"),
                crest_url=(club.get("images") or {}).get("crest"),
            )
        )
    return code


def ingest_games(api: EuroleagueApi, session: Session, season: str) -> int:
    n = 0
    for g in api.games(season):
        local, road = g.get("local") or {}, g.get("road") or {}
        lp = local.get("partials") or {}
        rp = road.get("partials") or {}
        upsert(
            session,
            Game,
            {"id": g["id"]},
            {
                "season_code": season,
                "game_code": g.get("gameCode"),
                "round": g.get("round"),
                "round_name": g.get("roundName"),
                "phase_type": (g.get("phaseType") or {}).get("code"),
                "group_name": (g.get("group") or {}).get("rawName", "").strip() or None,
                "played": bool(g.get("played")),
                "utc_date": parse_dt(g.get("utcDate")),
                "local_club_code": ensure_club(session, local.get("club")),
                "road_club_code": ensure_club(session, road.get("club")),
                "local_score": local.get("score") if g.get("played") else None,
                "road_score": road.get("score") if g.get("played") else None,
                "local_q1": lp.get("partials1"),
                "local_q2": lp.get("partials2"),
                "local_q3": lp.get("partials3"),
                "local_q4": lp.get("partials4"),
                "road_q1": rp.get("partials1"),
                "road_q2": rp.get("partials2"),
                "road_q3": rp.get("partials3"),
                "road_q4": rp.get("partials4"),
            },
        )
        for slot in ("referee1", "referee2", "referee3"):
            r = g.get(slot)
            if not r or not r.get("code"):
                continue
            upsert(
                session,
                GameReferee,
                {
                    "season_code": season,
                    "game_code": g.get("gameCode"),
                    "referee_code": r["code"],
                },
                {
                    "name": r.get("name"),
                    "country_code": (r.get("country") or {}).get("code"),
                },
            )
        n += 1
    return n


def ingest_people(api: EuroleagueApi, session: Session, season: str) -> int:
    n = 0
    for p in api.people(season):
        person = p.get("person") or {}
        country = person.get("country") or {}
        club_code = ensure_club(session, p.get("club"))
        if not club_code or not person.get("code"):
            continue
        upsert(
            session,
            PersonStint,
            {
                "season_code": season,
                "club_code": club_code,
                "person_code": person["code"],
                "type": p.get("type"),
                "start_date": parse_dt(p.get("startDate")),
            },
            {
                "type_name": p.get("typeName"),
                "name": person.get("name"),
                "country_code": country.get("code"),
                "country_name": country.get("name"),
                "height_cm": person.get("height") or None,
                "weight_kg": person.get("weight") or None,
                "birth_date": parse_dt(person.get("birthDate")),
                "dorsal": p.get("dorsal") or None,
                "position": p.get("position") or None,
                "position_name": p.get("positionName"),
                "active": p.get("active"),
                "end_date": parse_dt(p.get("endDate")),
                "image_url": (p.get("images") or {}).get("headshot"),
            },
        )
        n += 1
    return n


def ingest_standings(api: EuroleagueApi, session: Session, season: str) -> int:
    """Standings for every round that has completed games (regular season),
    so we can chart position-over-time later, not just the latest table."""
    played_rounds = session.execute(
        select(Game.round)
        .where(Game.season_code == season, Game.played, Game.phase_type == "RS")
        .distinct()
    ).scalars().all()
    n = 0
    for rnd in sorted(r for r in played_rounds if r is not None):
        groups = api.standings(season, rnd)
        for group in groups or []:
            group_name = (group.get("group") or {}).get("rawName", "").strip() or None
            for row in group.get("standings") or []:
                club_code = ensure_club(session, row.get("club"))
                data = row.get("data") or {}
                if not club_code:
                    continue
                upsert(
                    session,
                    StandingRow,
                    {"season_code": season, "round": rnd, "club_code": club_code},
                    {
                        "group_name": group_name,
                        "position": data.get("position"),
                        "games_played": data.get("gamesPlayed"),
                        "games_won": data.get("gamesWon"),
                        "games_lost": data.get("gamesLost"),
                        "points_favour": data.get("pointsFavour"),
                        "points_against": data.get("pointsAgainst"),
                        "qualified": data.get("qualified"),
                    },
                )
                n += 1
        log.info("standings: round %s done", rnd)
    return n


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", required=True, help="e.g. E2025")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument(
        "--skip-standings", action="store_true",
        help="skip per-round standings (the slowest step)",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    args.db.parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)

    api = EuroleagueApi()
    with Session(engine) as session:
        log.info("clubs: %d", ingest_clubs(api, session, args.season))
        session.commit()
        log.info("games: %d", ingest_games(api, session, args.season))
        session.commit()
        log.info("people: %d", ingest_people(api, session, args.season))
        session.commit()
        if not args.skip_standings:
            log.info("standings rows: %d", ingest_standings(api, session, args.season))
            session.commit()
    log.info("done -> %s", args.db)
    return 0


if __name__ == "__main__":
    sys.exit(main())
