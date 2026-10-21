"""Polymarket prices for every game, and paper trading on our predictions.

Usage:
    python -m euroleague_pipeline.market

Run every 15 minutes by cron. Each run:

1. Prices. Finds the moneyline market of every open EuroLeague game on
   Polymarket (public, read-only APIs; no account involved) and saves, from
   its live order book, the home team's price (midway between bid and ask),
   bid and ask, plus the average price of 100 shares on each side, whenever
   something changed (at least hourly, and every run in the last half hour),
   until tip-off.
2. Trades. Once a game has tipped off, enters one paper trade per strategy
   using the last price saved before tip-off and that model's frozen
   pre-game probability. Model above the market price: buy 100 home shares.
   Below: buy 100 away shares. The fill is the order book's price for 100
   shares, plus Polymarket's taker fee. A market whose spread is wider than
   10 cents, or that cannot fill 100 shares within 5 cents of its best ask,
   is skipped: it has no real price to trade at.
3. Settlement. When the result is in, each winning share pays $1.

Nothing is bought: these are simulated trades that test whether the models
find value against the market.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
import unicodedata
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests
from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import Session

from .ingest import DEFAULT_DB
from .models import AiPrediction, Base, Club, Game, GamePrediction, MarketSnapshot, PaperTrade

log = logging.getLogger("market")

EVENTS = "https://gamma-api.polymarket.com/events/keyset"
BOOK = "https://clob.polymarket.com/book"
EUROLEAGUE_TAG = 102669  # Polymarket's "euroleague-basketball" tag
SHARES = 100
MAX_SPREAD = 0.10
MAX_SLIPPAGE = 0.05  # 100 shares must fill within 5 cents of the best ask
RESAVE = timedelta(minutes=60)
CLOSING = timedelta(minutes=30)
STRATEGIES = ("eurostepper", "jev")
AI_PROVIDER = "jev"


def norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(s.lower().replace(".", " ").replace("-", " ").split())


# Polymarket's team names -> our club codes. Names not listed fall back to a
# match against our own club names (see team_code).
TEAM_CODES = {norm(k): v for k, v in {
    "ASVEL Lyon-Villeurbanne": "ASV", "LDLC ASVEL": "ASV", "ASVEL": "ASV",
    "Anadolu Efes": "IST",
    "BC Dubai": "DUB", "Dubai Basketball": "DUB",
    "Barcelona": "BAR", "FC Barcelona": "BAR",
    "Besiktas": "BES",
    "FC Bayern Munchen": "MUN", "Bayern Munchen": "MUN", "FC Bayern Munich": "MUN", "Bayern Munich": "MUN",
    "Fenerbahce": "ULK", "Fenerbahce Beko": "ULK",
    "Hapoel Tel Aviv": "HTA",
    "KK Crvena Zvezda": "RED", "Crvena Zvezda": "RED", "Red Star Belgrade": "RED",
    "Kosner Baskonia": "BAS", "Baskonia": "BAS",
    "Maccabi Tel Aviv": "TEL",
    "Olimpia Milano": "MIL", "Olimpia Milan": "MIL",
    "Olympiacos B.C.": "OLY", "Olympiacos": "OLY",
    "Panathinaikos": "PAN",
    "Paris Basketball": "PRS",
    "Partizan": "PAR",
    "Real Madrid": "MAD",
    "Valencia": "PAM", "Valencia Basket": "PAM",
    "Virtus Bologna": "VIR",
    "Zalgiris Kaunas": "ZAL", "Zalgiris": "ZAL",
    "AS Monaco": "MCO", "Monaco": "MCO",
}.items()}

GENERIC = {"basketball", "club", "tel", "aviv", "istanbul", "belgrade", "athens"}


def team_code(name: str, clubs: dict[str, str]) -> str | None:
    """Our club code for a Polymarket team name: the alias table first, then
    a club whose name shares a distinctive word, if exactly one does."""
    n = norm(name)
    if n in TEAM_CODES:
        return TEAM_CODES[n]
    words = {w for w in n.split() if len(w) >= 4 and w not in GENERIC}
    hits = [code for code, club_name in clubs.items() if words & set(norm(club_name).split())]
    return hits[0] if len(hits) == 1 else None


def parse_time(s: str | None) -> datetime | None:
    """'2026-10-21 16:00:00+00' or '2026-10-21T16:00:00Z' -> naive UTC."""
    if not s:
        return None
    s = s.replace("Z", "+00:00")
    if s.endswith("+00"):
        s += ":00"
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return None
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt


def num(x) -> float | None:
    try:
        return None if x is None else float(x)
    except (TypeError, ValueError):
        return None


def get_json(url: str, params: dict) -> dict:
    """GET with two retries: Polymarket's APIs fail now and then."""
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, timeout=20)
            r.raise_for_status()
            return r.json()
        except (requests.RequestException, ValueError):
            if attempt == 2:
                raise
            time.sleep(3)
    raise RuntimeError("unreachable")


