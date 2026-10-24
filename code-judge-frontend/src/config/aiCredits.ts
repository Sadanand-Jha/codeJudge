/* ============================================
   AI Credits — Central Configuration
   Single source of truth for usage-based AI billing.
   Add new AI features here without touching billing logic.
   ============================================ */

/* ============================================
   Subscription Plans - Feature Access
   Subscriptions unlock WHAT features users can access
   ============================================ */
export interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  audience: "student" | "creator" | "both";
  features: AISubscriptionFeature[];
  monthlyCredits: number;
  description: string;
}

export interface AISubscriptionFeature {
  id: AISubscriptionFeatureId;
  label: string;
}

export type AISubscriptionFeatureId =
  | "ai-companion"
  | "ai-hint"
  | "ai-debugger"
  | "ai-complexity"
  | "ai-explanation"
  | "ai-code-review"
  | "ai-quiz-generation"
  | "ai-question-improvement"
  | "ai-test-cases"
  | "ai-difficulty"
  | "ai-report-generation";

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    audience: "both",
    features: [],
    monthlyCredits: 0,
    description: "Basic access with no AI features",
  },
  {
    id: "student-pro",
    name: "Student Pro",
    monthlyPrice: 299,
    audience: "student",
    features: [
      { id: "ai-companion", label: "AI Coding Companion" },
      { id: "ai-hint", label: "AI Hint" },
      { id: "ai-debugger", label: "AI Debugger" },
      { id: "ai-explanation", label: "AI Explanation" },
      { id: "ai-complexity", label: "AI Complexity Analysis" },
    ],
    monthlyCredits: 300,
    description: "AI-powered learning assistance for students",
  },
  {
    id: "creator-pro",
    name: "Creator Pro",
    monthlyPrice: 599,
    audience: "creator",
    features: [
      { id: "ai-quiz-generation", label: "AI Quiz Generation" },
      { id: "ai-question-improvement", label: "AI Question Improvement" },
      { id: "ai-test-cases", label: "AI Test Case Generation" },
      { id: "ai-report-generation", label: "AI Report Generation" },
      { id: "ai-difficulty", label: "AI Difficulty Estimation" },
    ],
    monthlyCredits: 800,
    description: "AI-powered quiz creation and management",
  },
  {
    id: "ultimate",
    name: "Ultimate",
    monthlyPrice: 899,
    audience: "both",
    features: [
      { id: "ai-companion", label: "AI Coding Companion" },
      { id: "ai-hint", label: "AI Hint" },
      { id: "ai-debugger", label: "AI Debugger" },
      { id: "ai-explanation", label: "AI Explanation" },
      { id: "ai-complexity", label: "AI Complexity Analysis" },
      { id: "ai-code-review", label: "AI Code Review" },
      { id: "ai-quiz-generation", label: "AI Quiz Generation" },
      { id: "ai-question-improvement", label: "AI Question Improvement" },
      { id: "ai-test-cases", label: "AI Test Case Generation" },
      { id: "ai-report-generation", label: "AI Report Generation" },
      { id: "ai-difficulty", label: "AI Difficulty Estimation" },
    ],
    monthlyCredits: 1800,
    description: "Complete AI suite for both students and creators",
  },
];

/* Feature to subscription mapping for quick lookup */
export const featureToSubscriptions: Record<AISubscriptionFeatureId, string[]> = {
  "ai-companion": ["student-pro", "ultimate"],
  "ai-hint": ["student-pro", "ultimate"],
  "ai-debugger": ["student-pro", "ultimate"],
  "ai-complexity": ["student-pro", "ultimate"],
  "ai-explanation": ["student-pro", "ultimate"],
  "ai-code-review": ["ultimate"],
  "ai-quiz-generation": ["creator-pro", "ultimate"],
  "ai-question-improvement": ["creator-pro", "ultimate"],
  "ai-test-cases": ["creator-pro", "ultimate"],
  "ai-difficulty": ["creator-pro", "ultimate"],
  "ai-report-generation": ["creator-pro", "ultimate"],
};

