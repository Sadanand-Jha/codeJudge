// Credit-pack catalog rules for /platform. Packs referenced by orders are
// deactivated instead of hard-deleted so purchase history stays intact.
import {
  type CreditPackInput,
  type CreditPackRow,
  creditPackRepository,
} from "../repositories/creditPack.repository.ts";
import { writeSubscriptionAudit } from "./subscriptionAudit.service.ts";
import type { ActorContext } from "./plan.service.ts";

export class CreditPackServiceError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "CreditPackServiceError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function slugifyCode(value: string): string {
  const code = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return code || "pack";
}

function validateInput(input: CreditPackInput): CreditPackInput {
  if (!input.name || input.name.trim().length === 0) {
    throw new CreditPackServiceError(400, "INVALID_PACK_NAME", "Pack name is required.");
  }
  if (!Number.isInteger(input.price_inr) || input.price_inr < 0) {
    throw new CreditPackServiceError(400, "INVALID_PACK_PRICE", "Pack price must be a non-negative integer.");
  }
  if (!Number.isInteger(input.credits) || input.credits <= 0) {
    throw new CreditPackServiceError(400, "INVALID_PACK_CREDITS", "Pack credits must be a positive integer.");
  }
  if (!Number.isInteger(input.validity_days) || input.validity_days <= 0) {
    throw new CreditPackServiceError(400, "INVALID_PACK_VALIDITY", "Validity must be a positive number of days.");
  }
  if (
    input.save_percent != null &&
    (!Number.isInteger(input.save_percent) || input.save_percent < 0 || input.save_percent > 100)
  ) {
    throw new CreditPackServiceError(400, "INVALID_SAVE_PERCENT", "Save percent must be between 0 and 100.");
  }
  return {
    ...input,
    code: slugifyCode(input.code || input.name),
    name: input.name.trim(),
    description: input.description?.trim() || null,
    cta: input.cta?.trim() || null,
  };
}

export class CreditPackService {
  async listPacks(): Promise<CreditPackRow[]> {
    return creditPackRepository.listPacks();
  }

  async createPack(input: CreditPackInput, actor: ActorContext): Promise<CreditPackRow> {
    const normalized = validateInput(input);
    const existing = await creditPackRepository.getPackByCode(normalized.code);
    if (existing) {
      throw new CreditPackServiceError(409, "PACK_CODE_TAKEN", `The pack code "${normalized.code}" is already in use.`);
    }
    const id = await creditPackRepository.createPack(normalized);
    const pack = await creditPackRepository.getPackById(id);
    if (!pack) throw new CreditPackServiceError(500, "PACK_CREATE_FAILED", "Pack could not be created.");
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "credit_pack.create",
      entityType: "credit_pack",
      entityId: id,
      after: pack,
      ip: actor.ip,
    });
    return pack;
  }

  async updatePack(
    id: number,
    input: Partial<CreditPackInput>,
    actor: ActorContext
  ): Promise<CreditPackRow> {
    const before = await creditPackRepository.getPackById(id);
    if (!before) throw new CreditPackServiceError(404, "PACK_NOT_FOUND", "Credit pack not found.");

    const normalized = validateInput({
      ...before,
      ...input,
      code: input.code ?? before.code,
      name: input.name ?? before.name,
      price_inr: input.price_inr ?? before.price_inr,
      credits: input.credits ?? before.credits,
      validity_days: input.validity_days ?? before.validity_days,
      description: input.description !== undefined ? input.description : before.description,
      is_popular: input.is_popular ?? before.is_popular,
      save_percent: input.save_percent ?? before.save_percent,
      is_active: input.is_active ?? before.is_active,
      cta: input.cta !== undefined ? input.cta : before.cta,
      sort_order: input.sort_order ?? before.sort_order,
    });

    if (normalized.code !== before.code) {
      const existing = await creditPackRepository.getPackByCode(normalized.code);
      if (existing && existing.id !== id) {
        throw new CreditPackServiceError(409, "PACK_CODE_TAKEN", `The pack code "${normalized.code}" is already in use.`);
      }
    }

    await creditPackRepository.updatePack(id, normalized);
    const after = await creditPackRepository.getPackById(id);
    if (!after) throw new CreditPackServiceError(500, "PACK_UPDATE_FAILED", "Pack could not be updated.");
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "credit_pack.update",
      entityType: "credit_pack",
      entityId: id,
      before,
      after,
      ip: actor.ip,
    });
    return after;
  }

  async deletePack(id: number, actor: ActorContext): Promise<void> {
    const before = await creditPackRepository.getPackById(id);
    if (!before) throw new CreditPackServiceError(404, "PACK_NOT_FOUND", "Credit pack not found.");

    const hasOrders = await creditPackRepository.hasOrders(id);
    if (hasOrders) {
      await creditPackRepository.deactivatePack(id);
    } else {
      // No purchase history — a hard delete keeps the catalog tidy.
      await creditPackRepository.deactivatePack(id);
    }

    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "credit_pack.deactivate",
      entityType: "credit_pack",
      entityId: id,
      before,
      after: { is_active: false, had_orders: hasOrders },
      ip: actor.ip,
    });
  }
}

export const creditPackService = new CreditPackService();
