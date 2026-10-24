export {
  getEntitlements,
  getActivePlanOrder,
  getCreditOrders,
  getPlanByCode,
  getPlanById,
  loadEntitlementSnapshot,
} from "./repository.ts";

export {
  addDays,
  allocateCredits,
  badgeTierForPlan,
  computePlanPlacement,
  daysLeftUntil,
  isOrderActive,
  selectActivePlanOrder,
} from "./plans.ts";

export { resolveEntitlements } from "./resolver.ts";

export { EntitlementError, sendEntitlementError } from "./errors.ts";

export {
  assertEmailQuota,
  assertFeature,
  assertMemberQuota,
  assertPlanActive,
  assertQuizQuota,
  assertRoomQuota,
  debitAiCredits,
  recordUsage,
  refundAiCredits,
  withEntitlementLock,
} from "./guards.ts";

export type {
  BadgeState,
  BadgeTier,
  CreditAllocation,
  CreditAllocationResult,
  CreditOrder,
  CreditSummary,
  EntitlementBadge,
  EntitlementErrorCode,
  EntitlementErrorDetails,
  EntitlementFeatures,
  EntitlementLimits,
  EntitlementSnapshot,
  EntitlementUsage,
  Entitlements,
  MonthlyPlan,
  PlanEntitlement,
  PlanFeature,
  PlanOrder,
  PlanPlacement,
  PlanStatus,
  Queryable,
} from "./types.ts";
