"""Injury list: read BasketballSphere's EuroLeague injury page, keep every
read, and install it as the live report the site shows.

Usage:
    python -m euroleague_pipeline.injury_feed [--dry-run]

Run by cron at 10:00, 14:00 and 17:00 UK time. Each run:

1. Reads https://basketballsphere.com/en/injuries/euroleague/ (one page; the
   site allows automatic reading, and is credited wherever the list is shown).
2. Saves the list in the injury_snapshots table, on every read, so real
   injury reports can be tested against results later.
3. If the list changed, checks it (injuries_check.validate) and installs it
   as db/injuries.json, then asks Jev again about upcoming games so its calls
   include the new list.

Our own model does not use injuries: on 2,600 past games, lowering a team's
strength for its missing players made the predictions slightly worse.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path

import requests
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .injuries_check import LIVE, validate
from .models import Base, Club, Game, InjurySnapshot

log = logging.getLogger("injury_feed")

URL = "https://basketballsphere.com/en/injuries/euroleague/"
SOURCE = "BasketballSphere"
HEADERS = {"User-Agent": "Eurostepper injury reader (EuroLeague stats site; three reads a day)"}

STATUS = {"out": "Out", "doubtful": "Doubtful", "day to day": "Game-time", "cleared": "Ready"}


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(s.lower().replace(".", " ").replace("-", " ").split())


# BasketballSphere's club headings -> our club codes; others fall back to a
# match against our club names (see club_code)
CLUBS = {norm(k): v for k, v in {
    "Anadolu Efes": "IST", "Asvel": "ASV", "Barcelona": "BAR", "Baskonia": "BAS", "Bayern": "MUN",
    "Besiktas": "BES", "Crvena Zvezda": "RED", "Dubai": "DUB", "Fenerbahce": "ULK",
    "Hapoel Tel Aviv": "HTA", "Maccabi Tel Aviv": "TEL", "Milano": "MIL", "Olympiacos": "OLY",
    "Panathinaikos": "PAN", "Paris": "PRS", "Partizan": "PAR", "Real Madrid": "MAD",
    "Valencia": "PAM", "Virtus": "VIR", "Zalgiris": "ZAL", "Monaco": "MCO",
}.items()}


def club_code(heading: str, clubs: dict[str, str]) -> str | None:
    n = norm(heading)
    if n in CLUBS:
        return CLUBS[n]
    hits = [code for code, name in clubs.items() if n and n in norm(name)]
    return hits[0] if len(hits) == 1 else None


class Tables(HTMLParser):
    """Every <table> on the page with the h2/h3 heading above it."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tables: list[tuple[str | None, list[list[str]]]] = []
        self.heading: str | None = None
        self._head: list[str] | None = None
        self._table: list[list[str]] | None = None
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        if tag in ("h2", "h3"):
            self._head = []
        elif tag == "table":
            self._table = []
        elif tag == "tr" and self._table is not None:
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []

    def handle_endtag(self, tag):
        if tag in ("h2", "h3") and self._head is not None:
            self.heading, self._head = " ".join("".join(self._head).split()), None
        elif tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None and self._table is not None:
            self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            self.tables.append((self.heading, self._table))
            self._table = None

    def handle_data(self, data):
        if self._head is not None:
            self._head.append(data)
        if self._cell is not None:
            self._cell.append(data)


def fetch() -> str:
    for attempt in range(3):
        try:
            r = requests.get(URL, headers=HEADERS, timeout=30)
            r.raise_for_status()
            return r.text
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(5)
    raise RuntimeError("unreachable")


