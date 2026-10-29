// User-requested Basic trial workflow. Requests are reviewed by an owner;
// approval converts the user's free subscription into a 7-day Basic trial and
// grants the plan's AI credits as a zero-value paid order.
import { getCreditBalance, insertCreditTransaction } from "../repositories/billing.repository.ts";
import { orderNumber } from "./billing/calculations.ts";
import { withEntitlementLock } from "./entitlements/guards.ts";
import { invalidateEntitlements } from "./entitlement.service.ts";
import { writeSubscriptionAudit } from "./subscriptionAudit.service.ts";
import {
  type AdminTrialRequestRow,
  type TrialPlanRow,
  type TrialRequestRow,
  type TrialRequestStatus,
  type TrialRequestSummary,
  getActiveSubscription,
  getLatestRequestForUser,
  getPendingRequestForUser,
  getRequestById,
  getRequestSummary,
  getTrialPlan,
  getTrialPlanById,
  hasTrialHistory,
  insertRequest,
  insertTrialOrder,
  insertTrialSubscription,
  listRequests,
  markRequestApproved,
  markRequestRejected,
  updateSubscriptionToTrial,
} from "../repositories/trialRequest.repository.ts";

const DEFAULT_TRIAL_CREDITS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TrialEligibilityReason =
  | "eligible"
  | "pending"
  | "active_trial"
  | "active_plan"
  | "trial_used"
  | "unavailable";

export interface TrialRequestView {
  id: number;
  status: TrialRequestStatus;
  requestNote: string | null;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  creditsGranted: number;
}

export interface TrialPlanView {
  id: number;
  name: string;
  slug: string;
  trialDays: number;
  credits: number;
}

export interface TrialStatusView {
  eligible: boolean;
  reason: TrialEligibilityReason;
  plan: TrialPlanView | null;
  activeTrialEndsAt: string | null;
  latestRequest: TrialRequestView | null;
}

export interface AdminTrialRequestView extends TrialRequestView {
  id: number;
  userId: number;
  username: string;
  email: string;
  planName: string;
  planSlug: string;
  reviewedBy: number | null;
  reviewerEmail: string | null;
}

export interface ApproveTrialResult {
  request: TrialRequestView;
  subscriptionId: number;
  orderId: string;
  creditsGranted: number;
}

export interface TrialActor {
  actorId?: number | null;
  actorRole?: string;
  ip?: string | null;
}

export class TrialRequestError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.name = "TrialRequestError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function trialCredits(plan: TrialPlanRow): number {
  return plan.credits > 0 ? plan.credits : DEFAULT_TRIAL_CREDITS;
}

function planView(plan: TrialPlanRow): TrialPlanView {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    trialDays: plan.trial_days,
    credits: trialCredits(plan),
  };
}

function requestView(row: TrialRequestRow): TrialRequestView {
  return {
    id: row.id,
    status: row.status,
    requestNote: row.requestNote,
    reviewNote: row.reviewNote,
    requestedAt: row.requestedAt.toISOString(),
    reviewedAt: iso(row.reviewedAt),
    trialStartedAt: iso(row.trialStartedAt),
    trialEndsAt: iso(row.trialEndsAt),
    creditsGranted: row.creditsGranted,
  };
}

function adminRequestView(row: AdminTrialRequestRow): AdminTrialRequestView {
  return {
    ...requestView(row),
    id: row.id,
    userId: row.userId,
    username: row.username,
    email: row.email,
    planName: row.planName,
    planSlug: row.planSlug,
    reviewedBy: row.reviewedBy,
    reviewerEmail: row.reviewerEmail,
  };
}

function normalizeNote(note: string | null | undefined): string | null {
  const trimmed = (note ?? "").trim();
  return trimmed ? trimmed.slice(0, 500) : null;
}

function isPendingUniqueViolation(error: unknown): boolean {
  const candidate = error as { code?: string; constraint?: string } | null;
  return (
    candidate?.code === "23505" &&
    (candidate.constraint === "uq_trial_requests_pending_user" ||
      candidate.constraint === "uq_trial_requests_approved_user")
  );
}

