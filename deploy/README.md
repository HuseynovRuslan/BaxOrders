# Deploying BaxOrders

**Live: <https://order.qrlog.az>** · host `94.20.153.137` (`srv323`), user `deploy`, directory `/opt/baxorders`.

The VPS is **shared**. Several of the owner's systems run on it, each as its own Compose stack under `/opt`,
and one of them owns the front door. Everything below is written so that nothing this project does can reach
another one.

## The shape of it

```
internet → :443  attendanceqr-caddy-1  (the shared Caddy container — NOT nginx, NOT on the host)
                 └─ order.qrlog.az → baxorders-web:8080   (by container name, over attendanceqr_default)
                                      ├─ /api/*, /health → baxorders-api:8080
                                      └─ everything else → the built SPA, with history fallback
                                                           baxorders-api → db (postgres:18, internal only)
```

Three rules this host enforces, learned the hard way by the projects already on it:

1. **Do not install a reverse proxy on the host.** Ports 80 and 443 belong to the `attendanceqr-caddy-1`
   container, which serves the whole `qrlog.az` family with on-demand TLS. Anything else binding them takes
   every site down.
2. **Never `restart` the shared Caddy — `validate`, then `reload`.** A bad config on restart stops every site;
   a failed reload leaves the running config in place.
3. **Only the web container joins the shared network.** The API and the database are on this stack's private
   network and publish no port. PostgreSQL is not reachable from the host, let alone the internet.

## First deployment

```bash
# 1. the release, from the workstation (no git remote, so the tree is copied)
release=$(date -u +%Y%m%dT%H%M%SZ)
rsync -az --delete --exclude .git --exclude node_modules --exclude bin --exclude obj \
      ./ deploy@94.20.153.137:/opt/baxorders/releases/$release/
ssh deploy@94.20.153.137 "git -C . rev-parse HEAD" > /dev/null   # record the commit in RELEASE

# 2. the secrets, on the server only
ssh deploy@94.20.153.137
cp /opt/baxorders/releases/$release/deploy/.env.example /opt/baxorders/.env
chmod 600 /opt/baxorders/.env
# fill in POSTGRES_PASSWORD and APP_DB_PASSWORD with generated values — openssl rand -base64 24

# 3. build and start
/opt/baxorders/releases/$release/deploy/scripts/deploy.sh $release

# 4. the data (see below)

# 5. the front door — once, by hand, following deploy/caddy-block
```

Later deployments are steps 1 and 3 only.

## The data

Production carries the real dataset. It arrives as a PostgreSQL custom-format dump of the development database
and is restored into the production one; **the development database is only ever read**.

```bash
# on the workstation — read-only on the source
pg_dump --format=custom --no-owner --no-privileges \
        --host=localhost --port=55438 --username=baxorders --dbname=baxorders_dev \
        --file=baxorders-$(date -u +%Y%m%dT%H%M%SZ).dump

scp baxorders-*.dump deploy@94.20.153.137:/tmp/

# on the server — into this stack's own database, as its own role
docker compose --env-file /opt/baxorders/.env -f /opt/baxorders/current/deploy/compose.yml \
  cp /tmp/baxorders-*.dump db:/tmp/restore.dump
docker compose ... exec -T db pg_restore --username=postgres --dbname=baxorders \
  --no-owner --role=baxorders --clean --if-exists /tmp/restore.dump
```

Then check three things, because a restore that half-worked looks exactly like one that worked:

- the schema is current — the last row of `"__EFMigrationsHistory"` matches the newest migration in
  `src/BaxOrders.Infrastructure/Persistence/Migrations/`;
- the counts are the ones the development database has (orders, lines, the known-amount total);
- the dashboard renders them.

## Migrations

The API applies migrations on startup **only in Development** (`Program.cs`), so nothing migrates itself here.
A deployment that needs a schema change applies it explicitly before starting the new API:

```bash
dotnet ef migrations script <from> <to> --idempotent --project src/BaxOrders.Infrastructure \
       --startup-project src/BaxOrders.Api --output migrate.sql
# review it, then run it against the production database through the db container
```

A deployment whose migrations are already in the restored dump — the ordinary case for the first one — applies
nothing.

## Checking a deployment

```bash
curl -fsS https://order.qrlog.az/health                      # the API, through the whole chain
curl -fsSo /dev/null -w '%{http_code}\n' https://order.qrlog.az/   # the SPA
docker compose --env-file /opt/baxorders/.env -f /opt/baxorders/current/deploy/compose.yml ps
```

And, because the host is shared, that the neighbours are still answering:
`https://woodmark.qrlog.az`, `https://book.qrlog.az`, `https://prizma.qrlog.az`, `https://bax.qrlog.az`.

## Backups

`/etc/cron.d/baxorders`, installed from `deploy/cron.baxorders`:

- **03:20 every night** — `deploy/scripts/backup.sh` dumps the database inside its container, checks the dump is
  readable with `pg_restore --list`, writes a `.sha256` beside it, and ages out its own files after 30 days.
  Dumps taken by hand before a correction are named differently and are never swept away by it.
- **04:40 every Sunday** — `deploy/scripts/restore-test.sh` takes the newest dump, verifies its checksum,
  restores it into a throwaway database, counts what came back and drops it again. Production is never touched.
  A backup that has never been restored is a hope rather than a backup.

Both write to `/opt/baxorders/backups` and log beside the dumps. Same disk as the database: copy that directory
off the machine when there is somewhere to copy it to.

## What is not here yet

- **The backups are on the same disk as the database.** That survives a mistake, not a dead machine.
- **No TLS of its own to worry about.** The shared Caddy obtains and renews the certificate on demand.