def page_updated(html: str) -> datetime | None:
    """The page's own 'dateModified' (UTC), as naive UTC."""
    m = re.search(r'"dateModified"\s*:\s*"([^"]+)"', html)
    if not m:
        return None
    try:
        dt = datetime.fromisoformat(m.group(1).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt


def reason_of(injury: str) -> str:
    t = injury.lower()
    has = lambda *words: any(re.search(rf"\b{w}", t) for w in words)
    if has("coach"):
        return "coach"
    if has("ill", "sick", "virus", "flu", "fever"):
        return "illness"
    if has("rest", "load management"):
        return "rest"
    if has("roster", "registration", "registered"):
        return "roster"
    if has("personal", "family", "suspen", "not injury", "contract", "loan"):
        return "other"
    return "injury"


MONTHS = {m: i for i, m in enumerate(
    ("january", "february", "march", "april", "may", "june", "july", "august", "september",
     "october", "november", "december"), start=1)}


def return_date(text: str, now: datetime) -> datetime | None:
    """When an expected-return text says the player is back: 'Around 3 weeks'
    or '2-3 weeks' (the later end), '7-9 months', 'End of November',
    'Mid-December'; None when it gives no time."""
    t = text.lower()
    m = re.search(r"(\d+)(?:\s*[-–]\s*(\d+))?\s*(day|week|month)", t)
    if m:
        n = float(m.group(2) or m.group(1))
        return now + timedelta(days=n * {"day": 1, "week": 7, "month": 30}[m.group(3)])
    for name, month in MONTHS.items():
        if name in t:
            year = now.year if month >= now.month else now.year + 1
            day = 28 if re.search(r"\b(end|late)", t) else 5 if re.search(r"\b(early|start|beginning)", t) else 15
            return datetime(year, month, day)
    return None


def rounds_of(status: str, back: str, club: str, schedule: dict[str, list[tuple[int, datetime]]],
              next_round: int | None, now: datetime) -> str:
    """The report's 'rounds' field: the round(s) an absence covers, worked out
    from the club's real schedule and the expected return."""
    if "season" in back.lower():
        return "Season"
    until = return_date(back, now)
    upcoming = schedule.get(club, [])
    first = upcoming[0][0] if upcoming else next_round
    if status == "Out" and until is None:
        return "Indefinitely"
    if until is None or first is None:
        return str(first) if first else "Indefinitely"
    if until - now >= timedelta(days=90):
        return "Long-term" if upcoming and upcoming[-1][1] > until else "Season"
    missed = [r for r, when in upcoming if when < until]
    if not missed:
        return str(first)
    return str(missed[0]) if missed[-1] == missed[0] else f"{missed[0]}-{missed[-1]}"


def build_report(html: str, session: Session, season: str, now: datetime) -> tuple[dict, list[list[str]]]:
    """The report in db/injuries.json's format, plus the page's rows as read
    (club code, player, status, injury, expected return) for the archive.
    sourceUpdated is when we read it: the page's own update stamp is not
    always changed when the list is (kept as pageUpdated)."""
    clubs = {c.code: c.name for c in session.execute(select(Club)).scalars()}
    stamp = page_updated(html)
    schedule: dict[str, list[tuple[int, datetime]]] = {}
    for g in session.execute(
        select(Game).where(Game.season_code == season, Game.played.is_(False), Game.utc_date > now,
                           Game.round.is_not(None)).order_by(Game.utc_date)
    ).scalars():
        for club in (g.local_club_code, g.road_club_code):
            schedule.setdefault(club, []).append((g.round, g.utc_date))
    next_round = min((r for games in schedule.values() for r, _ in games[:1]), default=None)

    parser = Tables()
    parser.feed(html)
    entries, raw, seen = [], [], set()
    for heading, rows in parser.tables:
        if not rows or [c.lower() for c in rows[0][:2]] != ["player", "status"] or not heading:
            continue  # only the per-club tables: Player | Status | Injury | Expected return
        code = club_code(heading, clubs)
        if code is None:
            log.warning("unknown club heading %r; skipped", heading)
            continue
        for row in rows[1:]:
            if len(row) < 3 or not row[0] or (code, row[0]) in seen:
                continue
            player, status_text, injury = row[0], row[1], row[2]
            back = row[3] if len(row) > 3 else ""
            status = STATUS.get(status_text.lower(), "Uncertain")
            raw.append([code, player, status_text, injury, back])
            note = injury or status_text
            if back and return_date(back, now) is not None:
                when = back[0].lower() + back[1:]
                prefix = "in" if re.match(r"(around|about|\d)", when) else "by"
                note = f"{note}; expected back {prefix} {when}"
            if len(note) > 120:
                note = note[:119].rstrip() + "…"
            entries.append({
                "club": code, "player": player, "pos": "", "status": status,
                "reason": reason_of(injury), "rounds": rounds_of(status, back, code, schedule, next_round, now),
                "note": note,
            })
            seen.add((code, player))
    report = {"season": season, "source": SOURCE, "sourceUrl": URL,
              "sourceUpdated": now.strftime("%Y-%m-%dT%H:%M"),
              "pageUpdated": stamp.strftime("%Y-%m-%dT%H:%M") if stamp else None, "entries": entries}
    return report, raw


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--live", type=Path, default=LIVE, help="the report file the site serves")
    parser.add_argument("--dry-run", action="store_true", help="read and print; save and install nothing")
    parser.add_argument("--no-jev", action="store_true", help="don't re-ask Jev after a change")
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    if not args.dry_run:
        Base.metadata.create_all(engine)
    now = datetime.utcnow()
    with Session(engine) as session:
        season = session.execute(select(func.max(Game.season_code))).scalar()
        try:
            report, raw = build_report(fetch(), session, season, now)
        except (requests.RequestException, ValueError) as exc:
            log.warning("could not read the injury page: %s", exc)
            return 1
        entries = report["entries"]
        if args.dry_run:
            print(json.dumps(report, ensure_ascii=False, indent=1))
            log.info("dry run: %d entries, page stamp %s", len(entries), report["pageUpdated"])
            return 0

        last = session.execute(
            select(InjurySnapshot).where(InjurySnapshot.season_code == season)
            .order_by(InjurySnapshot.fetched_at.desc()).limit(1)
        ).scalar()
        changed = last is None or json.loads(last.entries) != raw
        session.add(InjurySnapshot(
            season_code=season, fetched_at=now, source=SOURCE,
            source_updated=datetime.strptime(report["pageUpdated"], "%Y-%m-%dT%H:%M") if report["pageUpdated"] else None,
            entries=json.dumps(raw, ensure_ascii=False), changed=changed,
        ))
        session.commit()

        current = json.loads(args.live.read_text()) if args.live.exists() else None
        if current and current.get("source") == SOURCE and current.get("entries") == entries:
            log.info("no change: %d entries", len(entries))
            return 0
        errors = validate(report, db=args.db)
        if errors:
            log.warning("new list rejected, keeping the old one: %s", "; ".join(errors[:5]))
            return 1
        tmp = args.live.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        os.replace(tmp, args.live)
        log.info("installed %d entries -> %s", len(entries), args.live)

        if not args.no_jev:
            from .ai_challenger import load_key, run
            key = load_key()
            if key:
                n, cost = run(session, key, 8, injuries_path=args.live)
                log.info("re-asked Jev about %d games with the new list, cost $%.6f", n, cost)
    return 0


if __name__ == "__main__":
    sys.exit(main())