/* ============================================
   AI Credit Costs - Usage Pricing
   Credits determine HOW MUCH users can use features
   ============================================ */
export interface AICreditCost {
  id: AICreditFeatureId;
  label: string;
  credits: number;
  audience: "student" | "creator" | "both";
  description: string;
}

export type AICreditFeatureId =
  | "ai-hint"
  | "ai-code-review"
  | "ai-debugging"
  | "ai-test-cases"
  | "ai-quiz-generation"
  | "ai-explanation"
  | "ai-complexity"
  | "ai-question-improvement"
  | "ai-difficulty"
  | "ai-report-generation";

export const AI_CREDIT_COSTS: AICreditCost[] = [
  { id: "ai-hint", label: "AI Hint", credits: 1, audience: "student", description: "Progressive hint without revealing the solution" },
  { id: "ai-code-review", label: "AI Code Review", credits: 3, audience: "student", description: "Full review of your submitted solution" },
  { id: "ai-debugging", label: "AI Debugging", credits: 2, audience: "student", description: "Explain runtime errors and suggest fixes" },
  { id: "ai-test-cases", label: "AI Test Case Generation", credits: 5, audience: "creator", description: "Generate hidden & public test cases" },
  { id: "ai-quiz-generation", label: "AI Quiz Generation", credits: 8, audience: "creator", description: "Generate a full quiz from a topic" },
  { id: "ai-explanation", label: "AI Explanation", credits: 2, audience: "student", description: "Explain why your answer was wrong" },
  { id: "ai-complexity", label: "AI Complexity Analysis", credits: 1, audience: "student", description: "Time & space complexity of your code" },
  { id: "ai-question-improvement", label: "AI Question Improvement", credits: 3, audience: "creator", description: "Polish grammar, difficulty, quality" },
  { id: "ai-difficulty", label: "AI Difficulty Analysis", credits: 2, audience: "creator", description: "Estimate question difficulty" },
  { id: "ai-report-generation", label: "AI Report Generation", credits: 4, audience: "creator", description: "Generate performance reports" },
];

export const creditCostMap: Record<AICreditFeatureId, number> = Object.fromEntries(
  AI_CREDIT_COSTS.map((c) => [c.id, c.credits])
) as Record<AICreditFeatureId, number>;

/* Subscription feature map for quick lookup */
export const subscriptionFeatureMap: Record<AISubscriptionFeatureId, string> = Object.fromEntries(
  SUBSCRIPTION_PLANS.flatMap((plan) =>
    plan.features.map((f) => [f.id, plan.id])
  )
) as Record<AISubscriptionFeatureId, string>;

/* ============================================
   Monthly Included Credits per plan
   ============================================ */
export interface PlanCreditAllowance {
  planId: string;
  planName: string;
  monthlyCredits: number;
}

export const PLAN_CREDIT_ALLOWANCES: PlanCreditAllowance[] = [
  { planId: "free", planName: "Free", monthlyCredits: 0 },
  { planId: "student-pro", planName: "Student Pro", monthlyCredits: 300 },
  { planId: "creator-pro", planName: "Creator Pro", monthlyCredits: 800 },
  { planId: "ultimate", planName: "Ultimate", monthlyCredits: 1800 },
];

/* ============================================
   Fair Usage Limits
   ============================================ */
export interface FairUsageLimits {
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  maxConcurrentRequests: number;
  maxPromptSizeKB: number;
  maxResponseSizeKB: number;
  queueLargeRequests: boolean;
}

export const FAIR_USAGE_LIMITS: FairUsageLimits = {
  maxRequestsPerHour: 100,
  maxRequestsPerDay: 500,
  maxConcurrentRequests: 5,
  maxPromptSizeKB: 50,
  maxResponseSizeKB: 200,
  queueLargeRequests: true,
};

