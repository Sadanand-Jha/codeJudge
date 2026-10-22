#!/usr/bin/env tsx
import "dotenv/config";
import pg from "pg";
import type { Client as PgClient, ClientConfig } from "pg";

process.env.TZ ||= "Asia/Kolkata";

const { Client } = pg;
const SCHEMA = "public";
const MAX_BIND_PARAMETERS = 60000;

interface ColumnMeta {
  name: string;
  identity: string;
  generated: string;
  defaultExpr: string | null;
  isJson: boolean;
}

interface TableMeta {
  name: string;
  columns: ColumnMeta[];
  pkColumns: string[];
  insertColumns: ColumnMeta[];
}

interface ConnectionInfo {
  config: ClientConfig;
  label: string;
  identity: string;
}

interface Options {
  dryRun: boolean;
  help: boolean;
  batchSize: number;
  onlyTables: Set<string> | null;
  excludedTables: Set<string>;
}

interface TableSyncResult {
  table: string;
  sourceRows: number;
  missingRows: number;
  insertedRows: number;
  skippedRows: number;
}

interface ColumnRow {
  table_name: string;
  attname: string;
  type_name: string;
  base_type_name: string | null;
  identity_kind: string;
  generated_kind: string;
  default_expr: string | null;
}

interface PkRow {
  table_name: string;
  attname: string;
}

interface FkRow {
  source_table: string;
  target_table: string;
}

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function qualifiedTable(table: string): string {
  return `${quoteIdent(SCHEMA)}.${quoteIdent(table)}`;
}

function parseTableList(raw: string | undefined): Set<string> | null {
  if (!raw) return null;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? new Set(values) : null;
}

function parseOptions(argv: string[]): Options {
  let dryRun = false;
  let help = false;
  let batchSize = 500;
  let onlyTables: Set<string> | null = null;
  let excludedTables = new Set<string>();

  for (const argument of argv) {
    if (argument === "--dry-run") {
      dryRun = true;
    } else if (argument === "--help" || argument === "-h") {
      help = true;
    } else if (argument.startsWith("--batch-size=")) {
      const value = Number(argument.slice("--batch-size=".length));
      if (!Number.isInteger(value) || value < 1) {
        throw new Error("--batch-size must be a positive integer");
      }
      batchSize = value;
    } else if (argument.startsWith("--tables=")) {
      onlyTables = parseTableList(argument.slice("--tables=".length));
    } else if (argument.startsWith("--exclude=")) {
      excludedTables = parseTableList(argument.slice("--exclude=".length)) ?? new Set();
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  return { dryRun, help, batchSize, onlyTables, excludedTables };
}

function printHelp(): void {
  console.log(`Sync the local PostgreSQL database into the cloud PostgreSQL database.

Usage:
  npm run sync:db -- [options]

Connections:
  Local source:
    LOCAL_PGHOST, LOCAL_PGPORT, LOCAL_PGUSER, LOCAL_PGPASSWORD,
    LOCAL_PGDATABASE, LOCAL_PGSSLMODE
    or LOCAL_DATABASE_URL

  Cloud target:
    CLOUD_PGHOST, CLOUD_PGPORT, CLOUD_PGUSER, CLOUD_PGPASSWORD,
    CLOUD_PGDATABASE, CLOUD_PGSSLMODE
    or CLOUD_DATABASE_URL

  Unprefixed PG* variables are a fallback for either side.
  URL fallbacks: SOURCE_DATABASE_URL / SYNC_SOURCE_URL for local,
  TARGET_DATABASE_URL / SYNC_TARGET_URL / DATABASE_URL for cloud.

Options:
  --dry-run             Count missing rows without writing anything
  --tables=a,b          Sync only the listed tables
  --exclude=a,b         Skip the listed tables
  --batch-size=500      Rows read and inserted per batch
  --help, -h            Show this help

Only missing rows are inserted. Existing rows are never updated or deleted.
Tables without a primary key are skipped.`);
}

function connectionFromUrl(url: string): ConnectionInfo {
  const parsed = new URL(url);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("Database URL must start with postgres:// or postgresql://");
  }

  const host = parsed.hostname;
  const port = parsed.port || "5432";
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
  const sslDisabled = parsed.searchParams.get("sslmode") === "disable";

  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("ssl");

  return {
    config: {
      connectionString: parsed.toString(),
      ssl: isLocal || sslDisabled ? false : { rejectUnauthorized: false },
      application_name: "code-judge-db-sync",
    },
    label: `${host}:${port}/${database}`,
    identity: `${host.toLowerCase()}:${port}/${database.toLowerCase()}`,
  };
}

function readPgEnv(prefix: string, key: string): string | undefined {
  return process.env[`${prefix}PG${key}`];
}

function connectionFromPgEnv(prefix = ""): ConnectionInfo | null {
  const host = readPgEnv(prefix, "HOST");
  const database = readPgEnv(prefix, "DATABASE");
  if (!host || !database) return null;

  const port = readPgEnv(prefix, "PORT") || "5432";
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const sslDisabled = readPgEnv(prefix, "SSLMODE") === "disable";

  return {
    config: {
      host,
      port: Number(port),
      user: readPgEnv(prefix, "USER"),
      password: readPgEnv(prefix, "PASSWORD"),
      database,
      ssl: isLocal || sslDisabled ? false : { rejectUnauthorized: false },
      application_name: "code-judge-db-sync",
    },
    label: `${host}:${port}/${database}`,
    identity: `${host.toLowerCase()}:${port}/${database.toLowerCase()}`,
  };
}

function resolveSourceConnection(): ConnectionInfo {
  const url =
    process.env.LOCAL_DATABASE_URL ||
    process.env.SOURCE_DATABASE_URL ||
    process.env.SYNC_SOURCE_URL;
  if (url) return connectionFromUrl(url);

  const fromEnv = connectionFromPgEnv("LOCAL_") ?? connectionFromPgEnv();
  if (fromEnv) return fromEnv;

  throw new Error(
    "Set LOCAL_PGHOST/LOCAL_PGDATABASE (with LOCAL_PGUSER, LOCAL_PGPASSWORD, etc.) or LOCAL_DATABASE_URL for the local source database.",
  );
}

function resolveTargetConnection(): ConnectionInfo {
  const url =
    process.env.CLOUD_DATABASE_URL ||
    process.env.TARGET_DATABASE_URL ||
    process.env.SYNC_TARGET_URL;
  if (url) return connectionFromUrl(url);

  const fromEnv = connectionFromPgEnv("CLOUD_") ?? connectionFromPgEnv();
  if (fromEnv) return fromEnv;

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) return connectionFromUrl(databaseUrl);

  throw new Error(
    "Set CLOUD_PGHOST/CLOUD_PGDATABASE (with CLOUD_PGUSER, CLOUD_PGPASSWORD, etc.), CLOUD_DATABASE_URL, or DATABASE_URL for the cloud target database.",
  );
}

