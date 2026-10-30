#!/usr/bin/env bash
# Weekly restore drill, run as root from /etc/cron.d/baxorders:
#   /opt/baxorders/current/deploy/scripts/restore-test.sh
#
# Takes the newest nightly dump, checks its recorded checksum, restores it into a throwaway database and counts
# what came back. Production is never touched: the drill creates its own database and drops it at the end.
#
# A backup that has never been restored is a hope. This is what turns it into a fact, once a week, by itself.
set -euo pipefail

base=/opt/baxorders
target=$base/backups
probe=baxorders_restore_drill

compose() { docker compose --env-file "$base/.env" -f "$base/current/deploy/compose.yml" "$@"; }

newest="$(find "$target" -maxdepth 1 -name 'baxorders-db-*.dump' -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)"
[[ -n "$newest" ]] || { echo "$(date -u +%FT%TZ) restore drill FAILED: no dump to test" >&2; exit 1; }

echo "$(date -u +%FT%TZ) testing $newest"
sha256sum --check --status "$newest.sha256" || {
  echo "$(date -u +%FT%TZ) restore drill FAILED: checksum mismatch on $newest" >&2; exit 1; }

compose exec -T db psql -U postgres -q -c "DROP DATABASE IF EXISTS $probe;"
compose exec -T db psql -U postgres -q -c "CREATE DATABASE $probe;"

# The drill proves the dump can be read back; ownership is irrelevant to that, so it restores as the superuser.
compose exec -T db pg_restore --username=postgres --dbname="$probe" --no-owner < "$newest"

read -r lines orders amount <<<"$(compose exec -T db psql -U postgres -d "$probe" -t -A -F' ' -c \
  'select (select count(*) from "OrderRequestItems"), (select count(*) from "OrderRequests"),
          (select round(sum("Quantity"*"UnitPrice"),5) from "OrderRequestItems");')"

compose exec -T db psql -U postgres -q -c "DROP DATABASE IF EXISTS $probe;"

[[ "${lines:-0}" -gt 0 && "${orders:-0}" -gt 0 ]] || {
  echo "$(date -u +%FT%TZ) restore drill FAILED: restored database is empty" >&2; exit 1; }

echo "$(date -u +%FT%TZ) restore drill ok: $orders orders · $lines lines · $amount AZN"
