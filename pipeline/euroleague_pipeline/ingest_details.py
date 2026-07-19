"""Ingest per-game details: box scores, shot coordinates, play-by-play.

Usage:
    python -m euroleague_pipeline.ingest_details --season E2025 [--force]

Iterates every played game of the season already in the DB (run
`ingest` first). Idempotent: games with existing detail rows are
skipped unless --force; each game is delete+insert in one transaction.
"""
from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session

from .api import EuroleagueLiveApi
from .models import Base, Game, PbpEvent, PlayerGameStat, Shot

log = logging.getLogger("ingest_details")

DEFAULT_DB = Path(__file__).resolve().parents[2] / "db" / "euroleague.db"

QUARTER_KEYS = [
    ("FirstQuarter", 1),
    ("SecondQuarter", 2),
    ("ThirdQuarter", 3),
    ("ForthQuarter", 4),  # sic — API misspells "Fourth"
    ("ExtraTime", 5),
]


def clean_code(raw: Optional[str]) -> Optional[str]:
    """API pads codes with spaces and prefixes person codes with P."""
    if not raw:
        return None
    code = raw.strip()
    if code.startswith("P") and code[1:].isdigit():
        code = code[1:]
    return code or None


def parse_minutes(raw: Optional[str]) -> Optional[int]:
    if not raw or ":" not in raw:
        return None
    m, s = raw.split(":", 1)
    try:
        return int(m) * 60 + int(s)
    except ValueError:
        return None


def boxscore_rows(payload: dict, season: str, game_code: int) -> list[PlayerGameStat]:
    rows = []
    for team in payload.get("Stats") or []:
        for p in team.get("PlayersStats") or []:
            player_code = clean_code(p.get("Player_ID"))
            # Minutes is 'DNP' or empty for players who did not enter the game;
            # IsPlaying only flags who was on court at the final buzzer.
            seconds = parse_minutes(p.get("Minutes"))
            if not player_code or seconds is None:
                continue
            rows.append(
                PlayerGameStat(
                    season_code=season,
                    game_code=game_code,
                    club_code=clean_code(p.get("Team")),
                    player_code=player_code,
                    player_name=p.get("Player"),
                    dorsal=p.get("Dorsal"),
                    is_starter=bool(p.get("IsStarter")),
                    seconds_played=seconds,
                    points=p.get("Points"),
                    fg2m=p.get("FieldGoalsMade2"),
                    fg2a=p.get("FieldGoalsAttempted2"),
                    fg3m=p.get("FieldGoalsMade3"),
                    fg3a=p.get("FieldGoalsAttempted3"),
                    ftm=p.get("FreeThrowsMade"),
                    fta=p.get("FreeThrowsAttempted"),
                    oreb=p.get("OffensiveRebounds"),
                    dreb=p.get("DefensiveRebounds"),
                    treb=p.get("TotalRebounds"),
                    ast=p.get("Assistances"),
                    stl=p.get("Steals"),
                    tov=p.get("Turnovers"),
                    blk=p.get("BlocksFavour"),
                    blk_against=p.get("BlocksAgainst"),
                    fouls_committed=p.get("FoulsCommited"),
                    fouls_drawn=p.get("FoulsReceived"),
                    pir=p.get("Valuation"),
                    plus_minus=p.get("Plusminus"),
                )
            )
    return rows


def shot_rows(payload: dict, season: str, game_code: int) -> list[Shot]:
    rows = []
    for s in payload.get("Rows") or []:
        action = (s.get("ID_ACTION") or "").strip()
        rows.append(
            Shot(
                season_code=season,
                game_code=game_code,
                num_anot=s["NUM_ANOT"],
                club_code=clean_code(s.get("TEAM")),
                player_code=clean_code(s.get("ID_PLAYER")),
                player_name=s.get("PLAYER"),
                action_id=action,
                made=action.endswith("M"),  # 2FGM/3FGM/FTM vs 2FGA/...
                points=s.get("POINTS"),
                coord_x=s.get("COORD_X"),
                coord_y=s.get("COORD_Y"),
                zone=(s.get("ZONE") or "").strip() or None,
                fastbreak=s.get("FASTBREAK") == "1",
                second_chance=s.get("SECOND_CHANCE") == "1",
                off_turnover=s.get("POINTS_OFF_TURNOVER") == "1",
                minute=s.get("MINUTE"),
                clock=s.get("CONSOLE"),
            )
        )
    return rows


def pbp_rows(payload: dict, season: str, game_code: int) -> list[PbpEvent]:
    rows = []
    for key, quarter in QUARTER_KEYS:
        for e in payload.get(key) or []:
            rows.append(
                PbpEvent(
                    season_code=season,
                    game_code=game_code,
                    quarter=quarter,
                    play_number=e["NUMBEROFPLAY"],
                    play_type=(e.get("PLAYTYPE") or "").strip() or None,
                    club_code=clean_code(e.get("CODETEAM")),
                    player_code=clean_code(e.get("PLAYER_ID")),
                    player_name=e.get("PLAYER"),
                    minute=e.get("MINUTE"),
                    marker_time=e.get("MARKERTIME") or None,
                    points_a=e.get("POINTS_A"),
                    points_b=e.get("POINTS_B"),
                    play_info=e.get("PLAYINFO") or None,
                )
            )
    return rows


def ingest_game(
    api: EuroleagueLiveApi,
    session: Session,
    season: str,
    game_code: int,
    parts: set[str],
) -> dict[str, int]:
    work = []
    if "box" in parts:
        work.append(
            (PlayerGameStat, boxscore_rows(api.boxscore(season, game_code), season, game_code))
        )
    if "shots" in parts:
        work.append((Shot, shot_rows(api.shots(season, game_code), season, game_code)))
    if "pbp" in parts:
        work.append(
            (PbpEvent, pbp_rows(api.play_by_play(season, game_code), season, game_code))
        )
    counts = {}
    for model, rows in work:
        session.execute(
            delete(model).where(
                model.season_code == season, model.game_code == game_code
            )
        )
        session.add_all(rows)
        counts[model.__tablename__] = len(rows)
    return counts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--season", required=True, help="e.g. E2025")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument(
        "--force", action="store_true", help="re-fetch games already ingested"
    )
    parser.add_argument(
        "--parts",
        default="box,shots,pbp",
        help="comma list of feeds to ingest: box,shots,pbp",
    )
    args = parser.parse_args(argv)
    parts = {p.strip() for p in args.parts.split(",")} & {"box", "shots", "pbp"}
    if not parts:
        parser.error("--parts must include at least one of box, shots, pbp")

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)

    api = EuroleagueLiveApi()
    with Session(engine) as session:
        game_codes = session.execute(
            select(Game.game_code)
            .where(Game.season_code == args.season, Game.played)
            .order_by(Game.game_code)
        ).scalars().all()
        done = set(
            session.execute(
                select(PlayerGameStat.game_code)
                .where(PlayerGameStat.season_code == args.season)
                .distinct()
            ).scalars()
        )
        todo = [g for g in game_codes if args.force or g not in done]
        log.info("%d played games, %d to ingest", len(game_codes), len(todo))

        for i, game_code in enumerate(todo, 1):
            try:
                counts = ingest_game(api, session, args.season, game_code, parts)
            except Exception as exc:  # keep going; rerun picks up the gaps
                session.rollback()
                log.warning("game %s failed: %s", game_code, exc)
                continue
            session.commit()
            if i % 25 == 0 or i == len(todo):
                log.info("[%d/%d] game %s: %s", i, len(todo), game_code, counts)
    log.info("done -> %s", args.db)
    return 0


if __name__ == "__main__":
    sys.exit(main())
