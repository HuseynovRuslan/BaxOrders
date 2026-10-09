#!/usr/bin/env bash
# Nightly database backup, run as root from /etc/cron.d/baxorders:
#   /opt/baxorders/current/deploy/scripts/backup.sh
#
# Produces, in /opt/baxorders/backups:
#   baxorders-db-<stamp>.dump     pg_dump custom format, taken inside the db container
#   baxorders-db-<stamp>.sha256   its checksum, which restore-test.sh verifies before trusting the file
#
# The dump is taken over the container's unix socket as the postgres OS user, so no password appears on any
# command line or in any environment this script controls.
#
# Same disk as the database. That is better than nothing and worse than a real disaster plan: copy this
# directory off the machine when there is somewhere to copy it to.
#
# Retention: 30 days, and only over the files this script writes. Dumps taken by hand before a correction are
# named differently on purpose and are never swept away by it.
set -euo pipefail

base=/opt/baxorders
target=$base/backups
retention_days=30

compose() { docker compose --env-file "$base/.env" -f "$base/current/deploy/compose.yml" "$@"; }

mkdir -p "$target"
umask 077
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
dump="$target/baxorders-db-$stamp.dump"

db_name="$(grep -E '^APP_DB_NAME=' "$base/.env" | cut -d= -f2)"
db_name="${db_name:-baxorders}"

compose exec -T db pg_dump --format=custom --compress=6 --no-owner --no-privileges \
        -U postgres "$db_name" > "$dump.partial"
mv "$dump.partial" "$dump"

# Readable before it is trusted: a backup nobody has opened is a guess, not a backup.
compose exec -T db pg_restore --list < "$dump" > /dev/null

sha256sum "$dump" > "$dump.sha256"

# Only this script's own files age out; anything named by a human stays.
find "$target" -maxdepth 1 -name 'baxorders-db-*.dump'        -mtime +$retention_days -delete
find "$target" -maxdepth 1 -name 'baxorders-db-*.dump.sha256' -mtime +$retention_days -delete

echo "$(date -u +%FT%TZ) backup ok: $dump ($(stat -c%s "$dump") bytes)"
