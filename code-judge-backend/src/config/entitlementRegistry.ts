// Central entitlement registry — the single source of truth for every limit or
// feature flag a plan can grant. Adding a new entitlement only requires adding
// an entry here (the database stores arbitrary key/value pairs, so no
// migration is needed) and optionally overriding the value per plan in the
// /platform console.
//
// `default` is the value used for users without an active plan (and by the
// seeded Free plan). For numbers, -1 means unlimited.

export type EntitlementType = "boolean" | "number";
export type EntitlementValue = number | boolean;

export type EntitlementCategory =
  | "quizzes"
  | "questions"
  | "participants"
  | "pdf"
  | "branding"
  | "ai"
  | "storage"
  | "team";

export interface EntitlementDefinition {
  key: string;
  label: string;
  description: string;
  type: EntitlementType;
  category: EntitlementCategory;
  default: EntitlementValue;
  /** Unit shown next to number inputs in the admin UI. */
  unit?: string;
}

/** Sentinel for number entitlements meaning "no limit". */
export const UNLIMITED = -1;

export const ENTITLEMENT_REGISTRY: EntitlementDefinition[] = [
  {
    key: "max_quizzes",
    label: "Total quizzes",
    description: "Maximum quizzes the account can own at any time.",
    type: "number",
    category: "quizzes",
    default: 10,
    unit: "quizzes",
  },
  {
    key: "max_questions_per_quiz",
    label: "Questions per quiz",
    description: "Maximum questions a single quiz can contain.",
    type: "number",
    category: "questions",
    default: 30,
    unit: "questions",
  },
  {
    key: "max_participants_per_quiz",
    label: "Participants per quiz",
    description: "Maximum participants who can join a single quiz.",
    type: "number",
    category: "participants",
    default: UNLIMITED,
    unit: "participants",
  },
  {
    key: "max_rooms",
    label: "Rooms",
    description: "Maximum active rooms the account can run at the same time.",
    type: "number",
    category: "participants",
    default: 1,
    unit: "rooms",
  },
  {
    key: "ai_credits_per_month",
    label: "AI credits / month",
    description: "Monthly AI credits included with the plan.",
    type: "number",
    category: "ai",
    default: 0,
    unit: "credits / month",
  },
  {
    key: "max_monthly_attempts",
    label: "Attempts per month",
    description: "Maximum student attempts across all quizzes per calendar month.",
    type: "number",
    category: "participants",
    default: UNLIMITED,
    unit: "attempts / month",
  },
  {
    key: "pdf_download",
    label: "PDF download",
    description: "Download question papers and reports as PDF.",
    type: "boolean",
    category: "pdf",
    default: true,
  },
  {
    key: "answer_key_pdf",
    label: "Answer key PDF",
    description: "Include answers in generated PDF exports.",
    type: "boolean",
    category: "pdf",
    default: true,
  },
  {
    key: "custom_pdf_header",
    label: "Custom PDF header",
    description: "Use a custom header/footer on exported PDFs.",
    type: "boolean",
    category: "pdf",
    default: true,
  },
  {
    key: "remove_branding",
    label: "Remove branding",
    description: "Hide QuizSupport branding from student-facing pages.",
    type: "boolean",
    category: "branding",
    default: false,
  },
  {
    key: "ai_features",
    label: "AI features",
    description: "Access AI question generation and assistance tools.",
    type: "boolean",
    category: "ai",
    default: true,
  },
  {
    key: "storage_mb",
    label: "Storage",
    description: "Total media and file storage.",
    type: "number",
    category: "storage",
    default: UNLIMITED,
    unit: "MB",
  },
  {
    key: "team_members",
    label: "Team members",
    description: "Additional team members that can collaborate on the account.",
    type: "number",
    category: "team",
    default: 0,
    unit: "members",
  },
];

const REGISTRY_BY_KEY: Map<string, EntitlementDefinition> = new Map(
  ENTITLEMENT_REGISTRY.map((entry) => [entry.key, entry])
);

export function getEntitlementDefinition(key: string): EntitlementDefinition | undefined {
  return REGISTRY_BY_KEY.get(key);
}

export function isKnownEntitlementKey(key: string): boolean {
  return REGISTRY_BY_KEY.has(key);
}

/** Registry defaults as a plain record (free-plan fallback values). */
export function getEntitlementDefaults(): Record<string, EntitlementValue> {
  const defaults: Record<string, EntitlementValue> = {};
  for (const entry of ENTITLEMENT_REGISTRY) defaults[entry.key] = entry.default;
  return defaults;
}

/**
 * Coerce a raw database/overrides value into the type declared by the
 * registry. Unknown keys are ignored; malformed values fall back to the
 * registry default so a bad row can never crash entitlement resolution.
 */
export function coerceEntitlementValue(
  key: string,
  raw: unknown
): EntitlementValue | undefined {
  const definition = REGISTRY_BY_KEY.get(key);
  if (!definition) return undefined;

  if (definition.type === "boolean") {
    if (typeof raw === "boolean") return raw;
    if (raw === "true" || raw === "false") return raw === "true";
    return Boolean(definition.default);
  }

  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "" && Number.isFinite(Number(raw))) {
    return Number(raw);
  }
  return Number(definition.default);
}
