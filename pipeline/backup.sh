#!/usr/bin/env bash
# Back up the SQLite database: consistent online copy (safe while the API
# reads and the refresh writes), integrity-checked, gzipped, last N kept.
#
# Usage: pipeline/backup.sh [KEEP]     (default KEEP=4)
#
# Restore: stop the API, then
#   gunzip -c ~/backups/euroleague/euroleague-YYYY-MM-DD.db.gz > db/euroleague.db
set -euo pipefail

cd "$(dirname "$0")"
keep="${1:-4}"
src="$(cd .. && pwd)/db/euroleague.db"
dest_dir="$HOME/backups/euroleague"
stamp="$(date +%Y-%m-%d)"
tmp="$dest_dir/.euroleague-$stamp.db"
out="$dest_dir/euroleague-$stamp.db.gz"
mkdir -p "$dest_dir"

echo "=== $(date -Is) backup -> $out ==="
.venv/bin/python - "$src" "$tmp" <<'EOF'
import sqlite3, sys
src, dst = sqlite3.connect(sys.argv[1]), sqlite3.connect(sys.argv[2])
with dst:
    src.backup(dst)
result = dst.execute("PRAGMA integrity_check").fetchone()[0]
games = dst.execute("SELECT count(*) FROM games").fetchone()[0]
src.close(); dst.close()
if result != "ok":
    sys.exit(f"integrity check failed: {result}")
print(f"integrity ok, {games} games")
EOF
gzip -c "$tmp" > "$out.part" && mv "$out.part" "$out"
rm -f "$tmp"
ls -1t "$dest_dir"/euroleague-*.db.gz | tail -n +"$((keep + 1))" | xargs -r rm -f
echo "kept: $(ls -1 "$dest_dir"/euroleague-*.db.gz | wc -l), size $(du -h "$out" | cut -f1)"
