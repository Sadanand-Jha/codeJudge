# QuizSupport backend — production Docker deployment

This deploys **only the backend** (Express API + BullMQ worker) on the VPS.
The Next.js frontend stays on its current host (Vercel or similar) and reaches
the API through the existing domain tunnel.

## 1. Architecture

```
Browser ──► frontend host (existing)
                 │  BACKEND_URL / direct API calls
                 ▼
        domain tunnel (existing, manual)
                 │  http://127.0.0.1:8000
                 ▼
        ┌──────────────────────────────────────────────┐
        │ Docker network "quizsupport_internal"        │
        │                                              │
        │  api (Express, port 8000, no workers)        │
        │  worker (BullMQ consumers + scheduler)       │
        │  migrate (one-shot, runs pending SQL)        │
        │  postgres:16.15-alpine   (no host port)      │
        │  redis:7.4.11-alpine     (no host port)      │
        └──────────────────────────────────────────────┘
```

Why this shape:

- The API and worker use the same image but separate processes. The API has
  `DISABLE_BACKGROUND_WORKERS=1`, so BullMQ consumers and the end-of-quiz
  scheduler only run once (in the worker container). Running the API's default
  `node dist/server.js` without that flag would duplicate workers.
- PostgreSQL and Redis are private. Only the API is published, and only on
  `127.0.0.1`, so the tunnel is the single public ingress.
- Migrations run as a one-shot Compose service before the API/worker start.
  `ensureBaseSchema` applies `database/migrations/init.sql` first on a fresh
  database (the numbered migrations alter tables created there), then the
  normal runner applies only files not present in `schema_migration`. On an
  existing database it records `init.sql` if the base tables are present, so
  the file is never re-applied over live data.
- Headless Chromium (Playwright) is installed in the shared image because both
  the API (inline document export) and the worker (PDF queue) render papers.
  The worker gets a larger `/dev/shm` and a 60-second stop grace period.

No PM2: one Node process per container plus Docker restart policies is enough.
No Judge0 and no Docling containers are included (see section 12).

## 2. Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production stack (postgres, redis, migrate, api, worker) |
| `.env.example` | Variable names and safe placeholders |
| `.gitignore` | Keeps `.env` out of git |
| `code-judge-backend/Dockerfile` | Multi-stage API/worker/migrator image |
| `code-judge-backend/.dockerignore` | Excludes node_modules, dist, .env, Redis tarballs |
| `code-judge-backend/src/scripts/ensureBaseSchema.ts` | Fresh-DB `init.sql` bootstrap |
| `docs/docker-deployment.md` | This document |

Backend code changes made for container deployment (no feature changes):

- `src/config/databaseSsl.ts` + `src/config/database.ts` + `src/migrate.ts`:
  `DATABASE_SSL=false` is honored so the private Compose PostgreSQL (which has
  no TLS) can be used. Hosted databases keep TLS by default.
- `src/services/database/judge0.service.ts`: reads `JUDGE0_API_URL` and
  `JUDGE0_API_KEY` (defaults to `http://localhost:2358`, as before).
- `src/server.ts` and `src/queues/startWorker.ts`: graceful SIGTERM/SIGINT
  handling (HTTP drain, BullMQ `worker.close()`, Chromium shutdown, pool/Redis
  close).
- `src/queues/connection.ts`: shared connection close helper.

## 3. VPS prerequisites

- Ubuntu, Docker Engine 24+ with Compose v2.24+ (`env_file.required` support).
- 4 vCPU / 8 GB RAM minimum for this stack.
- 15 GB free disk (the backend image is ~1.3–1.6 GB because of Chromium).
- 2 GB swap recommended (image builds and Chromium spikes):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

Install Docker (official convenience script) if needed:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
# log out and back in for the group change
docker version && docker compose version
```

## 4. Configure environment

```bash
cd /path/to/codeJudge
cp .env.example .env
chmod 600 .env
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # AES_SECRET_KEY
openssl rand -hex 24   # PostgreSQL password
```

Edit `.env`:

- Set `POSTGRES_PASSWORD` and make `DATABASE_URL` use the same password.
  Percent-encode URL-reserved characters (`@ : / ? # [ ]`).
- Set `JWT_SECRET` and `AES_SECRET_KEY`.
- Set `FRONTEND_URL` to the real frontend origin(s), comma-separated.
- Keep `DATABASE_SSL=false` for the bundled PostgreSQL.
- Configure either `RESEND_API_KEY`/`RESEND_FROM` or SMTP values, otherwise OTP
  registration/login cannot send email.