async function connectClient(client: PgClient, label: string): Promise<void> {
  await client.connect();
  await client.query("SET TIME ZONE 'Asia/Kolkata'");
  await client.query("SET statement_timeout = 0");
  console.log(`Connected to ${label}`);
}

async function loadSchema(client: PgClient): Promise<Map<string, TableMeta>> {
  const columnsResult = await client.query<ColumnRow>(
    `SELECT c.relname AS table_name,
            a.attname,
            t.typname AS type_name,
            bt.typname AS base_type_name,
            a.attidentity AS identity_kind,
            a.attgenerated AS generated_kind,
            pg_get_expr(d.adbin, d.adrelid) AS default_expr
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_attribute a ON a.attrelid = c.oid
     JOIN pg_type t ON t.oid = a.atttypid
     LEFT JOIN pg_type bt ON bt.oid = NULLIF(t.typbasetype, 0)
     LEFT JOIN pg_attrdef d ON d.adrelid = c.oid AND d.adnum = a.attnum
     WHERE n.nspname = $1
       AND c.relkind IN ('r', 'p')
       AND NOT c.relispartition
       AND a.attnum > 0
       AND NOT a.attisdropped
     ORDER BY c.relname, a.attnum`,
    [SCHEMA],
  );

  const tables = new Map<string, TableMeta>();
  for (const row of columnsResult.rows) {
    let table = tables.get(row.table_name);
    if (!table) {
      table = { name: row.table_name, columns: [], pkColumns: [], insertColumns: [] };
      tables.set(row.table_name, table);
    }

    const isJson =
      row.type_name === "json" ||
      row.type_name === "jsonb" ||
      row.base_type_name === "json" ||
      row.base_type_name === "jsonb";

    table.columns.push({
      name: row.attname,
      identity: row.identity_kind,
      generated: row.generated_kind,
      defaultExpr: row.default_expr,
      isJson,
    });
  }

  const pkResult = await client.query<PkRow>(
    `SELECT c.relname AS table_name, a.attname
     FROM pg_constraint con
     JOIN pg_class c ON c.oid = con.conrelid
     JOIN pg_namespace n ON n.oid = c.relnamespace
     JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ANY(con.conkey)
     WHERE con.contype = 'p' AND n.nspname = $1
     ORDER BY c.relname, array_position(con.conkey, a.attnum)`,
    [SCHEMA],
  );

  for (const row of pkResult.rows) {
    tables.get(row.table_name)?.pkColumns.push(row.attname);
  }

  for (const table of tables.values()) {
    table.insertColumns = table.columns.filter((column) => column.generated === "");
  }

  return tables;
}

