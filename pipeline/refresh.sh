#!/usr/bin/env bash
# Nightly refresh of the current season: games/standings/rosters, then
# box scores, shots and play-by-play for newly finished games.
#
# Usage: pipeline/refresh.sh [SEASON]   (default: season of today's date,
#        which rolls over in August, e.g. 2026-10 -> E2026)
#
# After the first played game of a NEW season lands, restart the API so it
# picks the new season as its default.
set -euo pipefail

cd "$(dirname "$0")"

if [[ $# -ge 1 ]]; then
  season="$1"
else
  year=$(date +%Y)
  month=$(date +%-m)
  (( month < 8 )) && year=$((year - 1))
  season="E${year}"
fi

exec 9>/tmp/euroleague-refresh.lock
if ! flock -n 9; then
  echo "$(date -Is) refresh already running, skipping"
  exit 0
fi

echo "=== $(date -Is) refresh ${season} ==="
.venv/bin/python -m euroleague_pipeline.ingest --season "$season"
.venv/bin/python -m euroleague_pipeline.ingest_details --season "$season"
.venv/bin/python -m euroleague_pipeline.stints --season "$season"
.venv/bin/python -m euroleague_pipeline.impact
.venv/bin/python -m euroleague_pipeline.seed_awards
echo "=== $(date -Is) refresh ${season} done ==="