- Configure one AI provider if AI features are used.
- Never commit `.env`.

The AES key must match the frontend's `NEXT_PUBLIC_AES_SECRET_KEY`; that is a
frontend environment change, not part of this container stack.

Changing `POSTGRES_PASSWORD` after the first boot does not change the role's
password inside the existing volume. Either keep the original value or update
it with `ALTER ROLE` before recreating the containers.

## 5. Existing production data

Never point a fresh empty database at the live frontend and assume it is fine.
Choose one path:

### A. Keep using a managed/external PostgreSQL

Set `DATABASE_URL` to the provider URL and `DATABASE_SSL=true` (or
`verify-full`), then skip the bundled database:

```bash
docker compose up -d redis
docker compose run --rm --no-deps migrate
docker compose up -d --no-deps api worker
```

Do not run `docker compose up -d` without a service list in this mode, because
it would also start the unused bundled `postgres` service. The extra idle
container is harmless, but `--no-deps` avoids confusion.

Compose still interpolates `POSTGRES_DB`, `POSTGRES_USER` and
`POSTGRES_PASSWORD` for the bundled service definition. Keep non-empty values
in `.env` even when you use an external database; the service is simply never
started.

### B. Import the existing database into the bundled PostgreSQL

1. On the old database, create a custom-format dump:
   ```bash
   pg_dump -Fc -f quizsupport.dump "$OLD_DATABASE_URL"
   ```
2. On the VPS, start only the database and Redis:
   ```bash
   docker compose up -d postgres redis
   docker compose ps          # wait for postgres to be healthy
   ```
3. Restore into the new (empty) database:
   ```bash
   docker compose exec -T postgres sh -c \
     'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists -Fc' \
     < quizsupport.dump
   ```
   `--clean --if-exists` is destructive. Only run it against the new, empty
   database, never against a database that already has data you need.
4. Start the stack. The migrator sees the imported `schema_migration` rows and
   applies only genuinely pending files:
   ```bash
   docker compose up -d
   ```

If the dump came from a database without a `schema_migration` table, inspect
the output of the migration service before declaring success. When in doubt,
restore into a scratch database first.

### Fresh-install migration repairs

A full migration run on an empty database exposed pre-existing drift between
`init.sql` and the numbered migrations. These fixes are required for fresh
installs and were verified together:

| File | Change |
|------|--------|
| `database/migrations/init.sql` | Added the missing `;` after `display_name`; removed the stale `quiz_student_response` definition (the real schema comes from `01_quiz.sql`); added the missing `subjects` lookup table and the subject seed rows used by `15_subject_chapters_insert.sql` |
| `database/migrations/01_quiz.sql` | `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` guards plus `ON CONFLICT` seeds, so it is safe after `init.sql` |
| `database/migrations/02_rooms.sql` | Moved `room_member_status` above `room_members`, whose FK references it |
| `database/migrations/12_quiz_relational_integrity.sql` | Removed the index on `quiz_report_jobs`, a table that no longer exists in the repo |
| `database/migrations/01_quiz.sql` | Added `quiz_participants.source`, the column used by migrations 12 and 37 |

Existing databases are not affected: their `schema_migration` rows prevent
these files from running again, and the bootstrap only records `init.sql`
when the base tables are already present. Take a backup before any upgrade.

## 6. Build and start

```bash
cd /path/to/codeJudge
export IMAGE_TAG="$(date +%Y%m%d-%H%M)"
docker compose config          # validates interpolation and YAML
docker compose build api       # worker/migrate reuse this image
docker compose up -d
docker compose ps
```

`docker compose up -d` runs in this order:

1. `postgres` and `redis` become healthy.
2. `migrate` runs `node dist/migrate.js` and exits 0.
3. `api` and `worker` start (they depend on migration completion).
4. The API health check calls `GET /health` (database readiness included).

The API publishes only `127.0.0.1:${API_PORT:-8000}:8000`. PostgreSQL and Redis
have no host ports.

## 7. Verify

```bash
docker compose ps
docker compose logs --tail=100 api worker migrate

curl -fsS http://127.0.0.1:8000/health
# {"status":"ok","timestamp":"...","database":"connected","internet":"disabled"}

docker compose exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) AS applied FROM schema_migration;"'
# Fresh database: 63 rows (init.sql + 62 migrations).

docker compose logs --tail=50 worker | grep -E "worker started|scheduler started|Redis connected"
```

