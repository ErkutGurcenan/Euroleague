"""Live scores on game nights, and results straight after the final buzzer.

Usage:
    python -m euroleague_pipeline.live

Run every minute by cron. Most runs find no game on and exit at once. While a
game is on (from 10 minutes before tip-off until it is over), the run reads
each game's header from the official live feed twice, 30 seconds apart, and
saves score, quarter, clock and the score after each period in live_games.
The site reads that table, never the feed, so visitors add no load on it.

When the feed shows a game over but our database doesn't have it as played,
the run starts the importer (ingest + ingest_details for the season) under
the nightly update's lock, at most every 5 minutes for up to 3 hours, then
settles that game's paper trades. Results, standings and prediction grading
so update within minutes instead of overnight; the heavier rebuilds (stints,
impact, ratings, predictions) stay in the nightly update.
"""
from __future__ import annotations

import argparse
import fcntl
import json
import logging
import subprocess
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

import requests
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .models import Base, Game, LiveGame

log = logging.getLogger("live")

HEADER = "https://live.euroleague.net/api/Header"
POLL_EVERY = 30  # seconds between the two reads of a run
BEFORE = timedelta(minutes=10)  # start reading this long before tip-off
AFTER = timedelta(hours=4)  # stop reading this long after tip-off
IMPORT_EVERY = timedelta(minutes=5)
IMPORT_FOR = timedelta(hours=3)
LOCK = Path("/tmp/euroleague-refresh.lock")  # the nightly update's lock (refresh.sh)
PIPELINE = Path(__file__).resolve().parents[1]


def num(x) -> int | None:
    try:
        return None if x in (None, "") else int(float(x))
    except (TypeError, ValueError):
        return None


def minutes(clock: str | None) -> float:
    """'27:48' -> 27.8"""
    try:
        m, s = (clock or "").strip().split(":")
        return int(m) + int(s) / 60
    except ValueError:
        return 0.0


def parse(d: dict, g: Game, now: datetime) -> dict:
    """The feed's header as a live_games row, home team first. TeamA is the
    home team unless the club codes say otherwise."""
    a_home = (d.get("CodeTeamA") or "").strip() in ("", g.local_club_code)
    a = [num(d.get(f"ScoreQuarter{i}A")) for i in range(1, 5)] + [num(d.get("ScoreExtraTimeA"))]
    b = [num(d.get(f"ScoreQuarter{i}B")) for i in range(1, 5)] + [num(d.get("ScoreExtraTimeB"))]
    sa, sb = num(d.get("ScoreA")), num(d.get("ScoreB"))
    home, away = (sa, sb) if a_home else (sb, sa)
    played = minutes(d.get("GameTime"))
    started = (sa or 0) + (sb or 0) > 0
    if d.get("Live"):
        status = "live"
    elif started and ((played >= 40 and home != away) or now > g.utc_date + timedelta(hours=3, minutes=30)):
        status = "final"  # a game can't end level: a tie at 40:00 means overtime is coming
    elif started:
        status = "live"  # a break between periods
    else:
        status = "scheduled"
    return {
        "status": status, "home_score": home, "away_score": away,
        "quarter": str(d.get("Quarter") or "").strip() or None,
        "clock": (d.get("RemainingPartialTime") or "").strip() or None,
        "game_time": (d.get("GameTime") or "").strip() or None,
        "quarters": json.dumps({"home": a if a_home else b, "away": b if a_home else a}),
    }


def due(session: Session, season: str, now: datetime) -> list[Game]:
    """Games on now: tip-off between 4 hours ago and 10 minutes from now,
    not yet in our database as played."""
    return session.execute(
        select(Game).where(Game.season_code == season, Game.played.is_(False),
                           Game.utc_date >= now - AFTER, Game.utc_date <= now + BEFORE)
        .order_by(Game.utc_date)
    ).scalars().all()


