#!/usr/bin/env bash
# After new data is imported (refresh.sh nightly, live.py after a final
# buzzer): mark the data as changed, so the API drops its in-process caches,
# then rebuild the slow ones so no visitor waits for them (the About page's
# site-wide counts alone take ~15 s cold). Also loads the busiest pages once.
set -u
cd "$(dirname "$0")"
touch ../db/data_version
for path in /api/meta /api/lineups /api/impact /api/games/notable; do
  curl -s -o /dev/null -m 180 "http://127.0.0.1:8000$path" || true
done
for path in / /standings /games /predictions; do
  curl -s -o /dev/null -m 60 "http://127.0.0.1:3000$path" || true
done
echo "$(date -Is) caches warmed"
