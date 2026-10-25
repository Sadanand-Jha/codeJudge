// Shared PostgreSQL TLS decision for the API pool and the migration runner.
// Managed providers (Neon/Supabase/RDS) require TLS, while the self-hosted
// Compose PostgreSQL has TLS disabled. Set DATABASE_SSL=false for the bundled
// container; leave it unset for hosted providers to preserve the old behavior.
export type DatabaseSslConfig = false | { rejectUnauthorized: boolean };

const FALSE_VALUES = new Set(["false", "disable", "disabled", "0", "off"]);
const TRUE_VALUES = new Set(["true", "require", "required", "1", "on"]);
const VERIFY_VALUES = new Set(["verify-full", "verify-identity"]);

export function resolveDatabaseSsl(connectionString?: string): DatabaseSslConfig {
  const explicit = process.env.DATABASE_SSL?.trim().toLowerCase();

  if (explicit && FALSE_VALUES.has(explicit)) return false;
  if (explicit && VERIFY_VALUES.has(explicit)) return { rejectUnauthorized: true };
  if (explicit && TRUE_VALUES.has(explicit)) return { rejectUnauthorized: false };

  const url = connectionString ?? "";
  const isLocal =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("[::1]");

  return isLocal ? false : { rejectUnauthorized: false };
}
