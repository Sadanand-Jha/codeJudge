// Coupon authoring rules for /platform. Coupons keep redemption history, so
// "delete" disables them instead of removing rows.
import {
  type CouponInput,
  type CouponRow,
  type CouponStatus,
  type CouponType,
  catalogAdminRepository,
} from "../repositories/catalogAdmin.repository.ts";
import { writeSubscriptionAudit } from "./subscriptionAudit.service.ts";
import type { ActorContext } from "./plan.service.ts";

export class CouponServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "CouponServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "").slice(0, 64);
}

function normalize(input: CouponInput): CouponInput {
  const code = normalizeCode(input.code);
  if (!/^[A-Z0-9_-]{2,64}$/.test(code)) {
    throw new CouponServiceError(400, "INVALID_COUPON_CODE", "Coupon code must use letters, numbers, dashes or underscores.");
  }
  if (input.type === "percent" && (input.value < 1 || input.value > 100)) {
    throw new CouponServiceError(400, "INVALID_COUPON_VALUE", "Percent coupons must be between 1 and 100.");
  }
  if ((input.type === "flat" || input.type === "free_days") && input.value <= 0) {
    throw new CouponServiceError(400, "INVALID_COUPON_VALUE", "Coupon value must be positive.");
  }
  if (input.per_user_limit != null && input.per_user_limit < 1) {
    throw new CouponServiceError(400, "INVALID_PER_USER_LIMIT", "Per-user limit must be at least 1.");
  }
  if (input.max_redemptions != null && input.max_redemptions < 1) {
    throw new CouponServiceError(400, "INVALID_MAX_REDEMPTIONS", "Max redemptions must be at least 1.");
  }
  if (input.valid_from && input.valid_until && new Date(input.valid_until) < new Date(input.valid_from)) {
    throw new CouponServiceError(400, "INVALID_VALIDITY_WINDOW", "Valid until must be after valid from.");
  }
  return { ...input, code };
}

function payloadOf(coupon: CouponRow): CouponInput {
  return {
    code: coupon.code,
    type: coupon.type as CouponType,
    value: coupon.value,
    applies_to_plan_ids: coupon.applies_to_plan_ids,
    max_redemptions: coupon.max_redemptions,
    per_user_limit: coupon.per_user_limit,
    valid_from: coupon.valid_from,
    valid_until: coupon.valid_until,
    status: coupon.status as CouponStatus,
  };
}

function couponSnapshot(coupon: CouponRow): CouponInput {
  return payloadOf(coupon);
}

export class CouponService {
  async listCoupons(): Promise<CouponRow[]> {
    return catalogAdminRepository.listCoupons();
  }

  async getCoupon(id: number): Promise<CouponRow> {
    const coupon = await catalogAdminRepository.getCouponById(id);
    if (!coupon) throw new CouponServiceError(404, "COUPON_NOT_FOUND", "Coupon not found.");
    return coupon;
  }

  async createCoupon(input: CouponInput, actor: ActorContext): Promise<CouponRow> {
    const normalized = normalize({ ...input, status: "disabled" });
    const existing = await catalogAdminRepository.getCouponByCode(normalized.code);
    if (existing) {
      throw new CouponServiceError(409, "COUPON_CODE_TAKEN", `The coupon code "${normalized.code}" is already in use.`);
    }
    const id = await catalogAdminRepository.createCoupon({ ...normalized, created_by: actor.actorId ?? null });
    const draft = { ...normalized, status: input.status ?? "active", savedAt: new Date().toISOString() };
    await catalogAdminRepository.saveCouponDraft(id, draft);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "coupon.create",
      entityType: "coupon",
      entityId: id,
      after: draft,
      ip: actor.ip,
    });
    return this.getCoupon(id);
  }

  async saveDraft(id: number, input: Partial<CouponInput>, actor: ActorContext): Promise<CouponRow> {
    const before = await this.getCoupon(id);
    const merged = normalize({
      ...payloadOf(before),
      ...input,
      code: input.code ?? before.code,
      type: input.type ?? before.type,
      value: input.value ?? before.value,
    });
    const existing = await catalogAdminRepository.getCouponByCode(merged.code);
    if (existing && existing.id !== id) {
      throw new CouponServiceError(409, "COUPON_CODE_TAKEN", `The coupon code "${merged.code}" is already in use.`);
    }
    const draft = { ...merged, savedAt: new Date().toISOString() };
    await catalogAdminRepository.saveCouponDraft(id, draft);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "coupon.draft_save",
      entityType: "coupon",
      entityId: id,
      before: couponSnapshot(before),
      after: draft,
    });
    return this.getCoupon(id);
  }

  async publishDraft(id: number, actor: ActorContext): Promise<CouponRow> {
    const before = await this.getCoupon(id);
    const draft = before.draft_payload as (Partial<CouponInput> & { savedAt?: string }) | null;
    if (!draft) throw new CouponServiceError(400, "NO_DRAFT", "There is no draft to publish.");
    const { savedAt: _savedAt, ...input } = draft;
    await catalogAdminRepository.updateCoupon(id, input);
    await catalogAdminRepository.clearCouponDraft(id);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "coupon.publish",
      entityType: "coupon",
      entityId: id,
      before: couponSnapshot(before),
      after: { ...input },
      ip: actor.ip,
    });
    return this.getCoupon(id);
  }

  async setActive(id: number, active: boolean, actor: ActorContext): Promise<CouponRow> {
    const before = await this.getCoupon(id);
    const status = active ? "active" : "disabled";
    await catalogAdminRepository.setCouponStatus(id, status);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "coupon.toggle_active",
      entityType: "coupon",
      entityId: id,
      before: couponSnapshot(before),
      after: couponSnapshot(await this.getCoupon(id)),
      ip: actor.ip,
    });
    return this.getCoupon(id);
  }

  async disableCoupon(id: number, actor: ActorContext): Promise<void> {
    await this.setActive(id, false, actor);
  }

  async listVersions(id: number) {
    const versions = await catalogAdminRepository.listVersions("coupon", id);
    return versions.filter((version) => {
      const snapshot = (version.before ?? version.after) as Record<string, unknown> | null;
      return Boolean(snapshot && typeof snapshot.code === "string");
    });
  }

  async restoreVersion(id: number, versionId: number, actor: ActorContext): Promise<CouponRow> {
    const versions = await catalogAdminRepository.listVersions("coupon", id, 100);
    const version = versions.find((row) => row.id === versionId);
    if (!version) throw new CouponServiceError(404, "VERSION_NOT_FOUND", "That version was not found.");
    const snapshot = (version.before ?? version.after) as Partial<CouponInput> | null;
    if (!snapshot || typeof snapshot.code !== "string" || typeof snapshot.type !== "string") {
      throw new CouponServiceError(400, "VERSION_NOT_RESTORABLE", "This version does not contain a restorable coupon snapshot.");
    }
    return this.saveDraft(id, snapshot, actor);
  }
}

export const couponService = new CouponService();
