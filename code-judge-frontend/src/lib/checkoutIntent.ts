export const PLAN_BUNDLE_INTENT_KEY = "qs:plan-bundle-intent";

export interface PlanBundleIntent {
  planSlug: string;
  bundleId: number;
}

export function savePlanBundleIntent(intent: PlanBundleIntent): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(PLAN_BUNDLE_INTENT_KEY, JSON.stringify(intent));
  } catch {
    // Intent is a convenience; checkout still works without storage.
  }
}

export function consumePlanBundleIntent(planSlug: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(PLAN_BUNDLE_INTENT_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PLAN_BUNDLE_INTENT_KEY);
    const parsed = JSON.parse(raw) as Partial<PlanBundleIntent>;
    if (parsed.planSlug !== planSlug || typeof parsed.bundleId !== "number") {
      return null;
    }
    return parsed.bundleId;
  } catch {
    return null;
  }
}