def read_book(token_id: str) -> dict:
    """Best bid and ask, and the average price of buying SHARES shares (None
    if fewer are offered), from one outcome's live order book."""
    data = get_json(BOOK, {"token_id": token_id})
    bids = sorted(float(b["price"]) for b in data.get("bids") or [])
    asks = sorted((float(a["price"]), float(a["size"])) for a in data.get("asks") or [])
    need, paid, fill = float(SHARES), 0.0, None
    for price, size in asks:
        take = min(need, size)
        paid += take * price
        need -= take
        if need <= 0:
            fill = round(paid / SHARES, 4)
            break
    return {"bid": bids[-1] if bids else None, "ask": asks[0][0] if asks else None, "fill": fill}


def taker_fee(price: float, shares: int, fees: str | None) -> float:
    """Polymarket's taker fee in dollars: shares x rate x (price x (1 - price))^exponent
    (docs.polymarket.com/trading/fees; sports: rate 0.05, exponent 1)."""
    if not fees:
        return 0.0
    f = json.loads(fees)
    rate, exponent = num(f.get("rate")) or 0.0, num(f.get("exponent")) or 1.0
    return round(shares * rate * (price * (1 - price)) ** exponent, 4)


def fetch_events() -> list[dict]:
    """Every open EuroLeague event (game) listed on Polymarket."""
    events: list[dict] = []
    params: dict = {"tag_id": EUROLEAGUE_TAG, "closed": "false", "limit": 100}
    for _ in range(10):
        page = get_json(EVENTS, params)
        events.extend(page.get("events") or [])
        if not page.get("next_cursor"):
            break
        params["after_cursor"] = page["next_cursor"]
    return events


def snapshot(m: dict, home: int, now: datetime) -> MarketSnapshot:
    """The market's live prices for outcome `home` (0 or 1) winning. The
    event listing is cached for minutes, so prices come from the order book."""
    tokens = json.loads(m.get("clobTokenIds") or "[]")
    if len(tokens) != 2:
        raise ValueError("market has no order book")
    home_book, away_book = read_book(tokens[home]), read_book(tokens[1 - home])
    bid, ask = home_book["bid"], home_book["ask"]
    if bid is not None and ask is not None:
        price = (bid + ask) / 2
    else:  # one-sided book: fall back to the listing's price
        price = float(json.loads(m["outcomePrices"])[home])
    # the listing's last trade is for outcome 0 (the book's isn't tied to a side)
    last = num(m.get("lastTradePrice")) if num(m.get("volume")) else None
    if last is not None and home == 1:
        last = 1 - last
    fees = None
    if m.get("feesEnabled") and m.get("feeSchedule"):
        fees = json.dumps({**m["feeSchedule"], "type": m.get("feeType")})[:200]
    r4 = lambda x: None if x is None else round(x, 4)
    return MarketSnapshot(
        market_id=str(m["id"]), slug=str(m.get("slug") or "")[:120], captured_at=now,
        game_start=parse_time(m.get("gameStartTime")),
        home_price=round(price, 4), home_bid=r4(bid), home_ask=r4(ask), home_last=r4(last),
        home_fill=home_book["fill"], away_fill=away_book["fill"],
        volume=num(m.get("volume")), liquidity=num(m.get("liquidity")), fees=fees,
    )


