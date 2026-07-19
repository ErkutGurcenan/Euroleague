"""FastAPI backend serving the Euroleague database to the frontend.

Run from api/:  ../pipeline/.venv/bin/uvicorn main:app --reload
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, func, select

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "pipeline"))

from euroleague_pipeline.models import (  # noqa: E402
    Award,
    Club,
    Game,
    PbpEvent,
    PersonStint,
    PlayerGameStat,
    Shot,
    StandingRow,
)

DB_PATH = REPO_ROOT / "db" / "euroleague.db"
engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})

app = FastAPI(title="Euroleague Stats API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

DEFAULT_SEASON = "E2025"


def club_dict(c: Club) -> dict:
    return {
        "code": c.code,
        "name": c.name,
        "abbreviatedName": c.abbreviated_name,
        "country": c.country_name,
        "city": c.city,
        "crestUrl": c.crest_url,
        "website": c.website,
    }


def game_dict(g: Game, clubs: dict[str, Club]) -> dict:
    def side(code: Optional[str], score: Optional[int]) -> dict:
        club = clubs.get(code) if code else None
        return {
            "code": code,
            "name": club.name if club else code,
            "crestUrl": club.crest_url if club else None,
            "score": score,
        }

    return {
        "id": g.id,
        "gameCode": g.game_code,
        "round": g.round,
        "roundName": g.round_name,
        "phaseType": g.phase_type,
        "groupName": g.group_name,
        "played": g.played,
        "utcDate": g.utc_date.isoformat() + "Z" if g.utc_date else None,
        "home": side(g.local_club_code, g.local_score),
        "away": side(g.road_club_code, g.road_score),
    }


def load_clubs(session) -> dict[str, Club]:
    return {c.code: c for c in session.execute(select(Club)).scalars()}


from sqlalchemy.orm import Session  # noqa: E402


@app.get("/health")
def health() -> dict:
    return {"ok": True, "db": DB_PATH.exists()}


@app.get("/api/awards")
def awards(season: str = DEFAULT_SEASON) -> dict:
    with Session(engine) as session:
        clubs = load_clubs(session)
        rows = session.execute(
            select(Award)
            .where(Award.season_code == season)
            .order_by(Award.display_order)
        ).scalars().all()
        names = {
            code: name
            for code, name in session.execute(
                select(
                    PlayerGameStat.player_code, func.max(PlayerGameStat.player_name)
                )
                .where(
                    PlayerGameStat.season_code == season,
                    PlayerGameStat.player_code.in_([a.player_code for a in rows]),
                )
                .group_by(PlayerGameStat.player_code)
            )
        }
        return {
            "season": season,
            "awards": [
                {
                    "award": a.award,
                    "playerCode": a.player_code,
                    "name": names.get(a.player_code),
                    "clubCode": a.club_code,
                    "clubName": clubs[a.club_code].name
                    if a.club_code in clubs
                    else None,
                    "crestUrl": clubs[a.club_code].crest_url
                    if a.club_code in clubs
                    else None,
                }
                for a in rows
            ],
        }


@app.get("/api/search")
def search(q: str = Query(min_length=2), season: str = DEFAULT_SEASON) -> dict:
    like = f"%{q}%"
    with Session(engine) as session:
        clubs = session.execute(
            select(Club)
            .where(
                Club.country_code.is_not(None),  # skip virtual FF placeholders
                Club.name.ilike(like)
                | Club.abbreviated_name.ilike(like)
                | Club.code.ilike(like),
            )
            .order_by(Club.name)
            .limit(8)
        ).scalars().all()
        players = session.execute(
            select(
                PersonStint.person_code,
                func.max(PersonStint.name),
                func.max(PersonStint.club_code),
                func.max(PersonStint.image_url),
            )
            .where(
                PersonStint.season_code == season,
                PersonStint.type == "J",
                PersonStint.name.ilike(like),
            )
            .group_by(PersonStint.person_code)
            .limit(8)
        ).all()
        club_map = load_clubs(session)
        return {
            "clubs": [club_dict(c) for c in clubs],
            "players": [
                {
                    "playerCode": code,
                    "name": name,
                    "imageUrl": image_url,
                    "clubCode": club_code,
                    "clubName": club_map[club_code].name
                    if club_code in club_map
                    else None,
                }
                for code, name, club_code, image_url in players
            ],
        }


def club_splits(session, season: str, up_to_round: Optional[int] = None) -> dict[str, dict]:
    """Home/away records and last-5 form per club from RS game results,
    optionally only counting rounds up to `up_to_round` (time machine)."""
    q = (
        select(Game)
        .where(Game.season_code == season, Game.played, Game.phase_type == "RS")
        .order_by(Game.utc_date)
    )
    if up_to_round is not None:
        q = q.where(Game.round <= up_to_round)
    games = session.execute(q).scalars().all()
    splits: dict[str, dict] = {}
    for gm in games:
        if gm.local_score is None or gm.road_score is None:
            continue
        for code, own, opp, at_home in (
            (gm.local_club_code, gm.local_score, gm.road_score, True),
            (gm.road_club_code, gm.road_score, gm.local_score, False),
        ):
            if not code:
                continue
            s = splits.setdefault(
                code,
                {"homeW": 0, "homeL": 0, "awayW": 0, "awayL": 0, "form": []},
            )
            won = own > opp
            key = ("home" if at_home else "away") + ("W" if won else "L")
            s[key] += 1
            s["form"].append("W" if won else "L")
    for s in splits.values():
        s["form"] = s["form"][-5:]
    return splits


@app.get("/api/standings")
def standings(season: str = DEFAULT_SEASON, round: Optional[int] = Query(None)) -> dict:
    with Session(engine) as session:
        rnd = round
        if rnd is None:
            rnd = session.execute(
                select(func.max(StandingRow.round)).where(
                    StandingRow.season_code == season
                )
            ).scalar()
        if rnd is None:
            raise HTTPException(404, f"no standings for season {season}")
        clubs = load_clubs(session)
        splits = club_splits(session, season, up_to_round=rnd)
        rows = session.execute(
            select(StandingRow)
            .where(StandingRow.season_code == season, StandingRow.round == rnd)
            .order_by(StandingRow.position)
        ).scalars()
        return {
            "season": season,
            "round": rnd,
            "standings": [
                {
                    "position": r.position,
                    "club": club_dict(clubs[r.club_code]),
                    "gamesPlayed": r.games_played,
                    "gamesWon": r.games_won,
                    "gamesLost": r.games_lost,
                    "pointsFavour": r.points_favour,
                    "pointsAgainst": r.points_against,
                    "pointsDiff": (r.points_favour or 0) - (r.points_against or 0),
                    "qualified": r.qualified,
                    "home": f"{splits.get(r.club_code, {}).get('homeW', 0)}–{splits.get(r.club_code, {}).get('homeL', 0)}",
                    "away": f"{splits.get(r.club_code, {}).get('awayW', 0)}–{splits.get(r.club_code, {}).get('awayL', 0)}",
                    "form": splits.get(r.club_code, {}).get("form", []),
                }
                for r in rows
            ],
        }


@app.get("/api/standings/history")
def standings_history(season: str = DEFAULT_SEASON) -> dict:
    """Per-club position by round — for position-over-time charts."""
    with Session(engine) as session:
        clubs = load_clubs(session)
        rows = session.execute(
            select(StandingRow)
            .where(StandingRow.season_code == season)
            .order_by(StandingRow.round)
        ).scalars()
        history: dict[str, dict] = {}
        for r in rows:
            entry = history.setdefault(
                r.club_code,
                {"club": club_dict(clubs[r.club_code]), "rounds": []},
            )
            entry["rounds"].append({"round": r.round, "position": r.position})
        return {"season": season, "clubs": list(history.values())}


@app.get("/api/games")
def games(
    season: str = DEFAULT_SEASON,
    round: Optional[int] = Query(None),
    club: Optional[str] = Query(None),
    played: Optional[bool] = Query(None),
) -> dict:
    with Session(engine) as session:
        clubs = load_clubs(session)
        q = select(Game).where(Game.season_code == season).order_by(Game.utc_date)
        if round is not None:
            q = q.where(Game.round == round)
        if club is not None:
            q = q.where(
                (Game.local_club_code == club) | (Game.road_club_code == club)
            )
        if played is not None:
            q = q.where(Game.played == played)
        return {
            "season": season,
            "games": [game_dict(g, clubs) for g in session.execute(q).scalars()],
        }


_comeback_cache: dict[str, dict[int, int]] = {}


def winner_max_deficits(session, season: str) -> dict[int, int]:
    """Per game: the eventual winner's largest deficit, from the pbp
    running score. Computed once per season and cached in-process."""
    if season in _comeback_cache:
        return _comeback_cache[season]
    winners: dict[int, bool] = {}  # game_code -> home team won
    for gm in session.execute(
        select(Game).where(Game.season_code == season, Game.played)
    ).scalars():
        if gm.local_score is not None and gm.road_score is not None:
            winners[gm.game_code] = gm.local_score > gm.road_score
    deficits: dict[int, int] = {}
    rows = session.execute(
        select(
            PbpEvent.game_code, PbpEvent.points_a, PbpEvent.points_b
        )
        .where(PbpEvent.season_code == season, PbpEvent.points_a.is_not(None))
        .order_by(PbpEvent.game_code, PbpEvent.quarter, PbpEvent.play_number)
    )
    for game_code, pts_home, pts_road in rows:
        home_won = winners.get(game_code)
        if home_won is None or pts_home is None or pts_road is None:
            continue
        deficit = (pts_road - pts_home) if home_won else (pts_home - pts_road)
        if deficit > deficits.get(game_code, 0):
            deficits[game_code] = deficit
    _comeback_cache[season] = deficits
    return deficits


@app.get("/api/games/notable")
def notable_games(season: str = DEFAULT_SEASON, limit: int = 8) -> dict:
    with Session(engine) as session:
        clubs = load_clubs(session)
        games = [
            g
            for g in session.execute(
                select(Game).where(Game.season_code == season, Game.played)
            ).scalars()
            if g.local_score is not None and g.road_score is not None
        ]
        by_code = {g.game_code: g for g in games}

        def entry(g: Game, value: int, note: Optional[str] = None) -> dict:
            return {"game": game_dict(g, clubs), "value": value, "note": note}

        margin = lambda g: abs(g.local_score - g.road_score)  # noqa: E731
        total = lambda g: g.local_score + g.road_score  # noqa: E731

        def ot_points(g: Game) -> int:
            q = sum(
                x or 0
                for x in (g.local_q1, g.local_q2, g.local_q3, g.local_q4,
                          g.road_q1, g.road_q2, g.road_q3, g.road_q4)
            )
            return total(g) - q

        deficits = winner_max_deficits(session, season)
        comebacks = sorted(deficits.items(), key=lambda kv: -kv[1])[:limit]

        return {
            "season": season,
            "categories": [
                {
                    "key": "comebacks",
                    "label": "Biggest comebacks",
                    "entries": [
                        entry(
                            by_code[gc],
                            d,
                            f"won after trailing by {d}",
                        )
                        for gc, d in comebacks
                        if gc in by_code
                    ],
                },
                {
                    "key": "blowouts",
                    "label": "Biggest blowouts",
                    "entries": [
                        entry(g, margin(g), f"won by {margin(g)}")
                        for g in sorted(games, key=margin, reverse=True)[:limit]
                    ],
                },
                {
                    "key": "closest",
                    "label": "Closest finishes",
                    "entries": [
                        entry(g, margin(g), f"decided by {margin(g)}")
                        for g in sorted(
                            games, key=lambda g: (margin(g), -total(g))
                        )[:limit]
                    ],
                },
                {
                    "key": "overtime",
                    "label": "Overtime games",
                    "entries": [
                        entry(g, ot_points(g), f"{ot_points(g)} OT points")
                        for g in sorted(
                            (g for g in games if ot_points(g) > 0),
                            key=ot_points,
                            reverse=True,
                        )[:limit]
                    ],
                },
                {
                    "key": "shootouts",
                    "label": "Highest-scoring games",
                    "entries": [
                        entry(g, total(g), f"{total(g)} combined points")
                        for g in sorted(games, key=total, reverse=True)[:limit]
                    ],
                },
            ],
        }


@app.get("/api/games/{game_code}")
def game_detail(game_code: int, season: str = DEFAULT_SEASON) -> dict:
    """Match page payload: quarters, both box scores, team totals."""
    with Session(engine) as session:
        game = session.execute(
            select(Game).where(
                Game.season_code == season, Game.game_code == game_code
            )
        ).scalar_one_or_none()
        if game is None:
            raise HTTPException(404, f"unknown game {game_code}")
        clubs = load_clubs(session)
        lines = session.execute(
            select(PlayerGameStat)
            .where(
                PlayerGameStat.season_code == season,
                PlayerGameStat.game_code == game_code,
            )
            .order_by(
                PlayerGameStat.is_starter.desc(),
                PlayerGameStat.seconds_played.desc(),
            )
        ).scalars().all()
        game_shots = session.execute(
            select(Shot).where(
                Shot.season_code == season,
                Shot.game_code == game_code,
                Shot.action_id.in_(["2FGM", "2FGA", "3FGM", "3FGA"]),
            )
        ).scalars().all()

        def player_line(s: PlayerGameStat) -> dict:
            return {
                "playerCode": s.player_code,
                "name": s.player_name,
                "dorsal": s.dorsal,
                "isStarter": s.is_starter,
                "minutes": round((s.seconds_played or 0) / 60.0, 1),
                "points": s.points,
                "fg2": f"{s.fg2m}/{s.fg2a}",
                "fg3": f"{s.fg3m}/{s.fg3a}",
                "ft": f"{s.ftm}/{s.fta}",
                "oreb": s.oreb,
                "dreb": s.dreb,
                "rebounds": s.treb,
                "assists": s.ast,
                "steals": s.stl,
                "turnovers": s.tov,
                "blocks": s.blk,
                "fouls": s.fouls_committed,
                "pir": s.pir,
                "plusMinus": s.plus_minus,
            }

        def team_totals(rows: list[PlayerGameStat]) -> dict:
            def tot(attr: str) -> int:
                return sum(getattr(r, attr) or 0 for r in rows)

            return {
                "points": tot("points"),
                "fg2m": tot("fg2m"), "fg2a": tot("fg2a"),
                "fg3m": tot("fg3m"), "fg3a": tot("fg3a"),
                "ftm": tot("ftm"), "fta": tot("fta"),
                "fg2Pct": pct(tot("fg2m"), tot("fg2a")),
                "fg3Pct": pct(tot("fg3m"), tot("fg3a")),
                "ftPct": pct(tot("ftm"), tot("fta")),
                "oreb": tot("oreb"), "dreb": tot("dreb"), "rebounds": tot("treb"),
                "assists": tot("ast"), "steals": tot("stl"),
                "turnovers": tot("tov"), "blocks": tot("blk"),
                "fouls": tot("fouls_committed"), "pir": tot("pir"),
            }

        def side(club_code: Optional[str], score: Optional[int],
                 quarters: list[Optional[int]]) -> dict:
            club = clubs.get(club_code) if club_code else None
            rows = [l for l in lines if l.club_code == club_code]
            q_sum = sum(q or 0 for q in quarters)
            return {
                "club": club_dict(club) if club else None,
                "score": score,
                "quarters": quarters,
                "overtime": (score - q_sum) if score and q_sum and score > q_sum else None,
                "players": [player_line(l) for l in rows],
                "totals": team_totals(rows),
                "shots": [
                    {
                        "x": s.coord_x,
                        "y": s.coord_y,
                        "made": s.made,
                        "three": s.action_id in ("3FGM", "3FGA"),
                        "zone": s.zone,
                        "fastbreak": s.fastbreak,
                        "gameCode": s.game_code,
                        "home": None,
                        "won": None,
                    }
                    for s in game_shots
                    if s.club_code == club_code
                ],
            }

        a, b = game.local_club_code, game.road_club_code
        meetings = session.execute(
            select(Game)
            .where(
                Game.season_code == season,
                Game.id != game.id,
                ((Game.local_club_code == a) & (Game.road_club_code == b))
                | ((Game.local_club_code == b) & (Game.road_club_code == a)),
            )
            .order_by(Game.utc_date)
        ).scalars().all()

        return {
            "season": season,
            "gameCode": game_code,
            "headToHead": [game_dict(m, clubs) for m in meetings],
            "round": game.round,
            "roundName": game.round_name,
            "phaseType": game.phase_type,
            "groupName": game.group_name,
            "played": game.played,
            "utcDate": game.utc_date.isoformat() + "Z" if game.utc_date else None,
            "home": side(
                game.local_club_code,
                game.local_score,
                [game.local_q1, game.local_q2, game.local_q3, game.local_q4],
            ),
            "away": side(
                game.road_club_code,
                game.road_score,
                [game.road_q1, game.road_q2, game.road_q3, game.road_q4],
            ),
        }


@app.get("/api/clubs")
def clubs_index(season: str = DEFAULT_SEASON) -> dict:
    with Session(engine) as session:
        last_round = session.execute(
            select(func.max(StandingRow.round)).where(
                StandingRow.season_code == season
            )
        ).scalar()
        table = {
            r.club_code: r
            for r in session.execute(
                select(StandingRow).where(
                    StandingRow.season_code == season,
                    StandingRow.round == last_round,
                )
            ).scalars()
        }
        rows = session.execute(select(Club).order_by(Club.name)).scalars()
        clubs = []
        for c in rows:
            st = table.get(c.code)
            clubs.append(
                {
                    **club_dict(c),
                    "position": st.position if st else None,
                    "record": f"{st.games_won}–{st.games_lost}" if st else None,
                }
            )
        clubs.sort(key=lambda x: x["position"] or 99)
        return {"clubs": clubs}


def pct(made, attempted) -> Optional[float]:
    if not attempted:
        return None
    return round(100.0 * (made or 0) / attempted, 1)


@app.get("/api/players")
def players_index(
    season: str = DEFAULT_SEASON, min_games: Optional[int] = Query(None)
) -> dict:
    """Season leaderboard aggregated from box scores (per-game averages).

    Default games threshold adapts to how much of the season is ingested,
    so the leaderboard is never empty during a backfill.
    """
    g = PlayerGameStat
    with Session(engine) as session:
        max_gp = (
            session.execute(
                select(func.count())
                .where(g.season_code == season)
                .group_by(g.player_code)
                .order_by(func.count().desc())
                .limit(1)
            ).scalar()
            or 0
        )
        threshold = min_games if min_games is not None else max(1, max_gp // 2)
        rows = session.execute(
            select(
                g.player_code,
                func.max(g.player_name),
                func.count().label("gp"),
                func.sum(g.seconds_played),
                func.sum(g.points),
                func.sum(g.fg2m), func.sum(g.fg2a),
                func.sum(g.fg3m), func.sum(g.fg3a),
                func.sum(g.ftm), func.sum(g.fta),
                func.sum(g.treb), func.sum(g.ast), func.sum(g.stl),
                func.sum(g.tov), func.sum(g.blk), func.sum(g.pir),
            )
            .where(g.season_code == season)
            .group_by(g.player_code)
            .having(func.count() >= threshold)
        ).all()
        images = {
            code: url
            for code, url in session.execute(
                select(PersonStint.person_code, func.max(PersonStint.image_url))
                .where(PersonStint.season_code == season, PersonStint.type == "J")
                .group_by(PersonStint.person_code)
            )
        }
        # last club each player appeared for, for crest/label
        last_club: dict[str, str] = {}
        for pc, cc in session.execute(
            select(g.player_code, g.club_code)
            .where(g.season_code == season)
            .order_by(g.game_code)
        ):
            last_club[pc] = cc
        clubs = load_clubs(session)

        players = []
        for (
            code, name, gp, secs, pts, fg2m, fg2a, fg3m, fg3a,
            ftm, fta, treb, ast, stl, tov, blk, pir,
        ) in rows:
            club = clubs.get(last_club.get(code, ""))
            players.append(
                {
                    "playerCode": code,
                    "name": name,
                    "imageUrl": images.get(code),
                    "club": club_dict(club) if club else None,
                    "gamesPlayed": gp,
                    "minutes": round((secs or 0) / 60.0 / gp, 1),
                    "points": round((pts or 0) / gp, 1),
                    "rebounds": round((treb or 0) / gp, 1),
                    "assists": round((ast or 0) / gp, 1),
                    "steals": round((stl or 0) / gp, 1),
                    "turnovers": round((tov or 0) / gp, 1),
                    "blocks": round((blk or 0) / gp, 1),
                    "pir": round((pir or 0) / gp, 1),
                    "fg2Pct": pct(fg2m, fg2a),
                    "fg3Pct": pct(fg3m, fg3a),
                    "ftPct": pct(ftm, fta),
                }
            )
        players.sort(key=lambda p: -p["pir"])
        return {"season": season, "minGames": threshold, "players": players}


HIGH_CATEGORIES = [
    ("points", "Points", PlayerGameStat.points),
    ("rebounds", "Rebounds", PlayerGameStat.treb),
    ("assists", "Assists", PlayerGameStat.ast),
    ("threes", "Three-pointers", PlayerGameStat.fg3m),
    ("steals", "Steals", PlayerGameStat.stl),
    ("blocks", "Blocks", PlayerGameStat.blk),
    ("pir", "PIR", PlayerGameStat.pir),
]


@app.get("/api/highs")
def season_highs(season: str = DEFAULT_SEASON, limit: int = 10) -> dict:
    """Best single-game performances of the season per category."""
    with Session(engine) as session:
        clubs = load_clubs(session)
        games_by_code = {
            gm.game_code: gm
            for gm in session.execute(
                select(Game).where(Game.season_code == season, Game.played)
            ).scalars()
        }
        categories = []
        for key, label, col in HIGH_CATEGORIES:
            rows = session.execute(
                select(PlayerGameStat)
                .where(PlayerGameStat.season_code == season, col.is_not(None))
                .order_by(col.desc(), PlayerGameStat.pir.desc())
                .limit(limit)
            ).scalars().all()
            entries = []
            for s in rows:
                gm = games_by_code.get(s.game_code)
                home = gm and gm.local_club_code == s.club_code
                opp_code = (
                    (gm.road_club_code if home else gm.local_club_code) if gm else None
                )
                opp = clubs.get(opp_code) if opp_code else None
                entries.append(
                    {
                        "playerCode": s.player_code,
                        "name": s.player_name,
                        "clubCode": s.club_code,
                        "value": getattr(s, col.key),
                        "gameCode": s.game_code,
                        "round": gm.round if gm else None,
                        "opponent": opp.abbreviated_name if opp else None,
                        "utcDate": gm.utc_date.date().isoformat()
                        if gm and gm.utc_date
                        else None,
                    }
                )
            categories.append({"key": key, "label": label, "entries": entries})
        return {"season": season, "categories": categories}


@app.get("/api/players/{player_code}")
def player_detail(player_code: str, season: str = DEFAULT_SEASON) -> dict:
    g = PlayerGameStat
    with Session(engine) as session:
        stats = session.execute(
            select(g)
            .where(g.season_code == season, g.player_code == player_code)
            .order_by(g.game_code)
        ).scalars().all()
        if not stats:
            raise HTTPException(404, f"no games for player {player_code}")
        stint = session.execute(
            select(PersonStint)
            .where(
                PersonStint.season_code == season,
                PersonStint.person_code == player_code,
            )
            .order_by(PersonStint.start_date.desc())
        ).scalars().first()
        clubs = load_clubs(session)
        games_by_code = {
            gm.game_code: gm
            for gm in session.execute(
                select(Game).where(
                    Game.season_code == season,
                    Game.game_code.in_([s.game_code for s in stats]),
                )
            ).scalars()
        }

        def log_entry(s: PlayerGameStat) -> dict:
            gm = games_by_code.get(s.game_code)
            opp_code = None
            home = None
            if gm:
                home = gm.local_club_code == s.club_code
                opp_code = gm.road_club_code if home else gm.local_club_code
            opp = clubs.get(opp_code) if opp_code else None
            return {
                "gameCode": s.game_code,
                "round": gm.round if gm else None,
                "utcDate": gm.utc_date.isoformat() + "Z" if gm and gm.utc_date else None,
                "home": home,
                "opponent": club_dict(opp) if opp else None,
                "minutes": round((s.seconds_played or 0) / 60.0, 1),
                "points": s.points,
                "rebounds": s.treb,
                "assists": s.ast,
                "steals": s.stl,
                "blocks": s.blk,
                "turnovers": s.tov,
                "pir": s.pir,
                "plusMinus": s.plus_minus,
                "fg2": f"{s.fg2m}/{s.fg2a}",
                "fg3": f"{s.fg3m}/{s.fg3a}",
                "ft": f"{s.ftm}/{s.fta}",
            }

        gp = len(stats)
        club = clubs.get(stats[-1].club_code)
        return {
            "playerCode": player_code,
            "name": stats[-1].player_name,
            "club": club_dict(club) if club else None,
            "dorsal": stint.dorsal if stint else stats[-1].dorsal,
            "positionName": stint.position_name if stint else None,
            "heightCm": stint.height_cm if stint else None,
            "birthDate": stint.birth_date.date().isoformat()
            if stint and stint.birth_date
            else None,
            "country": stint.country_name if stint else None,
            "imageUrl": stint.image_url if stint else None,
            "averages": {
                "gamesPlayed": gp,
                "minutes": round(sum(s.seconds_played or 0 for s in stats) / 60 / gp, 1),
                "points": round(sum(s.points or 0 for s in stats) / gp, 1),
                "rebounds": round(sum(s.treb or 0 for s in stats) / gp, 1),
                "assists": round(sum(s.ast or 0 for s in stats) / gp, 1),
                "pir": round(sum(s.pir or 0 for s in stats) / gp, 1),
                "fg2Pct": pct(
                    sum(s.fg2m or 0 for s in stats), sum(s.fg2a or 0 for s in stats)
                ),
                "fg3Pct": pct(
                    sum(s.fg3m or 0 for s in stats), sum(s.fg3a or 0 for s in stats)
                ),
                "ftPct": pct(
                    sum(s.ftm or 0 for s in stats), sum(s.fta or 0 for s in stats)
                ),
            },
            "gameLog": [log_entry(s) for s in stats],
        }


def shots_payload(session, season: str, *, player: Optional[str] = None,
                  club: Optional[str] = None) -> dict:
    q = select(Shot).where(
        Shot.season_code == season, Shot.action_id.in_(["2FGM", "2FGA", "3FGM", "3FGA"])
    )
    if player:
        q = q.where(Shot.player_code == player)
    if club:
        q = q.where(Shot.club_code == club)
    shots = session.execute(q).scalars().all()
    games = {
        gm.game_code: gm
        for gm in session.execute(
            select(Game).where(Game.season_code == season, Game.played)
        ).scalars()
    }

    def context(s: Shot) -> tuple[Optional[bool], Optional[bool]]:
        gm = games.get(s.game_code)
        if not gm or gm.local_score is None or gm.road_score is None:
            return None, None
        home = gm.local_club_code == s.club_code
        won = (gm.local_score > gm.road_score) == home
        return home, won

    payload = []
    for s in shots:
        home, won = context(s)
        payload.append(
            {
                "x": s.coord_x,
                "y": s.coord_y,
                "made": s.made,
                "three": s.action_id in ("3FGM", "3FGA"),
                "zone": s.zone,
                "fastbreak": s.fastbreak,
                "gameCode": s.game_code,
                "home": home,
                "won": won,
            }
        )
    return {"season": season, "total": len(shots), "shots": payload}


@app.get("/api/players/{player_code}/shots")
def player_shots(player_code: str, season: str = DEFAULT_SEASON) -> dict:
    with Session(engine) as session:
        return shots_payload(session, season, player=player_code)


@app.get("/api/clubs/{code}/shots")
def club_shots(code: str, season: str = DEFAULT_SEASON) -> dict:
    with Session(engine) as session:
        return shots_payload(session, season, club=code)


def club_season_stats(session, code: str, season: str) -> Optional[dict]:
    """Per-game team averages from box scores + record from game results."""
    g = PlayerGameStat
    row = session.execute(
        select(
            func.count(func.distinct(g.game_code)),
            func.sum(g.points),
            func.sum(g.fg2m), func.sum(g.fg2a),
            func.sum(g.fg3m), func.sum(g.fg3a),
            func.sum(g.ftm), func.sum(g.fta),
            func.sum(g.oreb), func.sum(g.dreb), func.sum(g.treb),
            func.sum(g.ast), func.sum(g.stl), func.sum(g.tov),
            func.sum(g.blk), func.sum(g.pir),
        ).where(g.season_code == season, g.club_code == code)
    ).one()
    n = row[0]
    if not n:
        return None
    (_, pts, fg2m, fg2a, fg3m, fg3a, ftm, fta,
     oreb, dreb, treb, ast, stl, tov, blk, pir) = row

    games = session.execute(
        select(Game).where(
            Game.season_code == season,
            Game.played,
            (Game.local_club_code == code) | (Game.road_club_code == code),
        )
    ).scalars().all()
    wins = opp_pts = 0
    for gm in games:
        home = gm.local_club_code == code
        own = gm.local_score if home else gm.road_score
        opp = gm.road_score if home else gm.local_score
        if own is not None and opp is not None:
            opp_pts += opp
            if own > opp:
                wins += 1

    per = lambda total: round((total or 0) / n, 1)  # noqa: E731
    return {
        "gamesPlayed": n,
        "wins": wins,
        "losses": len(games) - wins,
        "points": per(pts),
        "opponentPoints": round(opp_pts / len(games), 1) if games else None,
        "rebounds": per(treb),
        "offensiveRebounds": per(oreb),
        "defensiveRebounds": per(dreb),
        "assists": per(ast),
        "steals": per(stl),
        "turnovers": per(tov),
        "blocks": per(blk),
        "pir": per(pir),
        "fg2Pct": pct(fg2m, fg2a),
        "fg3Pct": pct(fg3m, fg3a),
        "ftPct": pct(ftm, fta),
    }


@app.get("/api/clubs/{code}")
def club_detail(code: str, season: str = DEFAULT_SEASON) -> dict:
    with Session(engine) as session:
        club = session.get(Club, code)
        if club is None:
            raise HTTPException(404, f"unknown club {code}")
        clubs = load_clubs(session)
        roster = session.execute(
            select(PersonStint)
            .where(
                PersonStint.season_code == season,
                PersonStint.club_code == code,
                PersonStint.type == "J",  # J = player (E = coach, A = assistant)
            )
            .order_by(PersonStint.dorsal)
        ).scalars()
        coaches = session.execute(
            select(PersonStint)
            .where(
                PersonStint.season_code == season,
                PersonStint.club_code == code,
                PersonStint.type.in_(["E", "A"]),  # E = head coach, A = assistant
            )
            .order_by(PersonStint.type, PersonStint.start_date)
        ).scalars().all()
        g = PlayerGameStat
        player_stats = {
            row[0]: row
            for row in session.execute(
                select(
                    g.player_code,
                    func.count(),
                    func.sum(g.seconds_played),
                    func.sum(g.points),
                    func.sum(g.treb),
                    func.sum(g.ast),
                    func.sum(g.pir),
                )
                .where(
                    g.season_code == season,
                    g.club_code == code,  # only games for THIS club (transfers)
                )
                .group_by(g.player_code)
            )
        }

        def roster_stats(person_code: str) -> dict:
            row = player_stats.get(person_code)
            if not row:
                return {"gamesPlayed": 0, "minutes": None, "points": None,
                        "rebounds": None, "assists": None, "pir": None}
            _, gp, secs, pts, reb, ast, pir = row
            per = lambda total: round((total or 0) / gp, 1)  # noqa: E731
            return {
                "gamesPlayed": gp,
                "minutes": round((secs or 0) / 60.0 / gp, 1),
                "points": per(pts),
                "rebounds": per(reb),
                "assists": per(ast),
                "pir": per(pir),
            }
        games_q = session.execute(
            select(Game)
            .where(
                Game.season_code == season,
                (Game.local_club_code == code) | (Game.road_club_code == code),
            )
            .order_by(Game.utc_date)
        ).scalars()
        return {
            "club": club_dict(club),
            "stats": club_season_stats(session, code, season),
            "coaches": [
                {
                    "name": c.name,
                    "role": "Head coach" if c.type == "E" else "Assistant coach",
                    "active": c.active,
                }
                for c in coaches
            ],
            "roster": [
                {
                    "personCode": p.person_code,
                    "name": p.name,
                    "dorsal": p.dorsal,
                    "positionName": p.position_name,
                    "heightCm": p.height_cm,
                    "birthDate": p.birth_date.date().isoformat() if p.birth_date else None,
                    "country": p.country_name,
                    "active": p.active,
                    **roster_stats(p.person_code),
                }
                for p in roster
            ],
            "games": [game_dict(g, clubs) for g in games_q],
        }
