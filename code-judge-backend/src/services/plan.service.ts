// Plan catalog business rules for the /platform console: create/edit,
// duplication, reordering, archive/delete rules and change auditing.
import {
  type BillingPeriod,
  type CreatePlanData,
  type PlanDetailRow,
  type PlanListRow,
  type PlanPriceInput,
  type PlanStatus,
  planRepository,
} from "../repositories/plan.repository.ts";
import {
  coerceEntitlementValue,
  getEntitlementDefinition,
} from "../config/entitlementRegistry.ts";
import { invalidateAllEntitlements } from "./entitlement.service.ts";
import { writeSubscriptionAudit } from "./subscriptionAudit.service.ts";

export interface ActorContext {
  actorId?: number | null;
  actorRole?: string;
  ip?: string | null;
}

export class PlanServiceError extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "PlanServiceError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return slug || "plan";
}

async function resolveUniqueSlug(base: string, excludePlanId?: number): Promise<string> {
  let candidate = base;
  let suffix = 2;
  for (;;) {
    const existing = await planRepository.getPlanBySlug(candidate);
    if (!existing || existing.id === excludePlanId) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

/** Registry-driven validation: unknown keys and wrong types are rejected. */
function validateEntitlements(input: Record<string, unknown>): Record<string, number | boolean> {
  const result: Record<string, number | boolean> = {};
  for (const [key, raw] of Object.entries(input)) {
    const definition = getEntitlementDefinition(key);
    if (!definition) {
      throw new PlanServiceError(400, "UNKNOWN_ENTITLEMENT", `Unknown entitlement: ${key}`);
    }
    if (definition.type === "boolean") {
      if (typeof raw !== "boolean") {
        throw new PlanServiceError(400, "INVALID_ENTITLEMENT_VALUE", `${definition.label} must be true or false.`);
      }
      result[key] = raw;
      continue;
    }
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < -1) {
      throw new PlanServiceError(400, "INVALID_ENTITLEMENT_VALUE", `${definition.label} must be an integer (-1 = unlimited).`);
    }
    result[key] = raw;
  }
  return result;
}

function validatePrices(prices: PlanPriceInput[]): PlanPriceInput[] {
  const seen = new Set<string>();
  for (const price of prices) {
    const key = `${price.billing_period}|${price.custom_days ?? 0}`;
    if (seen.has(key)) {
      throw new PlanServiceError(400, "DUPLICATE_PRICE_PERIOD", `Duplicate price for billing period ${price.billing_period}.`);
    }
    seen.add(key);
    if (price.billing_period === "custom_days" && !(price.custom_days && price.custom_days > 0)) {
      throw new PlanServiceError(400, "INVALID_PRICE_PERIOD", "A custom_days price requires custom_days > 0.");
    }
    if (price.billing_period !== "custom_days" && price.custom_days != null) {
      throw new PlanServiceError(400, "INVALID_PRICE_PERIOD", "custom_days is only allowed with the custom_days billing period.");
    }
    if (!Number.isInteger(price.amount) || price.amount < 0) {
      throw new PlanServiceError(400, "INVALID_PRICE_AMOUNT", "Price amount must be a non-negative integer in paise.");
    }
    if (
      price.mrp_amount != null &&
      (!Number.isInteger(price.mrp_amount) || price.mrp_amount < 0)
    ) {
      throw new PlanServiceError(400, "INVALID_MRP_AMOUNT", "MRP amount must be a non-negative integer in paise.");
    }
    if (price.mrp_amount != null && price.mrp_amount < price.amount) {
      throw new PlanServiceError(400, "INVALID_MRP_AMOUNT", "Original price must be greater than or equal to the selling price.");
    }
  }
  return prices;
}

function planSnapshot(plan: PlanDetailRow): Record<string, unknown> {
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    tagline: plan.tagline,
    cta: plan.cta,
    offer: plan.offer,
    discount_badge: plan.discount_badge,
    featured: plan.featured,
    features: plan.features,
    status: plan.status,
    is_public: plan.is_public,
    sort_order: plan.sort_order,
    trial_days: plan.trial_days,
    prices: plan.prices,
    entitlements: plan.entitlements,
  };
}

export class PlanService {
  async listPlans(filters: { search?: string; status?: PlanStatus }): Promise<PlanListRow[]> {
    return planRepository.listPlans(filters);
  }

  async getPlan(planId: number): Promise<PlanDetailRow> {
    const plan = await planRepository.getPlanById(planId);
    if (!plan) throw new PlanServiceError(404, "PLAN_NOT_FOUND", "Plan not found.");
    return plan;
  }