/* ============================================
   Credit Packs - Purchased Credits
   ============================================ */
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  description: string;
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: "starter", name: "Starter", credits: 250, price: 99, description: "For light AI usage" },
  { id: "standard", name: "Standard", credits: 1000, price: 299, popular: true, description: "Best value for regular users" },
  { id: "power", name: "Power User", credits: 5000, price: 999, description: "For heavy AI users" },
  { id: "institution", name: "Institution", credits: 10000, price: 1799, description: "For schools & clubs" },
];

/* ============================================
   Abuse Detection Rules
   ============================================ */
export interface AbuseRule {
  id: string;
  label: string;
  threshold: number;
  windowMs: number;
  action: "slow" | "captcha" | "notify" | "escalate";
}

export const ABUSE_RULES: AbuseRule[] = [
  { id: "identical-prompts", label: "Repeated identical prompts", threshold: 5, windowMs: 60_000, action: "slow" },
  { id: "high-frequency", label: "Very high request frequency", threshold: 30, windowMs: 60_000, action: "slow" },
  { id: "bot-like", label: "Bot-like behavior", threshold: 50, windowMs: 60_000, action: "captcha" },
  { id: "no-platform-activity", label: "AI calls without platform activity", threshold: 20, windowMs: 300_000, action: "notify" },
  { id: "multi-account", label: "Multiple accounts farming usage", threshold: 3, windowMs: 600_000, action: "escalate" },
  { id: "scripted", label: "Large-scale scripted requests", threshold: 100, windowMs: 300_000, action: "escalate" },
];

/* ============================================
   Rate Limiting
   ============================================ */
export interface RateLimitConfig {
  maxPerMinute: number;
  maxConcurrentJobs: number;
  queueExcess: boolean;
  exponentialBackoffBaseMs: number;
  exponentialBackoffFactor: number;
}

export const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxPerMinute: 20,
  maxConcurrentJobs: 5,
  queueExcess: true,
  exponentialBackoffBaseMs: 1000,
  exponentialBackoffFactor: 2,
};

/* ============================================
   Low-credit threshold
   ============================================ */
export const LOW_CREDIT_THRESHOLD = 0.2; // 20% of monthly allowance

/* ============================================
   Generation plans (Plus / Pro / Max storefront)
   --------------------------------------------
   INITIAL PROPOSAL — mirror of the backend billing configuration.
   Prices, paper estimates, reasoning levels and model identifiers must
   be read from here, never duplicated in components. Model names and
   token rates below are approximate intended-architecture values, NOT
   verified provider quotes: confirm availability and live pricing
   before enabling production usage. Everything here is adjustable
   without redesigning the frontend.
   Billing: Plus is a one-time pack; Pro and Max are monthly plans.
   Prices are in INR, GST-inclusive (no separate tax line at checkout).
   Paper counts are estimates for typical papers (retrieval +
   generation + evaluation + refinement), not guaranteed entitlements.
   ============================================ */
/* ============================================
   Credit packs (one-time purchases — no subscriptions)
   --------------------------------------------
   Mirror of the backend billing configuration. Pack sizes, prices,
   CTAs and blurbs must be read from here, never duplicated in
   components. Prices are in INR, GST-inclusive.
   ============================================ */
export interface CreditPurchasePack {
  id: string;
  name: string;
  credits: number;
  /** Price in INR, GST-inclusive. */
  price: number;
  cta: string;
  blurb: string;
  popular?: boolean;
  /** How long purchased credits stay valid, in months from purchase. */
  validityMonths: number;
}

export const CREDIT_PURCHASE_PACKS: CreditPurchasePack[] = [
  {
    id: "teacher",
    name: "Teacher Pack",
    credits: 50,
    price: 99,
    cta: "Choose Teacher Pack",
    blurb: "For regular question-paper creation.",
    popular: true,
    validityMonths: 6,
  },
  {
    id: "master",
    name: "Master Pack",
    credits: 125,
    price: 199,
    cta: "Get Master Pack",
    blurb: "For frequent paper generation and advanced AI workflows.",
    validityMonths: 6,
  },
];