def same_quote(a: MarketSnapshot, b: MarketSnapshot) -> bool:
    return all(getattr(a, k) == getattr(b, k) for k in
               ("market_id", "home_price", "home_bid", "home_ask", "home_fill", "away_fill"))


def poll(session: Session, season: str, now: datetime) -> int:
    """Save the current price of every upcoming game Polymarket lists."""
    clubs = {c.code: c.name for c in session.execute(select(Club)).scalars()}
    games = session.execute(
        select(Game).where(Game.season_code == season, Game.played.is_(False),
                           Game.utc_date > now - timedelta(days=1), Game.utc_date < now + timedelta(days=21))
    ).scalars().all()
    by_pair: dict[frozenset, list[Game]] = defaultdict(list)
    for g in games:
        by_pair[frozenset((g.local_club_code, g.road_club_code))].append(g)

    # all network reads first, then one short write, so the database is
    # never locked while we wait on Polymarket
    pending: list[MarketSnapshot] = []
    for e in fetch_events():
        for m in e.get("markets") or []:
            if m.get("sportsMarketType") != "moneyline" or m.get("closed"):
                continue
            try:
                outcomes = json.loads(m.get("outcomes") or "[]")
            except ValueError:
                continue
            if len(outcomes) != 2:
                continue
            codes = [team_code(o, clubs) for o in outcomes]
            if None in codes:
                log.warning("unmatched team name in %s: %s", m.get("slug"), outcomes)
                continue
            start = parse_time(m.get("gameStartTime")) or parse_time(e.get("endDate"))
            candidates = [g for g in by_pair.get(frozenset(codes), [])
                          if start is None or abs(g.utc_date - start) < timedelta(hours=36)]
            if not candidates:
                continue
            g = min(candidates, key=lambda g: abs(g.utc_date - start) if start else timedelta(0))
            if now >= min(t for t in (g.utc_date, start) if t):
                continue  # only pre-game prices are kept
            try:
                snap = snapshot(m, codes.index(g.local_club_code), now)
            except (requests.RequestException, ValueError, KeyError, IndexError) as exc:
                log.warning("game %s: could not read market %s: %s", g.game_code, m.get("slug"), exc)
                continue
            snap.season_code, snap.game_code = season, g.game_code
            last = session.execute(
                select(MarketSnapshot).where(MarketSnapshot.season_code == season,
                                             MarketSnapshot.game_code == g.game_code)
                .order_by(MarketSnapshot.captured_at.desc()).limit(1)
            ).scalar()
            # unchanged quotes are saved hourly, and on every run in the last
            # half hour so the closing price is always a fresh one
            if (last and same_quote(last, snap) and now - last.captured_at < RESAVE
                    and tip_off(g, snap) - now > CLOSING):
                continue
            pending.append(snap)
    session.add_all(pending)
    session.commit()
    return len(pending)


def tip_off(g: Game, snap: MarketSnapshot | None = None) -> datetime:
    times = [g.utc_date] + ([snap.game_start] if snap is not None and snap.game_start else [])
    return min(times)


