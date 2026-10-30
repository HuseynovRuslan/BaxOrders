#!/usr/bin/env bash
# Build and start this release on the VPS. Run ON THE SERVER, from the release directory:
#
#   /opt/baxorders/releases/<id>/deploy/scripts/deploy.sh <id>
#
# It never touches another project: everything it starts is named `baxorders`, and the only thing it shares is
# the reverse proxy's network, which it joins and does not configure. The shared Caddyfile is edited by hand,
# once, following deploy/caddy-block — not by this script, because that file belongs to every project on the host.
set -euo pipefail

release="${1:?usage: deploy.sh <release-id>}"
root=/opt/baxorders
here="$root/releases/$release"
compose="$here/deploy/compose.yml"
env_file="$root/.env"

[[ -d "$here" ]] || { echo "no such release: $here" >&2; exit 1; }
[[ -f "$env_file" ]] || { echo "missing $env_file — copy deploy/.env.example and fill it in" >&2; exit 1; }

commit="$(cat "$here/RELEASE" 2>/dev/null || echo unknown)"

run() { docker compose --env-file "$env_file" -f "$compose" "$@"; }

echo "==> building images ($release)"
IMAGE_TAG="$release" BAXORDERS_COMMIT="$commit" run build

echo "==> starting the database"
IMAGE_TAG="$release" BAXORDERS_COMMIT="$commit" run up -d db

echo "==> starting the application"
IMAGE_TAG="$release" BAXORDERS_COMMIT="$commit" run up -d api web

echo "==> pointing current at this release"
ln -sfn "$here" "$root/current"

echo "==> waiting for health"
for _ in $(seq 1 60); do
	if curl -fsS "http://127.0.0.1:${APP_HTTP_PORT:-8050}/health" >/dev/null 2>&1; then
		echo "healthy"
		exit 0
	fi
	sleep 2
done

echo "the stack did not answer /health in time" >&2
run ps
exit 1