/** Validity for a pack id — falls back to the default when unknown. */
export function getPackValidityMonths(packId: string): number {
  return CREDIT_PURCHASE_PACKS.find((p) => p.id === packId)?.validityMonths ?? CREDIT_VALIDITY_MONTHS;
}

/* ============================================
   Per-plan usage budgets (cost protection)
   --------------------------------------------
   Central backend-mirror configuration. The frontend never enforces
   these — enforcement is server-side. Approximate rates; verify with
   the provider before production. Token rates are USD per 1M tokens.
   ============================================ */
export interface AIModelBudget {
  planId: AIEffortLevel["id"];
  provider: string;
  generatorModel: string;
  evaluatorModel: string;
  fallbackModel: string;
  /** USD per 1M tokens. */
  inputRate: number;
  /** USD per 1M cached-input tokens (0 when unsupported). */
  cachedInputRate: number;
  /** USD per 1M output tokens. */
  outputRate: number;
  /** Max refinement/evaluation iterations per expensive workflow. */
  maxIterations: number;
  /** Max retries per failed operation. */
  maxRetries: number;
  /** Output-token budget per complete paper (all calls combined). */
  perPaperTokenBudget: number;
  /** Included usage per billing period; resets monthly for plans. */
  monthlyReset: boolean;
}

export const AI_MODEL_BUDGETS: AIModelBudget[] = [
  {
    planId: "plus",
    provider: "OpenRouter",
    generatorModel: "meta-llama/llama-3.3-70b-instruct",
    evaluatorModel: "qwen/qwen-2.5-72b-instruct",
    fallbackModel: "meta-llama/llama-3.3-70b-instruct",
    inputRate: 0.35,
    cachedInputRate: 0.0,
    outputRate: 0.4,
    maxIterations: 1,
    maxRetries: 2,
    perPaperTokenBudget: 60_000,
    monthlyReset: false,
  },
  {
    planId: "pro",
    provider: "DeepSeek",
    generatorModel: "deepseek-chat",
    evaluatorModel: "deepseek-reasoner",
    fallbackModel: "deepseek-chat",
    inputRate: 0.27,
    cachedInputRate: 0.07,
    outputRate: 1.1,
    maxIterations: 3,
    maxRetries: 3,
    perPaperTokenBudget: 150_000,
    monthlyReset: true,
  },
  {
    planId: "max",
    provider: "DeepSeek",
    generatorModel: "deepseek-reasoner",
    evaluatorModel: "deepseek-reasoner",
    fallbackModel: "deepseek-chat",
    inputRate: 0.55,
    cachedInputRate: 0.14,
    outputRate: 2.19,
    maxIterations: 6,
    maxRetries: 3,
    perPaperTokenBudget: 300_000,
    monthlyReset: true,
  },
];

/** How long purchased credits stay valid, in months from purchase. */
export const CREDIT_VALIDITY_MONTHS = 6;

/* ============================================
   AI effort levels (question-paper generation)
   --------------------------------------------
   Credit charge per completed paper at each effort level. Read from
   here (backend mirror) — never hardcode costs in components.
   ============================================ */
export interface AIEffortLevel {
  id: "plus" | "pro" | "max";
  label: string;
  blurb: string;
  /** Credits charged per generated paper at this effort level. */
  creditsPerPaper: number;
}

export const AI_EFFORT_LEVELS: AIEffortLevel[] = [
  {
    id: "plus",
    label: "Plus",
    blurb: "Quick generation for straightforward questions and papers.",
    creditsPerPaper: 5,
  },
  {
    id: "pro",
    label: "Pro",
    blurb: "More detailed syllabus alignment and validation.",
    creditsPerPaper: 15,
  },
  {
    id: "max",
    label: "Max",
    blurb: "Advanced multi-step generation, refinement and quality checks.",
    creditsPerPaper: 50,
  },
];
