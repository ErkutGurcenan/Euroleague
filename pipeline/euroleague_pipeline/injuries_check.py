"""Validate an injury report file and optionally install it as the live one.

Usage:
    python -m euroleague_pipeline.injuries_check FILE            # validate only
    python -m euroleague_pipeline.injuries_check FILE --install  # validate, then
                                                                  # copy to db/injuries.json

The live report (db/injuries.json, git-ignored) is what the API serves; the
repo copy pipeline/data/injuries.json is only a fallback snapshot. Install is
atomic, and nothing is written if validation fails.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIVE = ROOT / "db" / "injuries.json"
DB = ROOT / "db" / "euroleague.db"

STATUSES = {"Ready", "Expected", "Questionable", "Game-time", "Doubtful", "Out", "Uncertain"}
REASONS = {"injury", "illness", "coach", "roster", "rest", "other"}
ROUNDS = re.compile(r"^(\d+|\d+-\d+|Season|Indefinitely|Long-term)$")
FIELDS = {"club", "player", "pos", "status", "reason", "rounds", "note"}


def validate(report: dict, db: Path = DB) -> list[str]:
    errors = []
    for key in ("season", "source", "sourceUrl", "sourceUpdated", "entries"):
        if key not in report:
            errors.append(f"missing top-level key: {key}")
    if errors:
        return errors
    try:
        datetime.strptime(report["sourceUpdated"], "%Y-%m-%dT%H:%M")
    except ValueError:
        errors.append(f"sourceUpdated must look like 2026-10-15T14:00: {report['sourceUpdated']!r}")
    with sqlite3.connect(db) as conn:
        clubs = {
            r[0]
            for r in conn.execute(
                "SELECT local_club_code FROM games WHERE season_code = ?", (report["season"],)
            )
        }
    if not clubs:
        errors.append(f"no games in the database for season {report['season']}")
    entries = report["entries"]
    if len(entries) < 20:
        errors.append(f"only {len(entries)} entries; the full report covers all teams")
    seen = set()
    for i, e in enumerate(entries):
        where = f"entry {i} ({e.get('player', '?')})"
        missing = FIELDS - e.keys()
        if missing:
            errors.append(f"{where}: missing {sorted(missing)}")
            continue
        if clubs and e["club"] not in clubs:
            errors.append(f"{where}: unknown club code {e['club']!r}")
        if e["status"] not in STATUSES:
            errors.append(f"{where}: status {e['status']!r} not in {sorted(STATUSES)}")
        if e["reason"] not in REASONS:
            errors.append(f"{where}: reason {e['reason']!r} not in {sorted(REASONS)}")
        if not ROUNDS.match(e["rounds"]):
            errors.append(f"{where}: rounds {e['rounds']!r} must be N, N-M, Season, Indefinitely or Long-term")
        if not e["note"].strip() or len(e["note"]) > 120:
            errors.append(f"{where}: note must be a short summary (1-120 chars)")
        key = (e["club"], e["player"])
        if key in seen:
            errors.append(f"{where}: duplicate player")
        seen.add(key)
    return errors


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--install", action="store_true", help=f"copy to {LIVE} if valid")
    args = parser.parse_args(argv)

    try:
        report = json.loads(args.file.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        print(f"INVALID: cannot read JSON: {exc}")
        return 1
    errors = validate(report)
    if errors:
        print("INVALID:")
        for err in errors:
            print(f"  - {err}")
        return 1
    entries = report["entries"]
    medical = sum(1 for e in entries if e["reason"] in ("injury", "illness") and e["status"] != "Ready")
    print(f"valid: {len(entries)} entries, {medical} injured/ill, source updated {report['sourceUpdated']}")
    if args.install:
        tmp = LIVE.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        os.replace(tmp, LIVE)
        print(f"installed -> {LIVE}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