/** Current trial eligibility for the signed-in user. */
async function loadTrialStatus(userId: number): Promise<TrialStatusView> {
  const [plan, active, latestRequest, history] = await Promise.all([
    getTrialPlan(),
    getActiveSubscription(userId),
    getLatestRequestForUser(userId),
    hasTrialHistory(userId),
  ]);

  const activeTrial = active?.status === "trialing";
  let reason: TrialEligibilityReason;
  if (activeTrial) {
    reason = "active_trial";
  } else if (active && !active.is_default_free) {
    reason = "active_plan";
  } else if (latestRequest?.status === "pending") {
    reason = "pending";
  } else if (history) {
    reason = "trial_used";
  } else if (!plan) {
    reason = "unavailable";
  } else {
    reason = "eligible";
  }

  return {
    eligible: reason === "eligible",
    reason,
    plan: plan ? planView(plan) : null,
    activeTrialEndsAt: activeTrial ? iso(active.trial_end) : null,
    latestRequest: latestRequest ? requestView(latestRequest) : null,
  };
}

export class TrialRequestService {
  async getStatus(userId: number): Promise<TrialStatusView> {
    return loadTrialStatus(userId);
  }

  async requestTrial(userId: number, note?: string | null): Promise<TrialRequestView> {
    try {
      return await withEntitlementLock(userId, async (client) => {
        const plan = await getTrialPlan(client);
        if (!plan) {
          throw new TrialRequestError(
            409,
            "TRIAL_UNAVAILABLE",
            "The Basic trial is not available right now."
          );
        }

        const active = await getActiveSubscription(userId, client, true);
        if (active?.status === "trialing") {
          throw new TrialRequestError(409, "TRIAL_ACTIVE", "You already have an active trial.");
        }
        if (active && !active.is_default_free) {
          throw new TrialRequestError(
            409,
            "PLAN_ACTIVE",
            "You already have an active paid plan."
          );
        }

        if (await hasTrialHistory(userId, client)) {
          throw new TrialRequestError(
            409,
            "TRIAL_ALREADY_USED",
            "Your free trial has already been used."
          );
        }

        const pending = await getPendingRequestForUser(userId, client, true);
        if (pending) {
          throw new TrialRequestError(
            409,
            "REQUEST_PENDING",
            "Your trial request is already pending review."
          );
        }

        const requestId = await insertRequest(
          { userId, planId: plan.id, note: normalizeNote(note) },
          client
        );
        const created = await getRequestById(requestId, client);
        if (!created) {
          throw new TrialRequestError(500, "REQUEST_FAILED", "Could not create the trial request.");
        }
        return requestView(created);
      });
    } catch (error) {
      if (isPendingUniqueViolation(error)) {
        throw new TrialRequestError(
          409,
          "REQUEST_PENDING",
          "Your trial request is already pending review."
        );
      }
      throw error;
    }
  }

  async listForAdmin(filters: {
    status?: TrialRequestStatus;
    search?: string;
  }): Promise<{ requests: AdminTrialRequestView[]; summary: TrialRequestSummary }> {
    const [requests, summary] = await Promise.all([
      listRequests(filters),
      getRequestSummary(),
    ]);
    return { requests: requests.map(adminRequestView), summary };
  }