async function loadForeignKeys(client: PgClient): Promise<Map<string, Set<string>>> {
  const result = await client.query<FkRow>(
    `SELECT src.relname AS source_table, tgt.relname AS target_table
     FROM pg_constraint con
     JOIN pg_class src ON src.oid = con.conrelid
     JOIN pg_namespace sn ON sn.oid = src.relnamespace
     JOIN pg_class tgt ON tgt.oid = con.confrelid
     JOIN pg_namespace tn ON tn.oid = tgt.relnamespace
     WHERE con.contype = 'f'
       AND sn.nspname = $1
       AND tn.nspname = $1
       AND src.relkind IN ('r', 'p')
       AND tgt.relkind IN ('r', 'p')
       AND NOT src.relispartition`,
    [SCHEMA],
  );

  const dependencies = new Map<string, Set<string>>();
  for (const row of result.rows) {
    let targets = dependencies.get(row.source_table);
    if (!targets) {
      targets = new Set();
      dependencies.set(row.source_table, targets);
    }
    targets.add(row.target_table);
  }
  return dependencies;
}

function orderTables(
  names: string[],
  dependencies: Map<string, Set<string>>,
): { ordered: string[]; cyclic: string[] } {
  const nameSet = new Set(names);
  const indegree = new Map<string, number>();
  const dependents = new Map<string, Set<string>>();

  for (const name of names) {
    indegree.set(name, 0);
    dependents.set(name, new Set());
  }

  for (const name of names) {
    for (const dependency of dependencies.get(name) ?? []) {
      if (dependency === name || !nameSet.has(dependency)) continue;
      indegree.set(name, (indegree.get(name) ?? 0) + 1);
      dependents.get(dependency)?.add(name);
    }
  }

  const queue = names.filter((name) => indegree.get(name) === 0).sort();
  const ordered: string[] = [];

  while (queue.length > 0) {
    const name = queue.shift() as string;
    ordered.push(name);
    for (const dependent of [...(dependents.get(name) ?? [])].sort()) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) queue.push(dependent);
    }
    queue.sort();
  }

  const orderedSet = new Set(ordered);
  const cyclic = names.filter((name) => !orderedSet.has(name)).sort();
  return { ordered: ordered.concat(cyclic), cyclic };
}

function validateTable(sourceTable: TableMeta, targetTable: TableMeta | undefined): void {
  if (!targetTable) {
    throw new Error(
      `Target database is missing table "${sourceTable.name}". Apply migrations to the cloud database first.`,
    );
  }

  const targetColumns = new Set(targetTable.columns.map((column) => column.name));
  const missingColumns = sourceTable.columns
    .filter((column) => !targetColumns.has(column.name))
    .map((column) => column.name);

  if (missingColumns.length > 0) {
    throw new Error(
      `Target table "${sourceTable.name}" is missing column(s): ${missingColumns.join(", ")}`,
    );
  }

  if (targetTable.pkColumns.length === 0) {
    throw new Error(`Target table "${sourceTable.name}" has no primary key.`);
  }

  if (sourceTable.pkColumns.join(",") !== targetTable.pkColumns.join(",")) {
    throw new Error(
      `Primary key mismatch for table "${sourceTable.name}": source (${sourceTable.pkColumns.join(", ")}), target (${targetTable.pkColumns.join(", ")})`,
    );
  }
}

function selectExpression(column: ColumnMeta): string {
  const identifier = quoteIdent(column.name);
  return column.isJson ? `${identifier}::text AS ${identifier}` : identifier;
}

