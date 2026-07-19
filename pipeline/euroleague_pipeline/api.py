"""Thin client for the public Euroleague API (see db/API_NOTES.md)."""
from __future__ import annotations

import time
from typing import Any, Iterator

import requests

BASE_URL = "https://api-live.euroleague.net/v2"
PAGE_SIZE = 500
REQUEST_DELAY_S = 0.5  # be polite: this is a public, undocumented API


class EuroleagueApi:
    def __init__(self, competition: str = "E") -> None:
        self.competition = competition
        self.session = requests.Session()
        self.session.headers["Accept"] = "application/json"

    def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        url = f"{BASE_URL}/competitions/{self.competition}{path}"
        resp = self.session.get(url, params=params, timeout=30)
        resp.raise_for_status()
        time.sleep(REQUEST_DELAY_S)
        return resp.json()

    def _paginate(self, path: str) -> Iterator[dict]:
        offset = 0
        while True:
            payload = self._get(path, {"limit": PAGE_SIZE, "offset": offset})
            items = payload.get("data", [])
            yield from items
            offset += len(items)
            if offset >= payload.get("total", 0) or not items:
                return

    def clubs(self, season: str) -> Iterator[dict]:
        return self._paginate(f"/seasons/{season}/clubs")

    def games(self, season: str) -> Iterator[dict]:
        return self._paginate(f"/seasons/{season}/games")

    def people(self, season: str) -> Iterator[dict]:
        return self._paginate(f"/seasons/{season}/people")

    def rounds(self, season: str) -> list[dict]:
        payload = self._get(f"/seasons/{season}/rounds")
        return payload.get("data", payload) if isinstance(payload, dict) else payload

    def standings(self, season: str, round_: int) -> list[dict]:
        return self._get(f"/seasons/{season}/rounds/{round_}/standings")
