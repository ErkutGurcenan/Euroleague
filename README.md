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

# 2. Run the API (http://localhost:8000)
cd ../api
../pipeline/.venv/bin/uvicorn main:app --reload

# 3. Run the frontend (http://localhost:3000)
cd ../web
npm install && npm run dev
```