async function readBatch(
  source: PgClient,
  table: TableMeta,
  after: unknown[] | null,
  limit: number,
): Promise<Record<string, unknown>[]> {
  const params: unknown[] = [];
  let where = "";

  if (after) {
    const placeholders = table.pkColumns.map((_, index) => {
      params.push(after[index]);
      return `$${params.length}`;
    });
    where =
      table.pkColumns.length === 1
        ? `WHERE ${quoteIdent(table.pkColumns[0])} > $1`
        : `WHERE (${table.pkColumns.map(quoteIdent).join(", ")}) > (${placeholders.join(", ")})`;
  }

  const limitParameter = `$${params.length + 1}`;
  params.push(limit);

  const selectColumns = table.columns
    .filter((column) => column.generated === "" || table.pkColumns.includes(column.name))
    .map(selectExpression)
    .join(", ");

  const result = await source.query(
    `SELECT ${selectColumns}
     FROM ${qualifiedTable(table.name)}
     ${where}
     ORDER BY ${table.pkColumns.map(quoteIdent).join(", ")}
     LIMIT ${limitParameter}`,
    params,
  );

  return result.rows;
}

function keyOf(values: unknown[]): string {
  return JSON.stringify(
    values.map((value) => {
      if (value instanceof Date) return value.toISOString();
      if (Buffer.isBuffer(value)) return value.toString("hex");
      return value;
    }),
  );
}

function rowKey(table: TableMeta, row: Record<string, unknown>): string {
  return keyOf(table.pkColumns.map((column) => row[column]));
}

