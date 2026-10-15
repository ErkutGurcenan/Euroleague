#!/usr/bin/env bash
# Build the frontend and (re)start the production server on port 3000.
#
# Usage: web/serve.sh            build, then restart
#        web/serve.sh --no-build restart only (e.g. after a reboot)
#
# The server is stopped during the build (~40s on this box) so the build
# and the server don't compete for the instance's ~1 GB of RAM.
set -euo pipefail

cd "$(dirname "$0")"
export PATH="$HOME/.local/node22/bin:/usr/sbin:$PATH"
export NEXT_TELEMETRY_DISABLED=1
LOG_DIR="$HOME/ingest-logs"
mkdir -p "$LOG_DIR"

pid=$(ss -ltnpH 'sport = :3000' | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2 || true)
if [[ -n "$pid" ]]; then
  kill "$pid"
  for _ in $(seq 1 20); do
    ss -ltnH 'sport = :3000' | grep -q . || break
    sleep 0.5
  done
fi

if [[ "${1:-}" != "--no-build" ]]; then
  NODE_OPTIONS=--max-old-space-size=1024 npm run build
fi

NODE_OPTIONS=--max-old-space-size=400 setsid nohup npm start \
  > "$LOG_DIR/web.log" 2>&1 < /dev/null &

for _ in $(seq 1 30); do
  curl -sf -o /dev/null -m 5 http://localhost:3000/teams && { echo "serving on :3000"; exit 0; }
  sleep 1
done
echo "server did not come up, see $LOG_DIR/web.log" >&2
exit 1
