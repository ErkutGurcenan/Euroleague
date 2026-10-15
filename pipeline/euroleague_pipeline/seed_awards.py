"""Season award winners: keep the editorial awards table in sync with the
repo file pipeline/data/awards.json (the API has no awards endpoint).

Usage:
    python -m euroleague_pipeline.seed_awards            # file -> database
    python -m euroleague_pipeline.seed_awards --export   # database -> file

Loading is idempotent: rows are upserted by (season, award). Run it after
rebuilding the database, once the seasons' clubs have been ingested.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
from pathlib import Path

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB, upsert
from .models import Award, Base, PersonStint

log = logging.getLogger("seed_awards")

AWARDS_FILE = Path(__file__).resolve().parents[1] / "data" / "awards.json"


def export(session: Session, path: Path) -> int:
    names = dict(
        session.execute(
            select(PersonStint.person_code, func.max(PersonStint.name))
            .group_by(PersonStint.person_code)
        ).all()
    )
    awards = session.execute(
        select(Award).order_by(Award.season_code.desc(), Award.display_order)
    ).scalars().all()
    rows = [
        {
            "season": a.season_code,
            "award": a.award,
            "playerCode": a.player_code,
            "playerName": names.get(a.player_code),
            "club": a.club_code,
            "order": a.display_order,
        }
        for a in awards
    ]
    lines = ",\n".join("  " + json.dumps(r, ensure_ascii=False) for r in rows)
    path.write_text(f"[\n{lines}\n]\n")
    return len(rows)


def load(session: Session, path: Path) -> int:
    rows = json.loads(path.read_text())
    for r in rows:
        upsert(
            session,
            Award,
            {"season_code": r["season"], "award": r["award"]},
            {
                "player_code": r["playerCode"],
                "club_code": r.get("club"),
                "display_order": r.get("order", 0),
            },
        )
    return len(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--file", type=Path, default=AWARDS_FILE)
    parser.add_argument(
        "--export", action="store_true", help="write the database's awards to the file"
    )
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        if args.export:
            log.info("exported %d awards -> %s", export(session, args.file), args.file)
        else:
            log.info("loaded %d awards <- %s", load(session, args.file), args.file)
            session.commit()
    return 0


if __name__ == "__main__":
    sys.exit(main())
