# Local to Cloud Database Sync

Script: `src/scripts/syncLocalToCloud.ts`
Command: `npm run sync:db`

The script connects to both databases at the same time, walks every table in the `public` schema, compares rows by primary key, and inserts only the rows that are missing from the cloud database.

Existing cloud rows are not updated. Extra cloud rows are not deleted.

## 1. Add prefixed database variables

The app already uses unprefixed `PG*` variables. Since both databases cannot use the same variable names at the same time, the sync script uses prefixed names.

Add the following block to `code-judge-backend/.env`:

```dotenv
# --- Sync: local database ---
LOCAL_PGHOST=localhost
LOCAL_PGPORT=5432
LOCAL_PGUSER=postgres
LOCAL_PGPASSWORD=<your local password>
LOCAL_PGDATABASE=db1
LOCAL_PGSSLMODE=disable

# --- Sync: cloud database ---
CLOUD_PGHOST=<your Aiven host, same as your current PGHOST>
CLOUD_PGPORT=26681
CLOUD_PGUSER=avnadmin
CLOUD_PGPASSWORD=<your cloud password, same as your current PGPASSWORD>
CLOUD_PGDATABASE=defaultdb
CLOUD_PGSSLMODE=require
```

You do not need to change or remove the existing `PG*` block. The application keeps using those variables.

The sync script reads:

| Side | Variables |
| --- | --- |
| Local source | `LOCAL_PGHOST`, `LOCAL_PGPORT`, `LOCAL_PGUSER`, `LOCAL_PGPASSWORD`, `LOCAL_PGDATABASE`, `LOCAL_PGSSLMODE` |
| Cloud target | `CLOUD_PGHOST`, `CLOUD_PGPORT`, `CLOUD_PGUSER`, `CLOUD_PGPASSWORD`, `CLOUD_PGDATABASE`, `CLOUD_PGSSLMODE` |

Unprefixed `PG*` variables are only used as a fallback if the prefixed variables are missing.

URLs are also supported instead of the `PG*` variables:

```dotenv
LOCAL_DATABASE_URL=postgresql://postgres:<password>@localhost:5432/db1
CLOUD_DATABASE_URL=postgresql://avnadmin:<password>@<host>:26681/defaultdb?sslmode=require
```

## 2. Run a dry run first

```bash
cd code-judge-backend
npm run sync:db -- --dry-run
```

The dry run connects to both databases and reports how many rows are missing. It does not write anything.

## 3. Run the sync

```bash
cd code-judge-backend
npm run sync:db
```

## Options

| Option | Description |
| --- | --- |
| `--dry-run` | Count missing rows without writing |
| `--tables=a,b` | Sync only the listed tables |
| `--exclude=a,b` | Skip the listed tables |
| `--batch-size=500` | Rows read and inserted per batch |
| `--help` | Show usage |

Examples:

```bash
npm run sync:db -- --dry-run --tables=users,quiz
npm run sync:db -- --exclude=api_request_logs,api_request_metadata,system_metrics
```

## What the script handles

- Discovers all tables in the `public` schema automatically.
- Inserts parent tables before child tables using foreign-key dependencies.
- Preserves explicit IDs, including `GENERATED ALWAYS AS IDENTITY` columns.
- Resets serial/identity sequences after inserting so future inserts do not collide.
- Copies `json`, `jsonb`, arrays, timestamps, numerics, and other supported PostgreSQL types.
- Batches both reads and inserts, so large tables do not need to fit in memory.
- Is safe to rerun: rows already present are skipped.

## Limits

- Existing rows with the same primary key are not updated, even if their other columns differ.
- Rows that exist in cloud but not in local are not deleted.
- Tables without a primary key are skipped.
- The cloud schema must already contain the tables and columns. Run migrations on the cloud database first.
- If a local row has the same unique value as a different cloud row, the insert is skipped and reported as a conflict.

## Common errors

### Source and target point to the same database

The local variables were not found, so the script fell back to the unprefixed `PG*` variables. Add the `LOCAL_PG*` block.

### Target database is missing table or column

The cloud schema is behind the local schema. Apply the migrations to the cloud database first.

### Rows skipped due to conflicting unique values

A local row has a unique value that already belongs to a different row in cloud. The script leaves both rows alone and reports the count. Resolve that row manually, then rerun the sync.
