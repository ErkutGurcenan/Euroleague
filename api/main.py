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

from euroleague_pipeline.models import Club, Game, PersonStint, StandingRow  # noqa: E402

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


@app.get("/api/clubs")
def clubs_index(season: str = DEFAULT_SEASON) -> dict:
    with Session(engine) as session:
        rows = session.execute(select(Club).order_by(Club.name)).scalars()
        return {"clubs": [club_dict(c) for c in rows]}


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
                }
                for p in roster
            ],
            "games": [game_dict(g, clubs) for g in games_q],
        }