Spot-check the proxy/secure-media and public pricing paths:

```bash
curl -fsS http://127.0.0.1:8000/api/v1/pricing | head -c 200; echo
curl -fsS http://127.0.0.1:8000/api/v1/brand/logo | head -c 120; echo
# JSON envelope with base64 data + mimeType is expected for the logo.
```

Check that nothing else is published:

```bash
docker compose ps --format 'table {{.Service}}\t{{.Ports}}'
# postgres/redis/migrate/worker: no host ports
# api: 127.0.0.1:8000->8000/tcp
```

Chromium smoke test inside the worker image:

```bash
docker compose exec -T worker node --input-type=module -e "
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
const page = await browser.newPage();
await page.setContent('<h1>ok</h1>');
console.log(await page.textContent('h1'));
await browser.close();
"
```

## 8. Tunnel ingress

The tunnel is intentionally **not** in Compose. Two supported layouts:

### Host-level tunnel (recommended)

Point the API hostname at the loopback publish:

```yaml
# /etc/cloudflared/config.yml (example)
tunnel: <TUNNEL-UUID>
credentials-file: /etc/cloudflared/<TUNNEL-UUID>.json
ingress:
  - hostname: api.quizsupport.com
    service: http://127.0.0.1:8000
  - service: http_status:404
```

For a dashboard-managed Cloudflare Tunnel, add a public hostname with service
`http://localhost:8000`.

The same works for any host-level tunnel (frp, Tailscale, nginx on the host,
etc.) that forwards to `127.0.0.1:8000`.

### Tunnel container

If the tunnel runs in Docker, attach it to the private network and use the
service name instead of a host port:

```bash
docker network connect quizsupport_internal <cloudflared-container>
# ingress service: http://api:8000
```

Do not publish the API on `0.0.0.0`.

### Frontend configuration

The existing frontend must reach the public API origin:

- Server/proxy config: `BACKEND_URL=https://api.quizsupport.com`
  (whatever hostname the tunnel serves).
- If the browser calls the API directly, set
  `NEXT_PUBLIC_BACKEND_URL=https://api.quizsupport.com/api` and keep
  `FRONTEND_URL` on the backend equal to the frontend origin.

Keep the same-origin `/api` rewrite on the frontend if possible; it avoids
cross-site cookie and CORS edge cases.

## 9. Operations

```bash
# status / logs
docker compose ps
docker compose logs -f --tail=200 api
docker compose logs -f --tail=200 worker

# stop / start (data volumes preserved)
docker compose stop
docker compose start

# recreate after an .env change (env is read at container create time)
docker compose up -d --force-recreate api worker

# update
git pull
export IMAGE_TAG="$(date +%Y%m%d-%H%M)"
docker compose build api
docker compose up -d
docker compose ps
docker compose logs --tail=100 migrate api worker

# validate
docker compose config

# resource usage
docker stats
```

Rebuild during low traffic. Playwright and npm install can still compete with
live PDF jobs. Do not change the PostgreSQL major version in place; dump and
restore into a new volume instead.

## 10. Backups and restore

PostgreSQL (logical backup via `pg_dump`):

```bash
mkdir -p backups
docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backups/quizsupport-$(date +%F-%H%M).dump"
```

Schedule it with cron and copy backups off the VPS. Test a restore regularly.

Restore (destructive; use a fresh database/container for drills):

```bash
docker compose exec -T postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists -Fc' \
  < backups/quizsupport-YYYY-MM-DD-HHMM.dump
```

Redis (queues, sessions, OTPs, rate limits) is configured with AOF
(`appendfsync everysec`) on the `redis_data` volume. For a consistent copy:

```bash
docker compose exec -T redis redis-cli SAVE
docker compose cp redis:/data ./backups/redis-$(date +%F-%H%M)
```

Also back up `.env` in a secrets manager. Volumes are named
`quizsupport_postgres_data` and `quizsupport_redis_data` (project name from
`docker-compose.yml`).

## 11. Rollback

Images are tagged with `IMAGE_TAG` (default `local`). Tag every release.

```bash
# previous release is still present locally
docker image ls | grep quizsupport-api
IMAGE_TAG=20261024-1200 docker compose up -d
```

If the previous release predates new database migrations, restore the database
dump taken before the deploy. There are no down-migrations. `docker compose
down` keeps volumes; `docker compose down -v` deletes data and must never be
used casually.

