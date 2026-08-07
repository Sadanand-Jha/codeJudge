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