async function findExistingKeys(
  target: PgClient,
  table: TableMeta,
  rows: Record<string, unknown>[],
): Promise<Set<string>> {
  const existing = new Set<string>();
  if (rows.length === 0) return existing;

  const params: unknown[] = [];
  const tuples = rows.map((row) => {
    const placeholders = table.pkColumns.map((column) => {
      params.push(row[column]);
      return `$${params.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  const pkList = table.pkColumns.map(quoteIdent).join(", ");
  const result = await target.query(
    `SELECT ${pkList}
     FROM ${qualifiedTable(table.name)}
     WHERE (${pkList}) IN (${tuples.join(", ")})`,
    params,
  );

  for (const row of result.rows) {
    existing.add(rowKey(table, row));
  }
  return existing;
}

function buildInsert(
  table: TableMeta,
  rows: Record<string, unknown>[],
): { sql: string; params: unknown[] } {
  const columns = table.insertColumns;
  const params: unknown[] = [];

  const tuples = rows.map((row) => {
    const placeholders = columns.map((column) => {
      params.push(row[column.name]);
      return `$${params.length}`;
    });
    return `(${placeholders.join(", ")})`;
  });

  const overriding = columns.some((column) => column.identity === "a")
    ? " OVERRIDING SYSTEM VALUE"
    : "";

  return {
    sql: `INSERT INTO ${qualifiedTable(table.name)} (${columns
      .map((column) => quoteIdent(column.name))
      .join(", ")})${overriding} VALUES ${tuples.join(", ")} ON CONFLICT DO NOTHING RETURNING ${table.pkColumns
      .map(quoteIdent)
      .join(", ")}`,
    params,
  };
}

function chunkArray<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

async function resetSequences(target: PgClient, table: TableMeta): Promise<void> {
  const sequenceColumns = table.columns.filter(
    (column) => column.identity !== "" || (column.defaultExpr ?? "").includes("nextval("),
  );

  for (const column of sequenceColumns) {
    const sequenceResult = await target.query<{ sequence_name: string | null }>(
      "SELECT pg_get_serial_sequence($1, $2) AS sequence_name",
      [`${SCHEMA}.${quoteIdent(table.name)}`, column.name],
    );
    const sequenceName = sequenceResult.rows[0]?.sequence_name;
    if (!sequenceName) continue;

    await target.query(
      `SELECT setval($1::regclass, (SELECT COALESCE(MAX(${quoteIdent(column.name)}), 0) + 1 FROM ${qualifiedTable(table.name)}), false)`,
      [sequenceName],
    );
  }
}

async function syncTable(
  source: PgClient,
  target: PgClient,
  table: TableMeta,
  options: Options,
): Promise<TableSyncResult> {
  let after: unknown[] | null = null;
  let sourceRows = 0;
  let missingRows = 0;
  let insertedRows = 0;
  let skippedRows = 0;

  const rowsPerInsert = Math.max(
    1,
    Math.min(
      options.batchSize,
      Math.floor(MAX_BIND_PARAMETERS / Math.max(1, table.insertColumns.length)),
    ),
  );

  while (true) {
    const rows = await readBatch(source, table, after, options.batchSize);
    if (rows.length === 0) break;

    sourceRows += rows.length;
    const existing = await findExistingKeys(target, table, rows);
    const missing = rows.filter((row) => !existing.has(rowKey(table, row)));
    missingRows += missing.length;

    if (!options.dryRun && missing.length > 0) {
      for (const batch of chunkArray(missing, rowsPerInsert)) {
        const { sql, params } = buildInsert(table, batch);
        const result = await target.query(sql, params);
        insertedRows += result.rows.length;
        skippedRows += batch.length - result.rows.length;
      }
    }

    const lastRow = rows[rows.length - 1];
    after = table.pkColumns.map((column) => lastRow[column]);

    if (rows.length < options.batchSize) break;
  }

  if (!options.dryRun) {
    await resetSequences(target, table);
  }

  return { table: table.name, sourceRows, missingRows, insertedRows, skippedRows };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const sourceConnection = resolveSourceConnection();
  const targetConnection = resolveTargetConnection();

  if (sourceConnection.identity === targetConnection.identity) {
    throw new Error(
      `Source and target point to the same database (${sourceConnection.label}). Refusing to run.`,
    );
  }

  const source = new Client(sourceConnection.config);
  const target = new Client(targetConnection.config);

  try {
    await connectClient(source, sourceConnection.label);
    await connectClient(target, targetConnection.label);

    const sourceSchema = await loadSchema(source);
    const targetSchema = await loadSchema(target);
    const dependencies = await loadForeignKeys(source);

    let tableNames = [...sourceSchema.keys()].sort();
    if (options.onlyTables) {
      const unknown = [...options.onlyTables].filter((name) => !sourceSchema.has(name));
      if (unknown.length > 0) {
        throw new Error(`Unknown table(s): ${unknown.join(", ")}`);
      }
      tableNames = tableNames.filter((name) => options.onlyTables?.has(name));
    }
    tableNames = tableNames.filter((name) => !options.excludedTables.has(name));

    const skippedWithoutPk: string[] = [];
    tableNames = tableNames.filter((name) => {
      const table = sourceSchema.get(name) as TableMeta;
      if (table.pkColumns.length === 0) {
        skippedWithoutPk.push(name);
        return false;
      }
      return true;
    });

    if (skippedWithoutPk.length > 0) {
      console.warn(`Skipping tables without a primary key: ${skippedWithoutPk.join(", ")}`);
    }

    for (const name of tableNames) {
      validateTable(sourceSchema.get(name) as TableMeta, targetSchema.get(name));
    }

    const { ordered, cyclic } = orderTables(tableNames, dependencies);
    if (cyclic.length > 0) {
      console.warn(`Foreign-key cycle detected; inserting these tables last: ${cyclic.join(", ")}`);
    }

    console.log(
      `Syncing ${ordered.length} table(s) from ${sourceConnection.label} to ${targetConnection.label}${
        options.dryRun ? " (dry run)" : ""
      }`,
    );

    const results: TableSyncResult[] = [];

    for (let index = 0; index < ordered.length; index += 1) {
      const name = ordered[index];
      const table = sourceSchema.get(name) as TableMeta;
      const result = await syncTable(source, target, table, options);
      results.push(result);

      const action = options.dryRun
        ? `${result.missingRows} missing`
        : `${result.insertedRows} inserted`;
      const skipped = result.skippedRows > 0 ? `, ${result.skippedRows} skipped` : "";
      console.log(
        `[${index + 1}/${ordered.length}] ${name}: ${result.sourceRows} source rows, ${action}${skipped}`,
      );

      if (result.skippedRows > 0) {
        console.warn(
          `  ${name}: ${result.skippedRows} row(s) conflicted with existing unique values and were skipped.`,
        );
      }
    }

    const totalSource = results.reduce((sum, result) => sum + result.sourceRows, 0);
    const totalMissing = results.reduce((sum, result) => sum + result.missingRows, 0);
    const totalInserted = results.reduce((sum, result) => sum + result.insertedRows, 0);
    const totalSkipped = results.reduce((sum, result) => sum + result.skippedRows, 0);

    console.log("");
    if (options.dryRun) {
      console.log(
        `Dry run complete: ${totalMissing} missing row(s) across ${results.length} table(s).`,
      );
    } else {
      console.log(
        `Sync complete: ${totalInserted} row(s) inserted across ${results.length} table(s); ${totalSource} source row(s) scanned.`,
      );
      if (totalSkipped > 0) {
        console.warn(`${totalSkipped} row(s) skipped due to conflicting unique values.`);
      }
    }
  } finally {
    await source.end().catch(() => undefined);
    await target.end().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