  async approve(
    requestId: number,
    actor: TrialActor,
    reviewNote?: string | null
  ): Promise<ApproveTrialResult> {
    const preview = await getRequestById(requestId);
    if (!preview) {
      throw new TrialRequestError(404, "REQUEST_NOT_FOUND", "Trial request not found.");
    }

    const result = await withEntitlementLock(preview.userId, async (client) => {
      const request = await getRequestById(requestId, client, true);
      if (!request) {
        throw new TrialRequestError(404, "REQUEST_NOT_FOUND", "Trial request not found.");
      }
      if (request.status !== "pending") {
        throw new TrialRequestError(
          409,
          "REQUEST_NOT_PENDING",
          "This trial request has already been reviewed."
        );
      }

      const plan = await getTrialPlanById(request.planId, client);
      if (!plan) {
        throw new TrialRequestError(
          409,
          "TRIAL_UNAVAILABLE",
          "The requested trial plan is no longer available."
        );
      }

      const active = await getActiveSubscription(request.userId, client, true);
      if (active?.status === "trialing") {
        throw new TrialRequestError(409, "TRIAL_ACTIVE", "This user already has an active trial.");
      }
      if (active && !active.is_default_free) {
        throw new TrialRequestError(
          409,
          "PLAN_ACTIVE",
          "This user already has an active paid plan."
        );
      }

      if (await hasTrialHistory(request.userId, client)) {
        throw new TrialRequestError(
          409,
          "TRIAL_ALREADY_USED",
          "This user has already used a trial."
        );
      }

      const clock = await client.query("SELECT CURRENT_TIMESTAMP AS now");
      const now = new Date(clock.rows[0].now as string | Date);
      const trialEndsAt = new Date(now.getTime() + plan.trial_days * DAY_MS);
      const credits = trialCredits(plan);
      const note = normalizeNote(reviewNote);
      const actorId = actor.actorId ?? null;
      const requestNotes = `Basic trial approved from request #${request.id}`;

      let subscriptionId: number;
      if (active?.is_default_free) {
        await updateSubscriptionToTrial(
          {
            subscriptionId: active.id,
            planId: plan.id,
            startsAt: now,
            trialEndsAt,
            notes: requestNotes,
            createdBy: actorId,
          },
          client
        );
        subscriptionId = active.id;
      } else {
        subscriptionId = await insertTrialSubscription(
          {
            userId: request.userId,
            planId: plan.id,
            startsAt: now,
            trialEndsAt,
            notes: requestNotes,
            createdBy: actorId,
          },
          client
        );
      }

      const order = await insertTrialOrder(
        {
          orderNo: orderNumber(now),
          userId: request.userId,
          planId: plan.id,
          subscriptionId,
          startsAt: now,
          expiresAt: trialEndsAt,
          validityDays: plan.trial_days,
          credits,
          notes: requestNotes,
        },
        client
      );

      if (credits > 0) {
        const balance = await getCreditBalance(String(request.userId), client);
        await insertCreditTransaction(
          {
            userId: String(request.userId),
            orderId: order.id,
            amount: credits,
            reason: "trial_credit_grant",
            refId: order.orderNo,
            balanceAfter: balance.total,
          },
          client
        );
      }

      await markRequestApproved(
        {
          requestId: request.id,
          reviewedBy: actorId,
          subscriptionId,
          orderId: order.id,
          trialStartedAt: now,
          trialEndsAt,
          creditsGranted: credits,
          reviewNote: note,
        },
        client
      );

      const approved = await getRequestById(request.id, client);
      if (!approved) {
        throw new TrialRequestError(500, "REQUEST_FAILED", "Could not load the approved request.");
      }

      return {
        request: approved,
        subscriptionId,
        orderId: order.id,
        creditsGranted: credits,
        before: request,
        trialEndsAt,
      };
    });

    await invalidateEntitlements(result.request.userId).catch((error) => {
      console.error("Failed to invalidate entitlements after trial approval", error);
    });
    await writeSubscriptionAudit({
      actorId: actor.actorId ?? null,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "subscription.trial_grant",
      entityType: "trial_request",
      entityId: result.request.id,
      before: { status: result.before.status, requestNote: result.before.requestNote },
      after: {
        status: result.request.status,
        subscriptionId: result.subscriptionId,
        orderId: result.orderId,
        creditsGranted: result.creditsGranted,
        trialEndsAt: iso(result.trialEndsAt),
      },
      reason: result.request.reviewNote,
      ip: actor.ip ?? null,
    });

    return {
      request: requestView(result.request),
      subscriptionId: result.subscriptionId,
      orderId: result.orderId,
      creditsGranted: result.creditsGranted,
    };
  }

  async reject(
    requestId: number,
    actor: TrialActor,
    reviewNote?: string | null
  ): Promise<TrialRequestView> {
    const before = await getRequestById(requestId);
    if (!before) {
      throw new TrialRequestError(404, "REQUEST_NOT_FOUND", "Trial request not found.");
    }

    const note = normalizeNote(reviewNote);
    const updated = await markRequestRejected({
      requestId,
      reviewedBy: actor.actorId ?? null,
      reviewNote: note,
    });
    if (!updated) {
      throw new TrialRequestError(
        409,
        "REQUEST_NOT_PENDING",
        "This trial request has already been reviewed."
      );
    }

    const request = await getRequestById(requestId);
    if (!request) {
      throw new TrialRequestError(500, "REQUEST_FAILED", "Could not load the rejected request.");
    }

    await writeSubscriptionAudit({
      actorId: actor.actorId ?? null,
      actorRole: actor.actorRole ?? "platform_admin",
      action: "subscription.trial_reject",
      entityType: "trial_request",
      entityId: request.id,
      before: { status: before.status },
      after: { status: request.status, reviewNote: request.reviewNote },
      reason: note,
      ip: actor.ip ?? null,
    });

    return requestView(request);
  }
}

export const trialRequestService = new TrialRequestService();
