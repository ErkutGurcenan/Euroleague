# Euroleague API notes

Base URL: `https://api-live.euroleague.net`
Swagger UI: https://api-live.euroleague.net/swagger/index.html (spec paths are
hidden without an API key, but the endpoints below are public and verified).

Competition code `E` = EuroLeague (`U` = EuroCup). Season code = `E` + start
year, e.g. `E2025` = 2025-26 season.

## Verified endpoints (v2)

All under `/v2/competitions/E/seasons/{seasonCode}`:

| Endpoint | Returns | Notes |
|---|---|---|
| `/../seasons` | all seasons + winners | list under `data` |
| `/clubs?limit=&offset=` | clubs incl. crest URL, country, venue, city | `{data: [], total: N}` |
| `/games?limit=&offset=` | games incl. scores, quarter partials, phase, round | `{data: [], total: N}` |
| `/rounds` | rounds with date windows | 2025-26 has 47 rounds (RS 1–38, playoffs, Final Four) |
| `/rounds/{n}/standings` | standings groups as of round n | list of `{group, standings: [{club, data}]}` |
| `/people?limit=&offset=` | roster entries (players, coaches, staff) | `type: "J"` = player, `E` = coach, `A` = assistant coach; includes dorsal, position, height, birth date |

## Payload notes

- Standings row `data`: position, gamesPlayed, gamesWon, gamesLost,
  pointsFavour, pointsAgainst, qualified.
- Game sides are `local` (home) and `road` (away), each with `club`, `score`,
  and `partials` (partials1..4 + extraPeriods).
- Game has `played`, `utcDate`, `round`, `phaseType.code` (RS / PO / FF).
- People entries are per club-season stints (startDate/endDate, active flag);
  a player traded mid-season appears twice.

## Etiquette

Public but undocumented-for-commercial-use API: ingest on a schedule into our
own DB, never proxy per page view. Keep request rate modest.
