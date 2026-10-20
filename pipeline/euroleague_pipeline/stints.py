"""Rebuild lineup stints (who was on court) from the play-by-play.

Usage:
    python -m euroleague_pipeline.stints --season E2025 [--force]
    python -m euroleague_pipeline.stints --all [--force]

For each played game: start from each team's five starters (box score),
apply substitutions, and cut a stint whenever the players on court change.
Events are ordered by the game clock, keeping play order within the same
second: the feed sometimes files late-entered events out of order, and a
free throw shot after a substitution counts for the new lineup.

Every game gets a stint_checks row comparing the rebuilt +/- and minutes
with the official box score. The official +/- is computed in entry order,
so a handful of late-entered events per season make exact agreement
impossible. A stint is valid when both teams have five on court (a missing
substitution in the feed briefly breaks this); a game is usable when the
score matches and at least 95% of its time is valid. Lineup statistics
should use valid stints from usable games only.
Idempotent: games already rebuilt are skipped unless --force.
"""
from __future__ import annotations

import argparse
import logging
import sys
from collections import defaultdict
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .models import Base, Game, LineupStint, PbpEvent, PlayerGameStat, StintCheck

log = logging.getLogger("stints")

POINTS = {"2FGM": 2, "3FGM": 3, "FTM": 1}
FGA = {"2FGM", "2FGA", "3FGM", "3FGA"}
FTA = {"FTM", "FTA"}
SUBS = {"IN", "OUT"}
COUNTS = ("pts", "fga", "fta", "oreb", "tov")


