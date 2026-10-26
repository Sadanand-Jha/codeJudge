#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./scripts/import-db.sh [dump-file]
#   FORCE=1 ./scripts/import-db.sh [dump-file]   # replace an existing database
#   NO_TUNNEL=1 ./scripts/import-db.sh           # local testing: skip cloudflared
#   RUN_MIGRATE=0 ./scripts/import-db.sh         # skip migrations after restore
#
# The script starts PostgreSQL/Redis, restores the custom-format dump into the
# Compose PostgreSQL container, applies migrations, and starts the API/tunnel.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$COMPOSE_DIR"

DUMP_PATH="${1:-database/dumps/quizsupport.dump}"
FORCE="${FORCE:-0}"
NO_TUNNEL="${NO_TUNNEL:-0}"
RUN_MIGRATE="${RUN_MIGRATE:-1}"

# These migrations are already baked into database/migrations/init.sql. Older
# databases never recorded them, so mark them as applied before running the
# migration runner; otherwise it retries CREATE statements that already exist.
LEGACY_INIT_MIGRATIONS=(
  01_quiz.sql
  02_rooms.sql
  03_follows.sql
  04_quiz_attempt.sql
  06_quiz_response_is_attempted.sql
  07_quiz_attempt_proctoring.sql
  14_subject_chapters.sql
  35_plan_price_history.sql
  36_quiz_code_unique.sql
  38_user_feedback.sql
  45_drop_chk_quiz_marks.sql
  45_quiz_attempt_soft_delete.sql
  60_pricing_catalog.sql
  question_creation.sql
)

record_legacy_init_migrations() {
  local init_recorded
  init_recorded="$("${compose[@]}" exec -T postgres psql -U "$db_user" -d "$db_name" -tAc \
    "SELECT 1 FROM schema_migration WHERE filename = 'init.sql' LIMIT 1" 2>/dev/null | tr -d '[:space:]' || true)"

  if [ "$init_recorded" != "1" ]; then
    return 0
  fi

  echo "==> Recording legacy migrations already covered by init.sql"
  for migration in "${LEGACY_INIT_MIGRATIONS[@]}"; do
    "${compose[@]}" exec -T postgres psql -U "$db_user" -d "$db_name" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO schema_migration (filename, checksum) VALUES ('${migration}', 'legacy-init') ON CONFLICT (filename) DO NOTHING;" >/dev/null
  done
}

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose v2 is required" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo ".env not found in $COMPOSE_DIR" >&2
  exit 1
fi

if [ ! -f "$DUMP_PATH" ]; then
  echo "dump not found: $DUMP_PATH" >&2
  exit 1
fi

if [ ! -s "$DUMP_PATH" ]; then
  echo "dump is empty: $DUMP_PATH" >&2
  exit 1
fi

compose=(docker compose)

echo "==> Validating compose configuration"
"${compose[@]}" config --quiet

echo "==> Building application image"
"${compose[@]}" build api migrate

echo "==> Starting PostgreSQL and Redis"
"${compose[@]}" up -d postgres redis

echo "==> Waiting for PostgreSQL to become healthy"
postgres_id="$("${compose[@]}" ps -q postgres)"
status=""
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$postgres_id" 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    break
  fi
  sleep 2
done

if [ "$status" != "healthy" ]; then
  echo "PostgreSQL did not become healthy (status: ${status:-unknown})" >&2
  "${compose[@]}" logs --tail=50 postgres >&2 || true
  exit 1
fi

db_user="$("${compose[@]}" exec -T postgres sh -lc 'printf "%s" "$POSTGRES_USER"')"
db_name="$("${compose[@]}" exec -T postgres sh -lc 'printf "%s" "$POSTGRES_DB"')"

if [ -z "$db_user" ] || [ -z "$db_name" ]; then
  echo "POSTGRES_USER or POSTGRES_DB is not set in the postgres container" >&2
  exit 1
fi

echo "==> Validating dump: $DUMP_PATH"
"${compose[@]}" exec -T postgres pg_restore -l < "$DUMP_PATH" > /dev/null

table_count="$("${compose[@]}" exec -T postgres psql -U "$db_user" -d "$db_name" -tAc \
  "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m','S','f')" \
  | tr -d '[:space:]')"

restore_args=(--no-owner --no-privileges --single-transaction)

if [ "${table_count:-0}" -gt 0 ]; then
  if [ "$FORCE" != "1" ]; then
    echo "Database '$db_name' already contains $table_count object(s)." >&2
    echo "Re-run with FORCE=1 to replace it. A backup will be created first." >&2
    exit 1
  fi

  mkdir -p backups
  backup_path="backups/pre-import-$(date +%Y%m%d-%H%M%S).dump"
  echo "==> Backing up existing database to $backup_path"
  "${compose[@]}" exec -T postgres pg_dump -U "$db_user" -d "$db_name" -Fc > "$backup_path"

  if [ ! -s "$backup_path" ]; then
    echo "Backup failed: $backup_path is empty" >&2
    exit 1
  fi

  restore_args=(--clean --if-exists --no-owner --no-privileges --single-transaction)
fi

echo "==> Stopping API and tunnel during import"
"${compose[@]}" stop api cloudflared-tunnel >/dev/null 2>&1 || true

echo "==> Restoring dump into '$db_name'"
"${compose[@]}" exec -T postgres pg_restore -U "$db_user" -d "$db_name" "${restore_args[@]}" < "$DUMP_PATH"

if [ "$RUN_MIGRATE" = "1" ]; then
  record_legacy_init_migrations
  echo "==> Applying migrations"
  "${compose[@]}" run --rm migrate
else
  echo "==> Skipping migrations (full dump already contains the current schema)."
fi

if [ "$NO_TUNNEL" = "1" ]; then
  echo "==> Starting API (tunnel disabled by NO_TUNNEL=1)"
  "${compose[@]}" up -d api
else
  echo "==> Starting API and cloudflared tunnel"
  "${compose[@]}" up -d api cloudflared-tunnel
fi

echo "==> Waiting for API health"
api_healthy=0
for _ in $(seq 1 60); do
  if "${compose[@]}" exec -T api node -e "fetch('http://127.0.0.1:8000/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >/dev/null 2>&1; then
    api_healthy=1
    break
  fi
  sleep 2
done

if [ "$api_healthy" != "1" ]; then
  echo "API did not become healthy" >&2
  "${compose[@]}" logs --tail=100 api >&2 || true
  exit 1
fi

echo "==> Health:"
"${compose[@]}" exec -T api node -e "fetch('http://127.0.0.1:8000/health').then((r) => r.text()).then((body) => console.log(body))"

echo "==> Database summary"
"${compose[@]}" exec -T postgres psql -U "$db_user" -d "$db_name" -c "SELECT count(*) AS applied_migrations FROM schema_migration;"
"${compose[@]}" exec -T postgres psql -U "$db_user" -d "$db_name" -c "SELECT relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 15;"

if [ "$NO_TUNNEL" != "1" ]; then
  echo "==> Tunnel status"
  "${compose[@]}" logs --tail=30 cloudflared-tunnel || true
fi

echo "==> Service status"
"${compose[@]}" ps