  /** Change-impact preview: subscriber counts per price + plan-wide totals. */
  async getPlanImpact(planId: number) {
    const plan = await this.getPlan(planId);
    const priceSubscribers = await planRepository.getPriceSubscriberCounts(planId);
    return {
      plan_id: plan.id,
      active_subscribers: plan.active_subscriber_count,
      total_subscribers: plan.subscriber_count,
      price_subscribers: priceSubscribers,
      entitlements: plan.entitlements,
      prices: plan.prices,
    };
  }

  async createPlan(
    input: {
      name: string;
      slug?: string;
      description?: string | null;
      tagline?: string | null;
      cta?: string | null;
      offer?: string | null;
      discount_badge?: string | null;
      featured?: boolean;
      features?: string[];
      status?: "draft" | "active";
      is_public?: boolean;
      sort_order?: number;
      trial_days?: number;
      prices: PlanPriceInput[];
      entitlements: Record<string, unknown>;
    },
    actor: ActorContext
  ): Promise<PlanDetailRow> {
    const prices = validatePrices(input.prices ?? []);
    const entitlements = validateEntitlements(input.entitlements ?? {});
    const name = input.name.trim();
    const existingName = await planRepository.getPlanByName(name);
    if (existingName) {
      throw new PlanServiceError(409, "NAME_TAKEN", `A plan named "${name}" already exists.`);
    }

    let slug: string;
    if (input.slug) {
      slug = slugify(input.slug);
      const existing = await planRepository.getPlanBySlug(slug);
      if (existing) throw new PlanServiceError(409, "SLUG_TAKEN", `The slug "${slug}" is already in use.`);
    } else {
      slug = await resolveUniqueSlug(slugify(input.name));
    }

    const data: CreatePlanData = {
      name,
      slug,
      description: input.description ?? null,
      tagline: input.tagline ?? null,
      cta: input.cta ?? null,
      offer: input.offer ?? null,
      discount_badge: input.discount_badge?.trim() || null,
      featured: input.featured ?? false,
      features: input.features ?? [],
      status: input.status ?? "draft",
      is_public: input.is_public ?? false,
      sort_order: input.sort_order ?? 0,
      trial_days: input.trial_days ?? 0,
      prices,
      entitlements,
    };

    let planId: number;
    try {
      planId = await planRepository.createPlan(data);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new PlanServiceError(409, "SLUG_TAKEN", `The slug "${slug}" is already in use.`);
      }
      throw error;
    }

