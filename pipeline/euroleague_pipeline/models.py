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
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
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


class GameReferee(Base):
    """One referee's assignment to one game (up to 3 per game)."""

    __tablename__ = "game_referees"
    __table_args__ = (UniqueConstraint("season_code", "game_code", "referee_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer, index=True)
    referee_code: Mapped[str] = mapped_column(String(16), index=True)
    name: Mapped[Optional[str]] = mapped_column(String(120))
    country_code: Mapped[Optional[str]] = mapped_column(String(8))


class PlayerGameStat(Base):
    """One player's box-score line in one game (players who logged minutes)."""

    __tablename__ = "player_game_stats"
    __table_args__ = (UniqueConstraint("season_code", "game_code", "player_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer, index=True)
    club_code: Mapped[str] = mapped_column(ForeignKey("clubs.code"))
    player_code: Mapped[str] = mapped_column(String(16), index=True)
    player_name: Mapped[Optional[str]] = mapped_column(String(120))
    dorsal: Mapped[Optional[str]] = mapped_column(String(8))
    is_starter: Mapped[bool] = mapped_column(Boolean, default=False)
    seconds_played: Mapped[Optional[int]] = mapped_column(Integer)
    points: Mapped[Optional[int]] = mapped_column(Integer)
    fg2m: Mapped[Optional[int]] = mapped_column(Integer)
    fg2a: Mapped[Optional[int]] = mapped_column(Integer)
    fg3m: Mapped[Optional[int]] = mapped_column(Integer)
    fg3a: Mapped[Optional[int]] = mapped_column(Integer)
    ftm: Mapped[Optional[int]] = mapped_column(Integer)
    fta: Mapped[Optional[int]] = mapped_column(Integer)
    oreb: Mapped[Optional[int]] = mapped_column(Integer)
    dreb: Mapped[Optional[int]] = mapped_column(Integer)
    treb: Mapped[Optional[int]] = mapped_column(Integer)
    ast: Mapped[Optional[int]] = mapped_column(Integer)
    stl: Mapped[Optional[int]] = mapped_column(Integer)
    tov: Mapped[Optional[int]] = mapped_column(Integer)
    blk: Mapped[Optional[int]] = mapped_column(Integer)
    blk_against: Mapped[Optional[int]] = mapped_column(Integer)
    fouls_committed: Mapped[Optional[int]] = mapped_column(Integer)
    fouls_drawn: Mapped[Optional[int]] = mapped_column(Integer)
    pir: Mapped[Optional[int]] = mapped_column(Integer)
    plus_minus: Mapped[Optional[int]] = mapped_column(Integer)


class Shot(Base):
    """One field-goal attempt with court coordinates (cm, origin at basket)."""

    __tablename__ = "shots"
    __table_args__ = (UniqueConstraint("season_code", "game_code", "num_anot"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer, index=True)
    num_anot: Mapped[int] = mapped_column(Integer)
    club_code: Mapped[Optional[str]] = mapped_column(String(8), index=True)
    player_code: Mapped[Optional[str]] = mapped_column(String(16), index=True)
    player_name: Mapped[Optional[str]] = mapped_column(String(120))
    action_id: Mapped[Optional[str]] = mapped_column(String(8))  # 2FGM/2FGA/3FGM/...
    made: Mapped[bool] = mapped_column(Boolean, default=False)
    points: Mapped[Optional[int]] = mapped_column(Integer)
    coord_x: Mapped[Optional[int]] = mapped_column(Integer)
    coord_y: Mapped[Optional[int]] = mapped_column(Integer)
    zone: Mapped[Optional[str]] = mapped_column(String(2))
    fastbreak: Mapped[Optional[bool]] = mapped_column(Boolean)
    second_chance: Mapped[Optional[bool]] = mapped_column(Boolean)
    off_turnover: Mapped[Optional[bool]] = mapped_column(Boolean)
    minute: Mapped[Optional[int]] = mapped_column(Integer)
    clock: Mapped[Optional[str]] = mapped_column(String(8))


class PbpEvent(Base):
    """One play-by-play event (substitutions, scores, fouls, ...)."""

    __tablename__ = "pbp_events"
    __table_args__ = (
        UniqueConstraint("season_code", "game_code", "quarter", "play_number"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer, index=True)
    quarter: Mapped[int] = mapped_column(Integer)  # 1-4, 5+ = OT
    play_number: Mapped[int] = mapped_column(Integer)
    play_type: Mapped[Optional[str]] = mapped_column(String(8))  # IN/OUT/2FGM/...
    club_code: Mapped[Optional[str]] = mapped_column(String(8))
    player_code: Mapped[Optional[str]] = mapped_column(String(16), index=True)
    player_name: Mapped[Optional[str]] = mapped_column(String(120))
    minute: Mapped[Optional[int]] = mapped_column(Integer)
    marker_time: Mapped[Optional[str]] = mapped_column(String(8))
    points_a: Mapped[Optional[int]] = mapped_column(Integer)
    points_b: Mapped[Optional[int]] = mapped_column(Integer)
    play_info: Mapped[Optional[str]] = mapped_column(String(120))


class Award(Base):
    """Season award winners (MVP etc.) — editorial data entered once a season."""

    __tablename__ = "awards"
    __table_args__ = (UniqueConstraint("season_code", "award"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    award: Mapped[str] = mapped_column(String(60))
    player_code: Mapped[str] = mapped_column(String(16))
    club_code: Mapped[Optional[str]] = mapped_column(ForeignKey("clubs.code"))
    display_order: Mapped[int] = mapped_column(Integer, default=0)


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


class LineupStint(Base):
    """A stretch of a game with the same ten players on court, rebuilt from
    the play-by-play (see stints.py). Lineups are the five player codes,
    sorted and joined with "|"; counts feed possession estimates."""

    __tablename__ = "stints"
    __table_args__ = (UniqueConstraint("season_code", "game_code", "stint_no"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer)
    stint_no: Mapped[int] = mapped_column(Integer)
    period: Mapped[int] = mapped_column(Integer)  # 1-4, then 5 = OT1, 6 = OT2...
    start_sec: Mapped[int] = mapped_column(Integer)  # seconds since tip-off
    end_sec: Mapped[int] = mapped_column(Integer)
    home_club: Mapped[str] = mapped_column(String(8))
    away_club: Mapped[str] = mapped_column(String(8))
    home_lineup: Mapped[str] = mapped_column(String(120), index=True)
    away_lineup: Mapped[str] = mapped_column(String(120), index=True)
    home_pts: Mapped[int] = mapped_column(Integer, default=0)
    away_pts: Mapped[int] = mapped_column(Integer, default=0)
    home_fga: Mapped[int] = mapped_column(Integer, default=0)
    away_fga: Mapped[int] = mapped_column(Integer, default=0)
    home_fta: Mapped[int] = mapped_column(Integer, default=0)
    away_fta: Mapped[int] = mapped_column(Integer, default=0)
    home_oreb: Mapped[int] = mapped_column(Integer, default=0)
    away_oreb: Mapped[int] = mapped_column(Integer, default=0)
    home_tov: Mapped[int] = mapped_column(Integer, default=0)
    away_tov: Mapped[int] = mapped_column(Integer, default=0)
    valid: Mapped[bool] = mapped_column(Boolean, default=True)  # 5 v 5 on court


class StintCheck(Base):
    """Per-game validation of the stint rebuild against the official box score."""

    __tablename__ = "stint_checks"
    __table_args__ = (UniqueConstraint("season_code", "game_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer)
    usable: Mapped[bool] = mapped_column(Boolean)  # score matches, >= 95% of time valid
    score_ok: Mapped[bool] = mapped_column(Boolean)
    lineups_ok: Mapped[bool] = mapped_column(Boolean)  # always 5 v 5, no impossible subs
    invalid_sec: Mapped[int] = mapped_column(Integer, default=0)  # time not 5 v 5
    players: Mapped[int] = mapped_column(Integer)
    pm_exact: Mapped[int] = mapped_column(Integer)  # rebuilt +/- equals official
    pm_within3: Mapped[int] = mapped_column(Integer)
    minutes_within30: Mapped[int] = mapped_column(Integer)  # within 30 s of official
    issues: Mapped[Optional[str]] = mapped_column(String(300))


class PlayerImpact(Base):
    """Adjusted plus/minus (ridge regression on stints, see impact.py):
    points per 100 possessions a player adds on offence and defence,
    relative to an average player, with standard errors."""

    __tablename__ = "player_impact"
    __table_args__ = (UniqueConstraint("season_code", "player_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    player_code: Mapped[str] = mapped_column(String(16), index=True)
    club_code: Mapped[Optional[str]] = mapped_column(String(8))  # club with most minutes
    minutes: Mapped[float] = mapped_column(Float)
    possessions: Mapped[float] = mapped_column(Float)
    off: Mapped[float] = mapped_column(Float)
    defense: Mapped[float] = mapped_column(Float)
    total: Mapped[float] = mapped_column(Float)
    off_se: Mapped[float] = mapped_column(Float)
    def_se: Mapped[float] = mapped_column(Float)
    total_se: Mapped[float] = mapped_column(Float)
    prior_total: Mapped[float] = mapped_column(Float)  # starting point carried from earlier seasons


class ImpactSeason(Base):
    """Per-season fit details for player_impact, for transparency."""

    __tablename__ = "impact_seasons"

    season_code: Mapped[str] = mapped_column(String(8), primary_key=True)
    lam: Mapped[float] = mapped_column(Float)  # ridge strength chosen by cross-validation
    league_off: Mapped[float] = mapped_column(Float)  # points per 100 possessions, average
    home_edge: Mapped[float] = mapped_column(Float)  # extra points per 100 for the home offence
    cv_baseline: Mapped[float] = mapped_column(Float)  # held-out error without players
    cv_model: Mapped[float] = mapped_column(Float)  # held-out error with players
    players: Mapped[int] = mapped_column(Integer)
    rows: Mapped[int] = mapped_column(Integer)


class TeamRating(Base):
    """Elo rating of a club around one game (see ratings.py): one row per
    club per game, with the pre-game win probability the rating implied."""

    __tablename__ = "team_ratings"
    __table_args__ = (UniqueConstraint("season_code", "game_code", "club_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer)
    club_code: Mapped[str] = mapped_column(String(8), index=True)
    opponent_code: Mapped[str] = mapped_column(String(8))
    home: Mapped[bool] = mapped_column(Boolean)
    utc_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    rating_before: Mapped[float] = mapped_column(Float)
    rating_after: Mapped[float] = mapped_column(Float)
    win_prob: Mapped[float] = mapped_column(Float)
    won: Mapped[bool] = mapped_column(Boolean)


class SeasonOdds(Base):
    """Simulated end-of-season probabilities per club (see simulate.py)."""

    __tablename__ = "season_odds"
    __table_args__ = (UniqueConstraint("season_code", "club_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    club_code: Mapped[str] = mapped_column(String(8))
    computed_at: Mapped[datetime] = mapped_column(DateTime)
    simulations: Mapped[int] = mapped_column(Integer)
    rating: Mapped[float] = mapped_column(Float)
    wins: Mapped[int] = mapped_column(Integer)  # so far
    losses: Mapped[int] = mapped_column(Integer)
    proj_wins: Mapped[float] = mapped_column(Float)
    proj_losses: Mapped[float] = mapped_column(Float)
    first_seed: Mapped[float] = mapped_column(Float)
    top6: Mapped[float] = mapped_column(Float)
    play_in: Mapped[float] = mapped_column(Float)  # finishes 7th-10th
    playoffs: Mapped[float] = mapped_column(Float)  # top 6 or through the play-in
    final_four: Mapped[float] = mapped_column(Float)
    champion: Mapped[float] = mapped_column(Float)


class GamePrediction(Base):
    """Pre-game prediction for a game (see predict.py). Rewritten each run
    until tip-off, then frozen, so played games keep their genuine pre-game
    call. backtest = True rows are walk-forward predictions for past seasons
    (model trained only on earlier seasons), used to report accuracy."""

    __tablename__ = "game_predictions"
    __table_args__ = (UniqueConstraint("season_code", "game_code", "backtest"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer)
    backtest: Mapped[bool] = mapped_column(Boolean, default=False)
    made_at: Mapped[datetime] = mapped_column(DateTime)
    utc_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    home_club: Mapped[str] = mapped_column(String(8))
    away_club: Mapped[str] = mapped_column(String(8))
    home_win_prob: Mapped[float] = mapped_column(Float)
    home_margin: Mapped[float] = mapped_column(Float)
    elo_home_prob: Mapped[float] = mapped_column(Float)  # ratings-only baseline
    rating_diff: Mapped[float] = mapped_column(Float)
    net_diff: Mapped[float] = mapped_column(Float)
    home_court: Mapped[float] = mapped_column(Float)
    factors: Mapped[Optional[str]] = mapped_column(String(400))  # JSON: contribution per input
    model_version: Mapped[str] = mapped_column(String(40))


class AiPrediction(Base):
    """An outside AI model's pre-game call (see ai_challenger.py), stored next
    to our own predictions for a fair comparison. Rewritten until tip-off,
    then frozen; the facts sent are kept for transparency."""

    __tablename__ = "ai_predictions"
    __table_args__ = (UniqueConstraint("season_code", "game_code", "provider"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer)
    provider: Mapped[str] = mapped_column(String(20))  # e.g. "jev"
    model: Mapped[str] = mapped_column(String(60))
    made_at: Mapped[datetime] = mapped_column(DateTime)
    utc_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    home_club: Mapped[str] = mapped_column(String(8))
    away_club: Mapped[str] = mapped_column(String(8))
    home_win_prob: Mapped[float] = mapped_column(Float)
    confidence: Mapped[Optional[float]] = mapped_column(Float)
    state: Mapped[str] = mapped_column(String(2500))  # the facts the model was given
    cost_usd: Mapped[Optional[float]] = mapped_column(Float)


class MarketSnapshot(Base):
    """A Polymarket moneyline price for a game at one moment (see market.py).
    Prices are for the home team winning, as a share price in dollars."""

    __tablename__ = "market_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer, index=True)
    market_id: Mapped[str] = mapped_column(String(20))
    slug: Mapped[str] = mapped_column(String(120))
    captured_at: Mapped[datetime] = mapped_column(DateTime)
    game_start: Mapped[Optional[datetime]] = mapped_column(DateTime)
    home_price: Mapped[float] = mapped_column(Float)  # midway between bid and ask
    home_bid: Mapped[Optional[float]] = mapped_column(Float)
    home_ask: Mapped[Optional[float]] = mapped_column(Float)
    home_last: Mapped[Optional[float]] = mapped_column(Float)
    # average price paid to buy 100 shares from the order book at that moment
    home_fill: Mapped[Optional[float]] = mapped_column(Float)
    away_fill: Mapped[Optional[float]] = mapped_column(Float)
    volume: Mapped[Optional[float]] = mapped_column(Float)
    liquidity: Mapped[Optional[float]] = mapped_column(Float)
    fees: Mapped[Optional[str]] = mapped_column(String(200))  # JSON fee schedule, if fees are on


class PaperTrade(Base):
    """A simulated bet (see market.py): at the last price saved before
    tip-off, buy 100 shares of the side a model rates above the market,
    filled from the order book; settled after the game. No real money."""

    __tablename__ = "paper_trades"
    __table_args__ = (UniqueConstraint("season_code", "game_code", "strategy"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    game_code: Mapped[int] = mapped_column(Integer)
    strategy: Mapped[str] = mapped_column(String(20))  # eurostepper, jev, eurostepper_pick or jev_pick
    entered_at: Mapped[datetime] = mapped_column(DateTime)
    snapshot_at: Mapped[datetime] = mapped_column(DateTime)  # price used, always before tip-off
    model_home_prob: Mapped[Optional[float]] = mapped_column(Float)
    market_home_price: Mapped[float] = mapped_column(Float)
    side: Mapped[Optional[str]] = mapped_column(String(4))  # "home", "away", or None when skipped
    entry_price: Mapped[Optional[float]] = mapped_column(Float)
    shares: Mapped[int] = mapped_column(Integer, default=100)
    cost: Mapped[Optional[float]] = mapped_column(Float)
    fee: Mapped[Optional[float]] = mapped_column(Float)  # Polymarket taker fee, if the market charges one
    status: Mapped[str] = mapped_column(String(10))  # open, won, lost, skipped
    note: Mapped[Optional[str]] = mapped_column(String(120))
    payout: Mapped[Optional[float]] = mapped_column(Float)
    pnl: Mapped[Optional[float]] = mapped_column(Float)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class InjurySnapshot(Base):
    """One read of the injury list (see injury_feed.py), kept every time so
    real injury reports can be tested against results later."""

    __tablename__ = "injury_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    season_code: Mapped[str] = mapped_column(String(8), index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime)
    source: Mapped[str] = mapped_column(String(60))
    source_updated: Mapped[Optional[datetime]] = mapped_column(DateTime)
    entries: Mapped[str] = mapped_column(Text)  # JSON rows as read: club, player, status, injury, expected return
    changed: Mapped[bool] = mapped_column(Boolean)  # differs from the previous read
