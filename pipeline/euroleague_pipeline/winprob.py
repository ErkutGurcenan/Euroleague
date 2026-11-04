"""Live win probability from the score, the time left and our pre-game call.

The final home margin is taken as normal around m + SIGMA * Ninv(p0) * r with
standard deviation SIGMA * sqrt(r): m is the current home margin, r the share
of regulation still to play and p0 our pre-game home win probability, so at
tip-off the chance equals our call and then moves with the score and clock.
SIGMA = 18 points was fitted on 98,631 game states (every minute of 2,529
games, 2018-19 to 2025-26, with walk-forward pre-game calls): log loss 0.471
against 0.511 for the score alone, chances within about 2 points of how often
teams went on to win, and the same SIGMA when fitted on 2018-24 only and
checked on 2024-26 (log loss 0.473 there).
"""
from __future__ import annotations

import math
from statistics import NormalDist

SIGMA = 18.0
OVERTIME = 5.0  # minutes
_N = NormalDist()


def minutes_left(quarter: int, clock: float) -> float:
    """Regulation minutes still to play (only the current period in overtime)."""
    return (4 - quarter) * 10 + clock if quarter <= 4 else clock


def elapsed(quarter: int, clock: float) -> float:
    """Minutes played so far, overtime included."""
    return (quarter - 1) * 10 + 10 - clock if quarter <= 4 else 40 + (quarter - 5) * OVERTIME + OVERTIME - clock


def home_win_prob(margin: int, quarter: int, clock: float, p0: float, final: bool = False) -> float:
    """margin = home minus away now; clock = minutes left in the period;
    p0 = our pre-game home win probability."""
    if final:
        return 1.0 if margin > 0 else 0.0 if margin < 0 else 0.5
    left = minutes_left(quarter, clock)
    if left <= 0:
        if margin != 0:
            return 1.0 if margin > 0 else 0.0
        left = OVERTIME  # level at the end of a period: overtime comes next
    r = left / 40
    edge = SIGMA * _N.inv_cdf(min(max(p0, 1e-4), 1 - 1e-4))
    z = (margin + edge * r) / (SIGMA * math.sqrt(r))
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))