def clock_seconds(quarter: int, minute: Optional[int], marker: Optional[str]) -> Optional[int]:
    """Seconds since tip-off. Quarters are 10 minutes; overtimes (all filed as
    quarter 5) are 5 minutes each and told apart by the game-minute field."""
    if not marker or ":" not in marker:
        return None
    try:
        m, s = marker.split(":", 1)
        left = int(m) * 60 + int(s)
    except ValueError:
        return None
    if quarter <= 4:
        return (quarter - 1) * 600 + 600 - left
    ot = max(0, (minute - 41) // 5) if minute else 0
    return 2400 + ot * 300 + 300 - left


def period_of(sec: int) -> int:
    return sec // 600 + 1 if sec < 2400 else 5 + (sec - 2400) // 300


def lineup_key(players: set[str]) -> str:
    return "|".join(sorted(players))


def rebuild(events: list[tuple], home: str, away: str, starters: dict[str, set[str]]):
    """events: (quarter, play_number, play_type, club, player, minute, marker)
    in play order. Returns (stints as dicts, list of issue strings)."""
    timed, last = [], {}
    for e in events:
        t = clock_seconds(e[0], e[5], e[6])
        if t is None:
            t = last.get(e[0], (e[0] - 1) * 600 if e[0] <= 4 else 2400)
        last[e[0]] = t
        timed.append((t, e))
    timed.sort(key=lambda x: (x[1][0], x[0]))  # stable: same second keeps play order

    max_q = max(e[0] for e in events)
    if max_q <= 4:
        game_end = 2400
    else:
        # Period markers (end of period, end of game) carry the next period's
        # minute, so count overtimes from events with a real clock time only.
        ots = [(e[5] - 41) // 5 for e in events if e[0] == 5 and e[5] and e[6]]
        game_end = 2400 + 300 * (max(ots, default=0) + 1)

    on = {home: set(starters[home]), away: set(starters[away])}
    stints: list[dict] = []
    issues: list[str] = []
    counts = defaultdict(int)
    start = 0
    sub_time = 0
    in_subs = False

    def close(end: int) -> None:
        end = max(end, start)
        if end == start and not any(counts.values()):
            return
        stint = {
            "start_sec": start, "end_sec": end, "period": period_of(start),
            "home_lineup": lineup_key(on[home]), "away_lineup": lineup_key(on[away]),
            "valid": len(on[home]) == 5 and len(on[away]) == 5,
        }
        for side in ("home", "away"):
            for k in COUNTS:
                stint[f"{side}_{k}"] = counts[f"{side}_{k}"]
        stints.append(stint)

    for t, (q, num, ptype, club, player, minute, marker) in timed:
        if ptype in SUBS:
            if club not in on or not player:
                issues.append(f"sub without team/player at play {num}")
                continue
            if not in_subs:
                close(t)
                in_subs = True
                sub_time = max(t, start)
            if ptype == "IN":
                if player in on[club]:
                    issues.append(f"IN for player already on court at play {num}")
                on[club].add(player)
            else:
                if player not in on[club]:
                    issues.append(f"OUT for player not on court at play {num}")
                on[club].discard(player)
            continue
        if in_subs:
            in_subs = False
            start = sub_time
            counts = defaultdict(int)
        side = "home" if club == home else "away" if club == away else None
        if side is None:
            continue
        if ptype in POINTS:
            counts[f"{side}_pts"] += POINTS[ptype]
        if ptype in FGA:
            counts[f"{side}_fga"] += 1
        if ptype in FTA:
            counts[f"{side}_fta"] += 1
        if ptype == "O" and player:  # team rebounds (mostly after missed FTs) don't extend possessions
            counts[f"{side}_oreb"] += 1
        elif ptype == "TO":
            counts[f"{side}_tov"] += 1
    if not in_subs:
        close(game_end)
    elif game_end > sub_time:
        start = sub_time
        counts = defaultdict(int)
        close(game_end)
    return stints, issues


def check_game(stints: list[dict], box: dict[str, tuple], final: tuple[int, int], issues: list[str]) -> dict:
    """box: player -> (club, official +/-, official seconds)."""
    pm, secs = defaultdict(int), defaultdict(int)
    home_pts = away_pts = 0
    bad_sizes = invalid_sec = 0
    for s in stints:
        d = s["home_pts"] - s["away_pts"]
        dur = s["end_sec"] - s["start_sec"]
        home_pts += s["home_pts"]
        away_pts += s["away_pts"]
        if not s["valid"]:
            bad_sizes += 1
            invalid_sec += dur
        for p in s["home_lineup"].split("|"):
            pm[p] += d
            secs[p] += dur
        for p in s["away_lineup"].split("|"):
            pm[p] -= d
            secs[p] += dur
    score_ok = (home_pts, away_pts) == final
    lineups_ok = bad_sizes == 0
    players = exact = within3 = within30 = 0
    for p, (club, off_pm, off_secs) in box.items():
        if off_pm is None:
            continue
        players += 1
        exact += pm.get(p, 0) == off_pm
        within3 += abs(pm.get(p, 0) - off_pm) <= 3
        within30 += abs(secs.get(p, 0) - (off_secs or 0)) <= 30
    notes = list(dict.fromkeys(issues))
    if not score_ok:
        notes.insert(0, f"score {home_pts}-{away_pts} vs official {final[0]}-{final[1]}")
    if bad_sizes:
        notes.insert(0, f"{bad_sizes} stints ({invalid_sec}s) without 5 v 5")
    game_sec = stints[-1]["end_sec"] if stints else 0
    return {
        "usable": score_ok and invalid_sec <= 0.05 * game_sec,
        "score_ok": score_ok, "lineups_ok": lineups_ok, "invalid_sec": invalid_sec,
        "players": players, "pm_exact": exact, "pm_within3": within3,
        "minutes_within30": within30, "issues": "; ".join(notes)[:300] or None,
    }


def process_game(session: Session, season: str, game: Game) -> Optional[dict]:
    box_rows = session.execute(
        select(PlayerGameStat.player_code, PlayerGameStat.club_code, PlayerGameStat.plus_minus,
               PlayerGameStat.seconds_played, PlayerGameStat.is_starter)
        .where(PlayerGameStat.season_code == season, PlayerGameStat.game_code == game.game_code)
    ).all()
    events = session.execute(
        select(PbpEvent.quarter, PbpEvent.play_number, PbpEvent.play_type, PbpEvent.club_code,
               PbpEvent.player_code, PbpEvent.minute, PbpEvent.marker_time)
        .where(PbpEvent.season_code == season, PbpEvent.game_code == game.game_code)
        .order_by(PbpEvent.quarter, PbpEvent.play_number)
    ).all()
    if not box_rows or not events:
        return None
    home, away = game.local_club_code, game.road_club_code
    starters = {home: set(), away: set()}
    box = {}
    for pc, club, pm, secs, starter in box_rows:
        box[pc] = (club, pm, secs)
        if starter and club in starters:
            starters[club].add(pc)

    session.execute(delete(LineupStint).where(
        LineupStint.season_code == season, LineupStint.game_code == game.game_code))
    session.execute(delete(StintCheck).where(
        StintCheck.season_code == season, StintCheck.game_code == game.game_code))

    if len(starters[home]) != 5 or len(starters[away]) != 5:
        result = {"usable": False, "score_ok": False, "lineups_ok": False, "invalid_sec": 0, "players": len(box),
                  "pm_exact": 0, "pm_within3": 0, "minutes_within30": 0,
                  "issues": f"starters {len(starters[home])}/{len(starters[away])}, expected 5/5"}
        session.add(StintCheck(season_code=season, game_code=game.game_code, **result))
        return result

    stints, issues = rebuild([tuple(e) for e in events], home, away, starters)
    result = check_game(stints, box, (game.local_score, game.road_score), issues)
    for i, s in enumerate(stints, 1):
        session.add(LineupStint(season_code=season, game_code=game.game_code, stint_no=i,
                                home_club=home, away_club=away, **s))
    session.add(StintCheck(season_code=season, game_code=game.game_code, **result))
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    target = parser.add_mutually_exclusive_group(required=True)
    target.add_argument("--season", help="e.g. E2025")
    target.add_argument("--all", action="store_true", help="every season in the database")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--force", action="store_true", help="rebuild games already done")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        seasons = (
            session.execute(select(Game.season_code).distinct().order_by(Game.season_code)).scalars().all()
            if args.all else [args.season]
        )
        for season in seasons:
            done = set(session.execute(
                select(StintCheck.game_code).where(StintCheck.season_code == season)).scalars())
            games = session.execute(
                select(Game).where(Game.season_code == season, Game.played).order_by(Game.game_code)
            ).scalars().all()
            todo = [g for g in games if args.force or g.game_code not in done]
            totals = defaultdict(int)
            unusable = []
            for i, game in enumerate(todo, 1):
                result = process_game(session, season, game)
                if result is None:
                    continue
                totals["games"] += 1
                totals["usable"] += result["usable"]
                for k in ("players", "pm_exact", "pm_within3", "minutes_within30"):
                    totals[k] += result[k]
                if not result["usable"]:
                    unusable.append(f"{game.game_code} ({result['issues']})")
                if i % 50 == 0:
                    session.commit()
            session.commit()
            if not totals["games"]:
                log.info("%s: nothing to rebuild", season)
                continue
            n = totals["players"] or 1
            log.info(
                "%s: %d games, %d usable | +/- exact %.1f%%, within 3 %.1f%% | minutes within 30s %.1f%%",
                season, totals["games"], totals["usable"], 100 * totals["pm_exact"] / n,
                100 * totals["pm_within3"] / n, 100 * totals["minutes_within30"] / n,
            )
            for u in unusable:
                log.warning("%s unusable: %s", season, u)
    return 0


if __name__ == "__main__":
    sys.exit(main())
