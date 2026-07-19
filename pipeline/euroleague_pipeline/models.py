"""SQLAlchemy schema for the Euroleague database.

Written against SQLite for local dev; types are chosen to be
Postgres-compatible (no SQLite-only constructs).
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Club(Base):
    __tablename__ = "clubs"

    code: Mapped[str] = mapped_column(String(8), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    abbreviated_name: Mapped[Optional[str]] = mapped_column(String(60))
    country_code: Mapped[Optional[str]] = mapped_column(String(8))
    country_name: Mapped[Optional[str]] = mapped_column(String(60))
    city: Mapped[Optional[str]] = mapped_column(String(80))
    venue: Mapped[Optional[str]] = mapped_column(String(120))
    crest_url: Mapped[Optional[str]] = mapped_column(String(300))
    website: Mapped[Optional[str]] = mapped_column(String(200))


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (UniqueConstraint("season_code", "game_code"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)  # API uuid
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer)
    round: Mapped[Optional[int]] = mapped_column(Integer, index=True)
    round_name: Mapped[Optional[str]] = mapped_column(String(60))
    phase_type: Mapped[Optional[str]] = mapped_column(String(8))  # RS / PO / FF
    group_name: Mapped[Optional[str]] = mapped_column(String(80))
    played: Mapped[bool] = mapped_column(Boolean, default=False)
    utc_date: Mapped[Optional[datetime]] = mapped_column(DateTime)

    local_club_code: Mapped[Optional[str]] = mapped_column(ForeignKey("clubs.code"))
    road_club_code: Mapped[Optional[str]] = mapped_column(ForeignKey("clubs.code"))
    local_score: Mapped[Optional[int]] = mapped_column(Integer)
    road_score: Mapped[Optional[int]] = mapped_column(Integer)
    local_q1: Mapped[Optional[int]] = mapped_column(Integer)
    local_q2: Mapped[Optional[int]] = mapped_column(Integer)
    local_q3: Mapped[Optional[int]] = mapped_column(Integer)
    local_q4: Mapped[Optional[int]] = mapped_column(Integer)
    road_q1: Mapped[Optional[int]] = mapped_column(Integer)
    road_q2: Mapped[Optional[int]] = mapped_column(Integer)
    road_q3: Mapped[Optional[int]] = mapped_column(Integer)
    road_q4: Mapped[Optional[int]] = mapped_column(Integer)


class StandingRow(Base):
    __tablename__ = "standings"
    __table_args__ = (UniqueConstraint("season_code", "round", "club_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    round: Mapped[int] = mapped_column(Integer, index=True)
    group_name: Mapped[Optional[str]] = mapped_column(String(80))
    club_code: Mapped[str] = mapped_column(ForeignKey("clubs.code"))
    position: Mapped[Optional[int]] = mapped_column(Integer)
    games_played: Mapped[Optional[int]] = mapped_column(Integer)
    games_won: Mapped[Optional[int]] = mapped_column(Integer)
    games_lost: Mapped[Optional[int]] = mapped_column(Integer)
    points_favour: Mapped[Optional[int]] = mapped_column(Integer)
    points_against: Mapped[Optional[int]] = mapped_column(Integer)
    qualified: Mapped[Optional[bool]] = mapped_column(Boolean)


class PersonStint(Base):
    """A person's stint at a club in a season (players, coaches, staff).

    A player traded mid-season appears once per club stint.
    """

    __tablename__ = "people"
    __table_args__ = (
        UniqueConstraint(
            "season_code", "club_code", "person_code", "type", "start_date"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    person_code: Mapped[str] = mapped_column(String(16), index=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    club_code: Mapped[str] = mapped_column(ForeignKey("clubs.code"))
    type: Mapped[Optional[str]] = mapped_column(String(4))  # P = player
    type_name: Mapped[Optional[str]] = mapped_column(String(40))
    name: Mapped[Optional[str]] = mapped_column(String(120))
    country_code: Mapped[Optional[str]] = mapped_column(String(8))
    country_name: Mapped[Optional[str]] = mapped_column(String(60))
    height_cm: Mapped[Optional[int]] = mapped_column(Integer)
    weight_kg: Mapped[Optional[int]] = mapped_column(Integer)
    birth_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    dorsal: Mapped[Optional[str]] = mapped_column(String(8))
    position: Mapped[Optional[int]] = mapped_column(Integer)
    position_name: Mapped[Optional[str]] = mapped_column(String(40))
    active: Mapped[Optional[bool]] = mapped_column(Boolean)
    start_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    image_url: Mapped[Optional[str]] = mapped_column(String(300))
