# Euroleague Stats

A Euroleague basketball web application: standings, fixtures, team & player stats,
rosters — with derived analytics and game predictions planned.

## Architecture

```
pipeline/   Python ingestion jobs: Euroleague API -> database
api/        FastAPI backend serving the database to the frontend
web/        Next.js (TypeScript + Tailwind) frontend
db/         Schema notes, API notes, local SQLite database (dev)
```

Data source: the official Euroleague API at `api-live.euroleague.net`
(see [db/API_NOTES.md](db/API_NOTES.md)).

Local development uses SQLite; the schema is written with SQLAlchemy and is
Postgres-compatible for production.

## Quick start

```bash
# 1. Ingest data (creates db/euroleague.db)
cd pipeline
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python -m euroleague_pipeline.ingest --season E2025
.venv/bin/python -m euroleague_pipeline.ingest_details --season E2025
# Season awards are editorial (no API endpoint): data/awards.json -> database
.venv/bin/python -m euroleague_pipeline.seed_awards
# Keep the current season fresh (run nightly from cron; also re-applies awards):
./refresh.sh
# The injury report is editorial (db/injuries.json, live; see pipeline/INJURY_UPDATES.md),
# summarized from the BasketNews EuroLeague Injury Report (the API has no injuries).

# 2. Run the API (http://localhost:8000)
cd ../api
../pipeline/.venv/bin/uvicorn main:app --reload

# 3. Run the frontend (http://localhost:3000)
cd ../web
npm install && npm run dev   # development, hot reload
./serve.sh                   # production: build + (re)start on :3000
```

## Backups

`pipeline/backup.sh` (weekly from cron, Sundays 03:00) makes a consistent
online copy of the database, checks its integrity, gzips it to
`~/backups/euroleague/` and keeps the last four.

Restore: stop the API, then
`gunzip -c ~/backups/euroleague/euroleague-YYYY-MM-DD.db.gz > db/euroleague.db`.
To rebuild from scratch instead, re-run the ingest steps for each season and
`seed_awards`; everything else comes from the API.