def enter(session: Session, season: str, now: datetime) -> int:
    """Paper trades for games that have tipped off, priced before tip-off."""
    # a rescheduled game: drop its unsettled trades and enter again later
    future = select(Game.game_code).where(Game.season_code == season, Game.utc_date > now,
                                          Game.played.is_(False))
    session.execute(delete(PaperTrade).where(PaperTrade.season_code == season,
                                             PaperTrade.status.in_(("open", "skipped")),
                                             PaperTrade.game_code.in_(future)))

    priced = select(MarketSnapshot.game_code).where(MarketSnapshot.season_code == season).distinct()
    games = session.execute(
        select(Game).where(Game.season_code == season, Game.utc_date <= now,
                           Game.game_code.in_(priced))
    ).scalars().all()
    have = {(t.game_code, t.strategy) for t in session.execute(
        select(PaperTrade).where(PaperTrade.season_code == season)).scalars()}

    entered = 0
    for g in games:
        if all((g.game_code, s) in have for s in STRATEGIES):
            continue
        snaps = session.execute(
            select(MarketSnapshot).where(MarketSnapshot.season_code == season,
                                         MarketSnapshot.game_code == g.game_code,
                                         MarketSnapshot.captured_at < g.utc_date)
            .order_by(MarketSnapshot.captured_at.desc())
        ).scalars().all()
        snap = next((s for s in snaps if s.captured_at < tip_off(g, s)), None)
        if snap is None:
            continue
        ours = session.execute(
            select(GamePrediction.home_win_prob).where(
                GamePrediction.season_code == season, GamePrediction.game_code == g.game_code,
                GamePrediction.backtest.is_(False), GamePrediction.made_at < g.utc_date)
        ).scalar()
        jev = session.execute(
            select(AiPrediction.home_win_prob).where(
                AiPrediction.season_code == season, AiPrediction.game_code == g.game_code,
                AiPrediction.provider == AI_PROVIDER, AiPrediction.made_at < g.utc_date)
        ).scalar()
        for strategy, p in (("eurostepper", ours), ("jev", jev)):
            if (g.game_code, strategy) in have:
                continue
            session.add(make_trade(season, g.game_code, strategy, p, snap, now))
            entered += 1
    session.commit()
    return entered


def make_trade(season: str, game_code: int, strategy: str, p: float | None,
               snap: MarketSnapshot, now: datetime) -> PaperTrade:
    t = PaperTrade(season_code=season, game_code=game_code, strategy=strategy, entered_at=now,
                   snapshot_at=snap.captured_at, model_home_prob=p,
                   market_home_price=snap.home_price, shares=SHARES, status="skipped")
    spread = (snap.home_ask - snap.home_bid) if snap.home_ask is not None and snap.home_bid is not None else None
    if p is None:
        t.note = "no pre-game prediction"
    elif spread is None or spread > MAX_SPREAD + 1e-9:
        t.note = "market too thin" + (f" (spread {spread * 100:.0f}¢)" if spread is not None else "")
    elif p == snap.home_price:
        t.note = "model agrees with the market"
    else:
        t.side = "home" if p > snap.home_price else "away"
        best = snap.home_ask if t.side == "home" else 1 - snap.home_bid
        t.entry_price = snap.home_fill if t.side == "home" else snap.away_fill
        if t.entry_price is None or t.entry_price > best + MAX_SLIPPAGE + 1e-9:
            t.side, t.entry_price, t.note = None, None, "too few shares near the quoted price"
        else:
            t.cost = round(t.entry_price * SHARES, 2)
            t.fee = taker_fee(t.entry_price, SHARES, snap.fees)
            t.status = "open"
    return t


def settle(session: Session, season: str, now: datetime) -> int:
    rows = session.execute(
        select(PaperTrade, Game).join(Game, (Game.season_code == PaperTrade.season_code)
                                      & (Game.game_code == PaperTrade.game_code))
        .where(PaperTrade.season_code == season, PaperTrade.status == "open",
               Game.played.is_(True), Game.local_score.is_not(None), Game.road_score.is_not(None))
    ).all()
    for t, g in rows:
        home_won = g.local_score > g.road_score
        won = (t.side == "home") == home_won
        t.status = "won" if won else "lost"
        t.payout = float(t.shares) if won else 0.0
        t.pnl = round(t.payout - (t.cost or 0) - (t.fee or 0), 2)
        t.settled_at = now
    session.commit()
    return len(rows)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    engine = create_engine(f"sqlite:///{args.db}")
    Base.metadata.create_all(engine)
    now = datetime.utcnow()
    with Session(engine) as session:
        season = session.execute(select(func.max(Game.season_code))).scalar()
        try:
            saved = poll(session, season, now)
        except (requests.RequestException, ValueError) as exc:  # trades and settlement still run
            log.warning("Polymarket unavailable: %s", exc)
            saved = 0
        entered = enter(session, season, now)
        settled = settle(session, season, now)
    log.info("saved %d prices, entered %d paper trades, settled %d", saved, entered, settled)
    return 0


if __name__ == "__main__":
    sys.exit(main())