def poll(session: Session, season: str, games: list[Game]) -> list[LiveGame]:
    now = datetime.utcnow()
    rows = []
    for g in games:
        try:
            r = requests.get(HEADER, params={"gamecode": g.game_code, "seasoncode": season}, timeout=15)
            r.raise_for_status()
            state = parse(r.json(), g, now)
        except (requests.RequestException, ValueError) as exc:
            log.warning("game %s: live feed unavailable: %s", g.game_code, exc)
            continue
        row = session.execute(
            select(LiveGame).where(LiveGame.season_code == season, LiveGame.game_code == g.game_code)
        ).scalar()
        if row is None:
            row = LiveGame(season_code=season, game_code=g.game_code)
            session.add(row)
        if state["status"] != row.status:
            log.info("game %s %s v %s: %s -> %s (%s-%s)", g.game_code, g.local_club_code, g.road_club_code,
                     row.status, state["status"], state["home_score"], state["away_score"])
        for k, v in state.items():
            setattr(row, k, v)
        row.updated_at = now
        if row.status == "final" and row.final_at is None:
            row.final_at = now
        rows.append(row)
    session.commit()
    return rows


def run_importer(season: str, db: Path) -> bool:
    """ingest + ingest_details for the season, unless the nightly update holds the lock."""
    with open(LOCK, "w") as fh:
        try:
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log.info("nightly update running; it will import the game itself")
            return False
        for step in ("ingest", "ingest_details"):
            done = subprocess.run([sys.executable, "-m", f"euroleague_pipeline.{step}", "--season", season, "--db", str(db)],
                                  cwd=PIPELINE, capture_output=True, text=True, timeout=1200)
            last = (done.stdout + done.stderr).strip().splitlines()[-1:] or [""]
            log.info("%s exited %s: %s", step, done.returncode, last[0][:200])
            if done.returncode != 0:
                return False
    return True


def import_finished(session: Session, season: str, now: datetime, db: Path) -> None:
    """Import games the feed shows over but our database doesn't have yet."""
    waiting = session.execute(
        select(LiveGame).join(Game, (Game.season_code == LiveGame.season_code) & (Game.game_code == LiveGame.game_code))
        .where(LiveGame.season_code == season, LiveGame.status == "final", Game.played.is_(False),
               LiveGame.final_at >= now - IMPORT_FOR)
    ).scalars().all()
    ready = [r for r in waiting if r.import_tried_at is None or now - r.import_tried_at >= IMPORT_EVERY]
    if not ready:
        return
    for r in ready:
        r.import_tried_at = now
    session.commit()
    log.info("importing finished games %s", [r.game_code for r in ready])
    if run_importer(season, db):
        session.expire_all()
        imported = session.execute(
            select(Game.game_code).where(Game.season_code == season, Game.played.is_(True),
                                         Game.game_code.in_([r.game_code for r in ready]))
        ).scalars().all()
        log.info("in the database now: %s (others are retried in 5 minutes)", list(imported) or "none yet")
        if imported:
            from .market import settle
            log.info("settled %d paper trades", settle(session, season, datetime.utcnow()))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s", datefmt="%H:%M:%S")
    engine = create_engine(f"sqlite:///{args.db}", connect_args={"timeout": 30})
    now = datetime.utcnow()
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        season = session.execute(select(func.max(Game.season_code))).scalar()
        games = due(session, season, now)
        finals_waiting = session.execute(
            select(func.count()).select_from(LiveGame)
            .join(Game, (Game.season_code == LiveGame.season_code) & (Game.game_code == LiveGame.game_code))
            .where(LiveGame.season_code == season, LiveGame.status == "final", Game.played.is_(False),
                   LiveGame.final_at >= now - IMPORT_FOR)
        ).scalar()
        if not games and not finals_waiting:
            return 0  # no game on: the usual case, stay quiet
        if games:
            rows = poll(session, season, games)
            if any(r.status == "live" for r in rows):
                time.sleep(POLL_EVERY)
                rows = poll(session, season, games)
            log.info("  ".join(f"{r.game_code}:{r.status} {r.home_score}-{r.away_score} Q{r.quarter or '-'} {r.clock or ''}"
                               for r in rows) or "no live data")
        import_finished(session, season, datetime.utcnow(), args.db)
    return 0


if __name__ == "__main__":
    sys.exit(main())