    if (input.featured) await planRepository.unsetFeaturedExcept(planId);
    await planRepository.saveDraft(planId, { ...data, savedAt: new Date().toISOString() });
    const plan = await this.getPlan(planId);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.create",
      entityType: "plan",
      entityId: planId,
      after: planSnapshot(plan),
      ip: actor.ip,
    });
    return plan;
  }

  async updatePlan(
    planId: number,
    input: {
      name?: string;
      slug?: string;
      description?: string | null;
      tagline?: string | null;
      cta?: string | null;
      offer?: string | null;
      discount_badge?: string | null;
      featured?: boolean;
      features?: string[];
      is_public?: boolean;
      sort_order?: number;
      trial_days?: number;
      prices?: PlanPriceInput[];
      entitlements?: Record<string, unknown>;
      migrateSubscribers?: boolean;
      expectedUpdatedAt?: Date;
    },
    actor: ActorContext
  ): Promise<PlanDetailRow> {
    const before = await this.getPlan(planId);

    if (input.name !== undefined) {
      const trimmedName = input.name.trim();
      const existingName = await planRepository.getPlanByName(trimmedName);
      if (existingName && existingName.id !== planId) {
        throw new PlanServiceError(409, "NAME_TAKEN", `A plan named "${trimmedName}" already exists.`);
      }
      input = { ...input, name: trimmedName };
    }

    if (input.slug !== undefined) {
      const slug = slugify(input.slug);
      const existing = await planRepository.getPlanBySlug(slug);
      if (existing && existing.id !== planId) {
        throw new PlanServiceError(409, "SLUG_TAKEN", `The slug "${slug}" is already in use.`);
      }
      input = { ...input, slug };
    }

    const prices = input.prices ? validatePrices(input.prices) : undefined;
    const entitlements = input.entitlements ? validateEntitlements(input.entitlements) : undefined;
    if (input.discount_badge !== undefined) {
      input = { ...input, discount_badge: input.discount_badge?.trim() || null };
    }

    // Price/permission changes on a plan with subscribers always go through
    // the diff + grandfathering path; migrations are explicit opt-in only.
    const result = await planRepository.updatePlan(planId, {
      ...input,
      prices,
      entitlements,
      migrateSubscribers: input.migrateSubscribers === true,
    });

    if (!result.ok) {
      throw new PlanServiceError(
        409,
        "STALE_PLAN",
        "This plan was modified by someone else. Reload and try again."
      );
    }
    if (input.featured === true) await planRepository.unsetFeaturedExcept(planId);

    const after = await this.getPlan(planId);
    const priceChanges = Object.entries(result.priceMap).map(([oldId, newId]) => {
      const oldPrice = before.prices.find((p) => p.id === Number(oldId));
      const newPrice = after.prices.find((p) => p.id === newId);
      return {
        billing_period: newPrice?.billing_period ?? oldPrice?.billing_period,
        old_amount: oldPrice?.amount,
        new_amount: newPrice?.amount,
      };
    });

    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.update",
      entityType: "plan",
      entityId: planId,
      before: planSnapshot(before),
      after: planSnapshot(after),
      reason:
        priceChanges.length > 0
          ? `${result.migratedSubscribers} subscriber(s) migrated to new prices: ${JSON.stringify(priceChanges)}`
          : null,
      ip: actor.ip,
    });

    // Entitlement values for every user on this plan may have changed.
    await invalidateAllEntitlements();
    return after;
  }

  async duplicatePlan(planId: number, actor: ActorContext): Promise<PlanDetailRow> {
    const source = await this.getPlan(planId);
    const slug = await resolveUniqueSlug(`${source.slug}-copy`);

    const planIdNew = await planRepository.createPlan({
      name: `${source.name} (copy)`,
      slug,
      description: source.description,
      tagline: source.tagline,
      cta: source.cta,
      offer: source.offer,
      discount_badge: source.discount_badge,
      featured: false,
      features: source.features,
      status: "draft",
      is_public: false,
      sort_order: source.sort_order,
      trial_days: source.trial_days,
      prices: source.prices
        .filter((price) => price.is_active)
        .map((price) => ({
          billing_period: price.billing_period as BillingPeriod,
          custom_days: price.custom_days,
          amount: price.amount,
          mrp_amount: price.mrp_amount,
          tax_inclusive: price.tax_inclusive,
          gateway_price_id: null,
          is_active: true,
        })),
      entitlements: Object.fromEntries(
        Object.entries(source.entitlements).flatMap(([key, value]) => {
          const coerced = coerceEntitlementValue(key, value);
          return coerced === undefined ? [] : [[key, coerced]];
        })
      ) as Record<string, number | boolean>,
    });

    const plan = await this.getPlan(planIdNew);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.duplicate",
      entityType: "plan",
      entityId: planIdNew,
      before: { source_plan_id: planId },
      after: planSnapshot(plan),
      ip: actor.ip,
    });
    return plan;
  }

  async archivePlan(
    planId: number,
    input: { strategy?: "migrate" | "run_until_expiry"; migrationTargetPlanId?: number },
    actor: ActorContext
  ): Promise<PlanDetailRow> {
    const plan = await this.getPlan(planId);
    if (plan.is_default_free) {
      throw new PlanServiceError(409, "DEFAULT_FREE_PLAN", "The default free plan cannot be archived.");
    }
    if (plan.status === "archived") return plan;

    const activeSubscribers = await planRepository.countSubscriptionsForPlan(planId, true);

    let migratedSubscribers = 0;
    if (activeSubscribers > 0) {
      if (!input.strategy) {
        throw new PlanServiceError(409, "ARCHIVE_STRATEGY_REQUIRED", "This plan has active subscribers.", {
          subscriber_count: activeSubscribers,
          strategies: ["migrate", "run_until_expiry"],
        });
      }
      if (input.strategy === "migrate") {
        const targetId = input.migrationTargetPlanId;
        if (!targetId || targetId === planId) {
          throw new PlanServiceError(400, "INVALID_MIGRATION_TARGET", "Choose a different target plan to migrate subscribers to.");
        }
        const target = await planRepository.getPlanById(targetId);
        if (!target || target.status !== "active") {
          throw new PlanServiceError(400, "INVALID_MIGRATION_TARGET", "The migration target must be an active plan.");
        }
        migratedSubscribers = await planRepository.migrateSubscribers(planId, targetId);
        await writeSubscriptionAudit({
          actorId: actor.actorId,
          actorRole: actor.actorRole ?? "platform_admin",
          action: "plan.migrate_subscribers",
          entityType: "plan",
          entityId: planId,
          after: { target_plan_id: targetId, migrated: migratedSubscribers },
          reason: "Subscribers migrated during plan archive",
          ip: actor.ip,
        });
      }
    }

    await planRepository.setPlanStatus(planId, "archived");
    await invalidateAllEntitlements();

    const after = await this.getPlan(planId);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.archive",
      entityType: "plan",
      entityId: planId,
      before: planSnapshot(plan),
      after: planSnapshot(after),
      ip: actor.ip,
    });
    return after;
  }

  async activatePlan(planId: number, actor: ActorContext): Promise<PlanDetailRow> {
    const plan = await this.getPlan(planId);
    if (plan.status === "active") return plan;
    await planRepository.setPlanStatus(planId, "active");
    await invalidateAllEntitlements();

    const after = await this.getPlan(planId);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.activate",
      entityType: "plan",
      entityId: planId,
      before: planSnapshot(plan),
      after: planSnapshot(after),
      ip: actor.ip,
    });
    return after;
  }

  async deletePlan(planId: number, actor: ActorContext): Promise<void> {
    const plan = await this.getPlan(planId);
    if (plan.is_default_free) {
      throw new PlanServiceError(409, "DEFAULT_FREE_PLAN", "The default free plan cannot be deleted.");
    }
    const hadSubscribers = await planRepository.hasPlanMigrationHistory(planId);
    const deleted = hadSubscribers ? false : await planRepository.deletePlan(planId);
    if (!deleted) {
      throw new PlanServiceError(
        409,
        "PLAN_HAS_SUBSCRIPTIONS",
        "This plan has subscriptions and can only be archived — existing subscribers keep their access."
      );
    }
    await invalidateAllEntitlements();
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.delete",
      entityType: "plan",
      entityId: planId,
      before: { name: plan.name, slug: plan.slug, status: plan.status },
      ip: actor.ip,
    });
  }

  async saveDraft(
    planId: number,
    input: {
      name?: string;
      slug?: string;
      description?: string | null;
      tagline?: string | null;
      cta?: string | null;
      offer?: string | null;
      discount_badge?: string | null;
      featured?: boolean;
      features?: string[];
      is_public?: boolean;
      sort_order?: number;
      trial_days?: number;
      prices?: PlanPriceInput[];
      entitlements?: Record<string, unknown>;
    },
    actor: ActorContext
  ): Promise<PlanDetailRow> {
    const plan = await this.getPlan(planId);
    if (input.name !== undefined) {
      const existing = await planRepository.getPlanByName(input.name.trim());
      if (existing && existing.id !== planId) {
        throw new PlanServiceError(409, "NAME_TAKEN", `A plan named "${input.name.trim()}" already exists.`);
      }
    }
    if (input.slug !== undefined) {
      const slug = slugify(input.slug);
      const existing = await planRepository.getPlanBySlug(slug);
      if (existing && existing.id !== planId) {
        throw new PlanServiceError(409, "SLUG_TAKEN", `The slug "${slug}" is already in use.`);
      }
      input = { ...input, slug };
    }
    if (input.prices) validatePrices(input.prices);
    const entitlements = input.entitlements ? validateEntitlements(input.entitlements) : undefined;
    const payload = {
      ...input,
      ...(entitlements ? { entitlements } : {}),
      discount_badge:
        input.discount_badge !== undefined ? input.discount_badge?.trim() || null : plan.discount_badge,
      savedAt: new Date().toISOString(),
    };
    await planRepository.saveDraft(planId, payload);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.draft_save",
      entityType: "plan",
      entityId: planId,
      before: plan.draft_payload ?? planSnapshot(plan),
      after: payload,
      ip: actor.ip,
    });
    return this.getPlan(planId);
  }

  async publishDraft(planId: number, actor: ActorContext): Promise<PlanDetailRow> {
    const plan = await this.getPlan(planId);
    const draft = plan.draft_payload as (Record<string, unknown> & { savedAt?: string }) | null;
    if (!draft) {
      throw new PlanServiceError(400, "NO_DRAFT", "There is no draft to publish.");
    }
    const { savedAt: _savedAt, ...input } = draft;
    const updated = await this.updatePlan(
      planId,
      input as Parameters<PlanService["updatePlan"]>[1],
      actor
    );
    if (plan.status !== "active") {
      await planRepository.setPlanStatus(planId, "active");
      await invalidateAllEntitlements();
    }
    await planRepository.clearDraft(planId);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.publish",
      entityType: "plan",
      entityId: planId,
      before: planSnapshot(plan),
      after: planSnapshot(updated),
      ip: actor.ip,
    });
    return this.getPlan(planId);
  }

  async setPlanActive(planId: number, active: boolean, actor: ActorContext): Promise<PlanDetailRow> {
    const plan = await this.getPlan(planId);
    if (plan.is_default_free) {
      throw new PlanServiceError(409, "DEFAULT_FREE_PLAN", "The default free plan cannot be hidden or archived.");
    }
    if (plan.status === "archived") {
      throw new PlanServiceError(409, "PLAN_ARCHIVED", "Restore the plan before changing its active state.");
    }
    const status = active ? "active" : "draft";
    await planRepository.setPlanStatus(planId, status);
    await invalidateAllEntitlements();
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.toggle_active",
      entityType: "plan",
      entityId: planId,
      before: planSnapshot(plan),
      after: planSnapshot(await this.getPlan(planId)),
      ip: actor.ip,
    });
    return this.getPlan(planId);
  }

  async listVersions(planId: number) {
    const versions = await planRepository.listVersions(planId);
    return versions.filter((version) => {
      const snapshot = (version.before ?? version.after) as Record<string, unknown> | null;
      return Boolean(snapshot && typeof snapshot.name === "string");
    });
  }

  async restoreVersion(planId: number, versionId: number, actor: ActorContext): Promise<PlanDetailRow> {
    const versions = await planRepository.listVersions(planId, 100);
    const version = versions.find((row) => row.id === versionId);
    if (!version) throw new PlanServiceError(404, "VERSION_NOT_FOUND", "That version was not found.");
    const snapshot = (version.before ?? version.after) as Record<string, unknown> | null;
    if (!snapshot || typeof snapshot.name !== "string") {
      throw new PlanServiceError(400, "VERSION_NOT_RESTORABLE", "This version does not contain a restorable plan snapshot.");
    }
    const snapshotPrices = Array.isArray(snapshot.prices) ? snapshot.prices : [];
    const prices = snapshotPrices.map((price) => {
      const row = price as Record<string, unknown>;
      return {
        billing_period: row.billing_period as BillingPeriod,
        custom_days: (row.custom_days as number | null | undefined) ?? null,
        amount: Number(row.amount),
        mrp_amount: row.mrp_amount == null ? null : Number(row.mrp_amount),
        tax_inclusive: row.tax_inclusive !== false,
        gateway_price_id: (row.gateway_price_id as string | null | undefined) ?? null,
        is_active: row.is_active !== false,
      } satisfies PlanPriceInput;
    });
    const entitlements = (snapshot.entitlements ?? {}) as Record<string, unknown>;
    return this.saveDraft(
      planId,
      {
        name: String(snapshot.name),
        slug: typeof snapshot.slug === "string" ? snapshot.slug : undefined,
        description: (snapshot.description as string | null | undefined) ?? null,
        tagline: (snapshot.tagline as string | null | undefined) ?? null,
        cta: (snapshot.cta as string | null | undefined) ?? null,
        offer: (snapshot.offer as string | null | undefined) ?? null,
        discount_badge: (snapshot.discount_badge as string | null | undefined) ?? null,
        featured: snapshot.featured === true,
        features: Array.isArray(snapshot.features) ? (snapshot.features as string[]) : [],
        is_public: snapshot.is_public === true,
        sort_order: Number(snapshot.sort_order) || 0,
        trial_days: Number(snapshot.trial_days) || 0,
        prices,
        entitlements,
      },
      actor
    );
  }

  async reorderPlans(planIds: number[], actor: ActorContext): Promise<PlanListRow[]> {
    const plans = await planRepository.listPlans({});
    const known = new Set(plans.map((plan) => plan.id));
    const unique = new Set(planIds);
    if (unique.size !== planIds.length || planIds.some((id) => !known.has(id))) {
      throw new PlanServiceError(400, "INVALID_PLAN_ORDER", "The plan order contains unknown or duplicate plan ids.");
    }
    await planRepository.reorderPlans(planIds);
    await writeSubscriptionAudit({
      actorId: actor.actorId,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "plan.reorder",
      entityType: "plan",
      after: { order: planIds },
      ip: actor.ip,
    });
    return planRepository.listPlans({});
  }
}

export const planService = new PlanService();
