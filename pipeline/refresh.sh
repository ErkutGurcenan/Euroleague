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
# live.py takes the same lock to import a game right after the final buzzer:
# wait for it (up to 15 minutes) rather than skipping the night
if ! flock -w 900 9; then
  echo "$(date -Is) refresh already running, skipping"
  exit 0
fi

echo "=== $(date -Is) refresh ${season} ==="
.venv/bin/python -m euroleague_pipeline.ingest --season "$season"
.venv/bin/python -m euroleague_pipeline.ingest_details --season "$season"
.venv/bin/python -m euroleague_pipeline.stints --season "$season"
.venv/bin/python -m euroleague_pipeline.impact
.venv/bin/python -m euroleague_pipeline.ratings
.venv/bin/python -m euroleague_pipeline.simulate --season "$season"
.venv/bin/python -m euroleague_pipeline.predict
.venv/bin/python -m euroleague_pipeline.ai_challenger
.venv/bin/python -m euroleague_pipeline.seed_awards
./warm_caches.sh
echo "=== $(date -Is) refresh ${season} done ==="
