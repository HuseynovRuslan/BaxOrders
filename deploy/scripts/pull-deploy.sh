#!/usr/bin/env bash
# Deploys main from GitHub, pulled by the VPS itself: GitHub's runners cannot reach this host's SSH port (the network
# in front of it drops them), so the server asks instead. Cron runs it every two minutes as deploy:
#   1-59/2 * * * * /home/deploy/bin/baxorders-pull-deploy >> /home/deploy/.baxorders-pull-deploy/log 2>&1
# A new commit on main goes live once the Deploy workflow's checks ("frontend", "backend") have passed on it.
# Never automatically: a commit that changes a migration — production migrates by hand (deploy/README.md,
# "Migrations"), so such a commit waits for the owner. A commit whose checks or deploy failed is left alone until the
# next push; QRLog's clock-in peaks are waited out. The copy cron runs lives outside any release, so a push cannot
# change these rules for itself:
#   install -m 755 deploy/scripts/pull-deploy.sh ~deploy/bin/baxorders-pull-deploy
set -euo pipefail

repo=HuseynovRuslan/BaxOrders
root=/opt/baxorders
state="$HOME/.baxorders-pull-deploy"
mkdir -p "$state"
exec 9>"$state/lock"
flock -n 9 || exit 0
say() { echo "$(date '+%F %T') $*"; }

sha="$(git ls-remote "https://github.com/$repo.git" refs/heads/main 2>/dev/null | cut -f1)" || exit 0
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || exit 0
short="${sha:0:7}"
running="$(cat "$root/current/RELEASE" 2>/dev/null || echo unknown)"
[ "$running" = "$short" ] && exit 0
for done in deployed refused; do
  [ "$sha" = "$(cat "$state/$done" 2>/dev/null)" ] && exit 0
done

api="https://api.github.com/repos/$repo"
checks="$(curl -fsS -H 'Accept: application/vnd.github+json' "$api/commits/$sha/check-runs?per_page=50" 2>/dev/null)" || exit 0
verdict="$(jq -r '[.check_runs[] | select(.name == "frontend" or .name == "backend")] as $r
  | if ($r | length) < 2 or any($r[]; .status != "completed") then "pending"
    elif all($r[]; .conclusion == "success") then "passed" else "failed" end' <<<"$checks")"
case "$verdict" in
  pending) exit 0 ;;
  failed)
    say "$short: checks failed on GitHub, not deployed"
    echo "$sha" > "$state/refused"
    exit 0 ;;
esac

# What changed since the release that runs now. A migration means a schema change production must not get unseen.
compare="$(curl -fsS -H 'Accept: application/vnd.github+json' "$api/compare/$running...$sha" 2>/dev/null)" || exit 0
migrations="$(jq -r '[.files[]?.filename | select(test("/Persistence/Migrations/"))] | length' <<<"$compare")"
if [ "$(jq -r '.status // "unknown"' <<<"$compare")" = "unknown" ] || [ "$migrations" != "0" ]; then
  say "$short: changes a migration (or cannot be compared with $running); not deployed — migrate by hand first"
  echo "$sha" > "$state/refused"
  exit 0
fi

# QRLog shares this host; about 114 people clock in at these hours (server clock, Asia/Baku). Wait them out.
now=$((10#$(date +%H%M)))
if { [ "$now" -ge 730 ] && [ "$now" -lt 930 ]; } || { [ "$now" -ge 1700 ] && [ "$now" -lt 1900 ]; }; then
  exit 0
fi

release="$(date -u +%Y%m%dT%H%M%SZ)"
here="$root/releases/$release"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
curl -fsSL "https://codeload.github.com/$repo/tar.gz/$sha" -o "$work/source.tgz"
mkdir -p "$here.unpacking"
tar -xzf "$work/source.tgz" -C "$here.unpacking" --strip-components=1
echo "$short" > "$here.unpacking/RELEASE"
mv "$here.unpacking" "$here"

say "$short: checks passed, deploying as release $release"
if bash "$here/deploy/scripts/deploy.sh" "$release"; then
  echo "$sha" > "$state/deployed"
  say "$short: live"
else
  echo "$sha" > "$state/refused"
  say "$short: deploy.sh failed; roll back with the previous release's deploy.sh (deploy/README.md)"
fi
