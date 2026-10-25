// Append-only audit log for every privileged subscription action. The table
// has no UPDATE/DELETE paths (enforced by convention here — only INSERTs are
// exposed). Audit writes must never take down the action they describe, so
// failures are logged and swallowed.
import { pool } from "../config/database.ts";

export interface SubscriptionAuditInput {
  actorId?: number | null;
  /** "platform_admin" | "platform_support" | "system" | "user". */
  actorRole?: string;
  action: string;
  entityType: "plan" | "price" | "subscription" | "override" | "payment" | "coupon" | "settings" | "entitlement" | "credit_pack";
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ip?: string | null;
}

function toJson(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  try {
    const json = JSON.stringify(value);
    // Keep audit rows bounded; huge payloads are truncated, not dropped.
    return json.length > 20_000 ? JSON.stringify({ truncated: true, preview: json.slice(0, 20_000) }) : json;
  } catch {
    return JSON.stringify({ unserializable: true });
  }
}

export async function writeSubscriptionAudit(entry: SubscriptionAuditInput): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO subscription_audit_log
         (actor_id, actor_role, action, entity_type, entity_id, before, after, reason, ip)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9)`,
      [
        entry.actorId ?? null,
        entry.actorRole ?? "system",
        entry.action,
        entry.entityType,
        entry.entityId != null ? String(entry.entityId) : null,
        toJson(entry.before),
        toJson(entry.after),
        entry.reason ?? null,
        entry.ip ?? null,
      ]
    );
  } catch (error) {
    console.error("Failed to write subscription audit entry:", error);
  }
}