## 12. Optional services not deployed

### Judge0

The app currently hardcodes Judge0 to `http://localhost:2358` unless
`JUDGE0_API_URL` is set. Focus mode blocks the `/problems` and `/editor` pages,
so code execution is not part of the current public surface. Judge0 CE needs
its own PostgreSQL, Redis, isolate/containers, privileged access, and roughly
2+ GB RAM. Running it on this 4 vCPU / 8 GB box next to the API/worker is not
recommended. If needed, deploy it on a separate host and set
`JUDGE0_API_URL` (and `JUDGE0_API_KEY` if auth is enabled).

### Docling

Docling is optional. Without it the backend falls back to local PDF/DOCX text
extraction; AI document import still works for supported formats. If you run
Docling on the host, add this to `api` and `worker` in Compose and set
`DOCLING_URL=http://host.docker.internal:5001`:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

Do not point `DOCLING_URL` at `localhost`: inside the container that is the
container itself.

## 13. Resource allocation

| Service | CPU limit | Memory limit | Reservation | Notes |
|---------|-----------|--------------|-------------|-------|
| api | 1.5 | 2 GB | 384 MB | Express + optional inline Chromium export |
| worker | 1.5 | 2 GB | 384 MB | BullMQ + up to 2 Chromium PDFs |
| postgres | 1.0 | 1 GB | 256 MB | 150 connections, 256 MB shared buffers |
| redis | 0.5 | 384 MB | 64 MB | maxmemory 256 MB, no eviction |
| migrate | 1.0 | 512 MB | — | transient |

Total limits are ~5.4 GB, leaving ~2.6 GB for Ubuntu, Docker, logs and page
cache on an 8 GB host. If the host starts swapping under PDF load:

- Set `PDF_QUEUE_CONCURRENCY=1` in `.env` and recreate the worker.
- Keep the 2 GB swap file.
- Do not add Docling/Judge0 locally without reducing these limits.

## 14. Security and firewall

- The API is published only on `127.0.0.1`. PostgreSQL and Redis have no host
  ports.
- UFW: allow SSH only. Do **not** allow 8000/5432/6379.

  ```bash
  sudo ufw allow OpenSSH
  sudo ufw enable
  sudo ufw status verbose
  ```

- VPS-provider firewall: SSH only. A Cloudflare Tunnel uses outbound
  connections and does not need inbound 443.
- `.env` is `chmod 600` and excluded from Docker build contexts and git.
- Containers run as the non-root `node` user; app containers set
  `no-new-privileges`.
- Secrets are passed at runtime, not baked into images.
- Rotating `JWT_SECRET` logs out all users. Rotating `AES_SECRET_KEY` also
  requires updating the frontend's `NEXT_PUBLIC_AES_SECRET_KEY` and rebuilding
  the frontend.
- Access to the Docker socket is root-equivalent. Restrict SSH access and keep
  the host patched.

## 15. Troubleshooting

| Symptom | Check |
|---------|-------|
| API unhealthy, logs show SSL error | Set `DATABASE_SSL=false` for the bundled PostgreSQL |
| API unhealthy, `password authentication failed` | `POSTGRES_PASSWORD` and `DATABASE_URL` do not match |
| Migration service exits non-zero | `docker compose logs migrate`; take a backup before retrying |
| Worker restarts / OOM | Lower `PDF_QUEUE_CONCURRENCY`, check `docker stats` and swap |
| PDF export fails | Run the Chromium smoke test in section 7; check worker logs |
| OTP email missing | Configure Resend or SMTP; check `docker compose logs worker` |
| Tunnel returns 502 | API is not healthy or tunnel points to the wrong port |
| Port 8000 already in use | Change `API_PORT` in `.env` and update the tunnel |

## 16. Manual steps / blockers

1. Fill `.env` with real secrets, database password, email and AI credentials.
2. Decide whether to keep the existing managed PostgreSQL or import into the
   bundled one (section 5). Do not start the new stack against live data
   without a tested backup.
3. Point the existing tunnel hostname at `http://127.0.0.1:8000` (or
   `http://api:8000` from a tunnel container).
4. Update the external frontend's `BACKEND_URL` (and direct API URL/cookies if
   applicable) to the tunnel hostname.
5. Configure cron backups off the VPS and test a restore.
6. Optionally configure Docling/Judge0 externally (section 12).
7. Retire the old backend deployment only after the tunnel and frontend have
   been verified end-to-end.
