/**
 * Demo-only data for the /platform/ai-ops console.
 *
 * Every value in this module is SAMPLE data for UI development. It is not
 * live provider telemetry and prices are illustrative examples, not
 * guaranteed current rates. Replace with API responses during backend
 * integration — UI components must not import anything else.
 */

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const round = (value: number, digits = 0) => Number(value.toFixed(digits));

/* ------------------------------------------------------------------ */
/* Shared unions + labels                                              */
/* ------------------------------------------------------------------ */

export type DemoRange = "24h" | "7d" | "30d";

export const RANGE_LABELS: Record<DemoRange, string> = {
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

export interface FeatureDef {
  id: string;
  label: string;
}

export const FEATURES: FeatureDef[] = [
  { id: "tutor_chat", label: "Tutor chat" },
  { id: "quiz_generation", label: "Quiz question generation" },
  { id: "answer_explanation", label: "Answer explanation" },
  { id: "pdf_topic_extraction", label: "PDF topic extraction" },
  { id: "syllabus_mapping", label: "Syllabus mapping" },
  { id: "paper_generation", label: "Question paper generation" },
  { id: "question_selection", label: "Question selection" },
  { id: "json_repair", label: "JSON repair" },
];

export const featureLabel = (id: string) => FEATURES.find((f) => f.id === id)?.label ?? id;

export const PROVIDERS = ["OpenAI", "Anthropic", "Google", "Meta", "DeepSeek"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export const CAPABILITIES = ["chat", "reasoning", "vision", "tools", "json-mode", "long-context"] as const;
export type Capability = (typeof CAPABILITIES)[number];

export type AiTier = "fast" | "balanced" | "advanced" | "auto";
export const TIER_LABELS: Record<AiTier, string> = {
  fast: "Fast & Economical",
  balanced: "Balanced",
  advanced: "Advanced Reasoning",
  auto: "Automatic",
};

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

export type ModelStatus = "active" | "degraded" | "disabled" | "deprecated";

export interface PricePoint {
  label: string;
  input: number;
  output: number;
}

export interface AiModel {
  id: string;
  name: string;
  provider: ProviderName;
  modelId: string;
  inputPricePerM: number;
  outputPricePerM: number;
  contextWindow: number;
  capabilities: Capability[];
  status: ModelStatus;
  lastPriceUpdate: string;
  tierHint: AiTier;
  priceHistory: PricePoint[];
}

const priceHistory = (seed: number, baseIn: number, baseOut: number): PricePoint[] => {
  const rng = mulberry32(seed);
  const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  let inPrice = baseIn * (1 + rng() * 0.28);
  let outPrice = baseOut * (1 + rng() * 0.28);
  return months.map((label, i) => {
    if (i > 0) {
      inPrice = i === 3 ? inPrice * 0.82 : inPrice * (0.97 + rng() * 0.04);
      outPrice = i === 3 ? outPrice * 0.85 : outPrice * (0.97 + rng() * 0.04);
    }
    return { label, input: round(inPrice, 2), output: round(outPrice, 2) };
  });
};

export const MODELS: AiModel[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o mini",
    provider: "OpenAI",
    modelId: "gpt-4o-mini-2026-07",
    inputPricePerM: 18,
    outputPricePerM: 72,
    contextWindow: 128_000,
    capabilities: ["chat", "vision", "tools", "json-mode"],
    status: "active",
    lastPriceUpdate: "2026-07-14",
    tierHint: "fast",
    priceHistory: priceHistory(11, 18, 72),
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    modelId: "gpt-4.1-2026-04",
    inputPricePerM: 165,
    outputPricePerM: 660,
    contextWindow: 1_000_000,
    capabilities: ["chat", "vision", "tools", "json-mode", "long-context"],
    status: "active",
    lastPriceUpdate: "2026-04-20",
    tierHint: "balanced",
    priceHistory: priceHistory(12, 165, 660),
  },
  {
    id: "o4-mini",
    name: "o4-mini (reasoning)",
    provider: "OpenAI",
    modelId: "o4-mini-2026-06",
    inputPricePerM: 92,
    outputPricePerM: 368,
    contextWindow: 200_000,
    capabilities: ["chat", "reasoning", "tools", "json-mode"],
    status: "active",
    lastPriceUpdate: "2026-06-02",
    tierHint: "advanced",
    priceHistory: priceHistory(13, 92, 368),
  },
  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    provider: "Anthropic",
    modelId: "claude-sonnet-4-6",
    inputPricePerM: 250,
    outputPricePerM: 1240,
    contextWindow: 200_000,
    capabilities: ["chat", "vision", "tools", "json-mode", "long-context"],
    status: "active",
    lastPriceUpdate: "2026-05-28",
    tierHint: "balanced",
    priceHistory: priceHistory(14, 250, 1240),
  },
  {
    id: "claude-haiku",
    name: "Claude Haiku",
    provider: "Anthropic",
    modelId: "claude-haiku-4-5",
    inputPricePerM: 66,
    outputPricePerM: 330,
    contextWindow: 200_000,
    capabilities: ["chat", "vision", "tools", "json-mode"],
    status: "active",
    lastPriceUpdate: "2026-05-28",
    tierHint: "fast",
    priceHistory: priceHistory(15, 66, 330),
  },
  {
    id: "gemini-flash",
    name: "Gemini Flash",
    provider: "Google",
    modelId: "gemini-3-flash",
    inputPricePerM: 12,
    outputPricePerM: 40,
    contextWindow: 1_000_000,
    capabilities: ["chat", "vision", "tools", "json-mode", "long-context"],
    status: "active",
    lastPriceUpdate: "2026-08-01",
    tierHint: "fast",
    priceHistory: priceHistory(16, 12, 40),
  },
  {
    id: "gemini-pro",
    name: "Gemini Pro",
    provider: "Google",
    modelId: "gemini-3-pro",
    inputPricePerM: 105,
    outputPricePerM: 420,
    contextWindow: 1_000_000,
    capabilities: ["chat", "reasoning", "vision", "tools", "long-context"],
    status: "degraded",
    lastPriceUpdate: "2026-08-01",
    tierHint: "balanced",
    priceHistory: priceHistory(17, 105, 420),
  },
  {
    id: "llama-4-70b",
    name: "Llama 4 70B",
    provider: "Meta",
    modelId: "llama-4-70b-instruct",
    inputPricePerM: 45,
    outputPricePerM: 160,
    contextWindow: 128_000,
    capabilities: ["chat", "tools", "json-mode"],
    status: "active",
    lastPriceUpdate: "2026-03-11",
    tierHint: "fast",
    priceHistory: priceHistory(18, 45, 160),
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    modelId: "deepseek-chat-v3",
    inputPricePerM: 22,
    outputPricePerM: 88,
    contextWindow: 128_000,
    capabilities: ["chat", "json-mode", "long-context"],
    status: "disabled",
    lastPriceUpdate: "2026-02-19",
    tierHint: "fast",
    priceHistory: priceHistory(19, 22, 88),
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    provider: "DeepSeek",
    modelId: "deepseek-reasoner-v3",
    inputPricePerM: 78,
    outputPricePerM: 312,
    contextWindow: 128_000,
    capabilities: ["chat", "reasoning", "long-context"],
    status: "deprecated",
    lastPriceUpdate: "2026-01-30",
    tierHint: "advanced",
    priceHistory: priceHistory(20, 78, 312),
  },
];

export const modelName = (id: string) => MODELS.find((m) => m.id === id)?.name ?? id;

/* ------------------------------------------------------------------ */
/* Routing & fallbacks                                                 */
/* ------------------------------------------------------------------ */

export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

export interface FeatureRoute {
  feature: string;
  primary: string;
  fallbacks: string[];
  reasoningEffort: ReasoningEffort;
  maxOutputTokens: number;
  timeoutMs: number;
  retryLimit: number;
  enabled: boolean;
}

export const DEFAULT_ROUTES: FeatureRoute[] = [
  { feature: "tutor_chat", primary: "gpt-4o-mini", fallbacks: ["claude-haiku", "gemini-flash"], reasoningEffort: "low", maxOutputTokens: 1200, timeoutMs: 20000, retryLimit: 1, enabled: true },
  { feature: "quiz_generation", primary: "claude-sonnet", fallbacks: ["gpt-4.1", "gemini-pro"], reasoningEffort: "medium", maxOutputTokens: 4000, timeoutMs: 45000, retryLimit: 2, enabled: true },
  { feature: "answer_explanation", primary: "gpt-4o-mini", fallbacks: ["claude-haiku"], reasoningEffort: "low", maxOutputTokens: 900, timeoutMs: 18000, retryLimit: 1, enabled: true },
  { feature: "pdf_topic_extraction", primary: "gemini-flash", fallbacks: ["gpt-4.1"], reasoningEffort: "minimal", maxOutputTokens: 2200, timeoutMs: 60000, retryLimit: 1, enabled: true },
  { feature: "syllabus_mapping", primary: "gpt-4.1", fallbacks: ["claude-sonnet"], reasoningEffort: "medium", maxOutputTokens: 3000, timeoutMs: 45000, retryLimit: 2, enabled: true },
  { feature: "paper_generation", primary: "claude-sonnet", fallbacks: ["o4-mini", "gpt-4.1"], reasoningEffort: "high", maxOutputTokens: 8000, timeoutMs: 90000, retryLimit: 2, enabled: true },
  { feature: "question_selection", primary: "gpt-4o-mini", fallbacks: ["gemini-flash"], reasoningEffort: "low", maxOutputTokens: 1600, timeoutMs: 25000, retryLimit: 1, enabled: true },
  { feature: "json_repair", primary: "gpt-4o-mini", fallbacks: ["llama-4-70b", "gemini-flash"], reasoningEffort: "minimal", maxOutputTokens: 2000, timeoutMs: 15000, retryLimit: 0, enabled: false },
];

/* ------------------------------------------------------------------ */
/* Usage & cost analytics (sample series)                              */
/* ------------------------------------------------------------------ */

export interface KpiSnapshot {
  costInr: number;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  successRate: number;
  fallbackRate: number;
  costDelta: number;
  inputDelta: number;
  outputDelta: number;
  requestsDelta: number;
  successDelta: number;
  fallbackDelta: number;
}

export const KPIS: Record<DemoRange, KpiSnapshot> = {
  "24h": { costInr: 2140, inputTokens: 8_420_000, outputTokens: 2_910_000, requests: 6120, successRate: 98.4, fallbackRate: 3.1, costDelta: 6.2, inputDelta: 4.1, outputDelta: 5.8, requestsDelta: 3.4, successDelta: 0.3, fallbackDelta: -0.6 },
  "7d": { costInr: 14_860, inputTokens: 57_300_000, outputTokens: 19_840_000, requests: 41_280, successRate: 98.1, fallbackRate: 3.6, costDelta: 9.4, inputDelta: 7.8, outputDelta: 8.9, requestsDelta: 6.5, successDelta: -0.2, fallbackDelta: 0.8 },
  "30d": { costInr: 61_240, inputTokens: 236_400_000, outputTokens: 81_900_000, requests: 172_600, successRate: 98.3, fallbackRate: 3.3, costDelta: 12.8, inputDelta: 11.2, outputDelta: 13.6, requestsDelta: 10.1, successDelta: 0.1, fallbackDelta: 0.4 },
};

const dayLabels = (count: number): string[] => {
  const labels = ["20 Sep", "22 Sep", "24 Sep", "26 Sep", "28 Sep", "30 Sep", "02 Oct", "04 Oct", "06 Oct", "08 Oct", "10 Oct", "12 Oct", "14 Oct", "16 Oct", "18 Oct", "19 Oct"];
  return labels.slice(-count);
};

export interface OverviewPoint {
  label: string;
  cost: number;
  input: number;
  output: number;
  requests: number;
  errors: number;
}

const overviewSeries = (points: number, seed: number, baseCost: number, baseReq: number): OverviewPoint[] => {
  const rng = mulberry32(seed);
  const labels = dayLabels(points);
  return labels.map((label, i) => {
    const weekendDip = i % 7 === 5 || i % 7 === 6 ? 0.72 : 1;
    const cost = round(baseCost * weekendDip * (0.82 + rng() * 0.4));
    const requests = Math.round(baseReq * weekendDip * (0.85 + rng() * 0.35));
    return {
      label,
      cost,
      input: round(requests * (1.1 + rng() * 0.5), 1),
      output: round(requests * (0.34 + rng() * 0.18), 1),
      requests,
      errors: Math.round(requests * (0.008 + rng() * 0.022)),
    };
  });
};

export const OVERVIEW_SERIES: Record<DemoRange, OverviewPoint[]> = {
  "24h": overviewSeries(12, 71, 220, 640),
  "7d": overviewSeries(7, 72, 2100, 5900),
  "30d": overviewSeries(16, 73, 3800, 10800),
};

export interface BreakdownRow {
  id: string;
  label: string;
  cost: number;
  share: number;
}

export const SPEND_BY_MODEL: BreakdownRow[] = [
  { id: "claude-sonnet", label: "Claude Sonnet", cost: 24_620, share: 40.2 },
  { id: "gpt-4.1", label: "GPT-4.1", cost: 14_180, share: 23.2 },
  { id: "o4-mini", label: "o4-mini (reasoning)", cost: 8_940, share: 14.6 },
  { id: "gpt-4o-mini", label: "GPT-4o mini", cost: 7_310, share: 11.9 },
  { id: "gemini-pro", label: "Gemini Pro", cost: 3_640, share: 5.9 },
  { id: "gemini-flash", label: "Gemini Flash", cost: 1_540, share: 2.5 },
  { id: "llama-4-70b", label: "Llama 4 70B", cost: 1_010, share: 1.7 },
];

export const SPEND_BY_FEATURE: BreakdownRow[] = [
  { id: "paper_generation", label: "Question paper generation", cost: 18_460, share: 30.1 },
  { id: "quiz_generation", label: "Quiz question generation", cost: 15_880, share: 25.9 },
  { id: "tutor_chat", label: "Tutor chat", cost: 11_240, share: 18.4 },
  { id: "pdf_topic_extraction", label: "PDF topic extraction", cost: 6_720, share: 11.0 },
  { id: "syllabus_mapping", label: "Syllabus mapping", cost: 3_980, share: 6.5 },
  { id: "answer_explanation", label: "Answer explanation", cost: 2_460, share: 4.0 },
  { id: "question_selection", label: "Question selection", cost: 1_520, share: 2.5 },
  { id: "json_repair", label: "JSON repair", cost: 980, share: 1.6 },
];

/* ------------------------------------------------------------------ */
/* Request logs                                                        */
/* ------------------------------------------------------------------ */

export type LogStatus = "success" | "failed" | "running" | "fallback";

export interface LogAttempt {
  model: string;
  status: "ok" | "timeout" | "rate_limited" | "error";
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  errorCode?: string;
  errorMessage?: string;
}

export interface RequestLog {
  requestId: string;
  ts: string;
  tsIso: string;
  user: string;
  feature: string;
  primaryModel: string;
  finalModel: string;
  status: LogStatus;
  inputTokens: number;
  outputTokens: number;
  costInr: number;
  reportedCostInr: number | null;
  latencyMs: number;
  attempts: LogAttempt[];
  promptPreview: string;
  responsePreview: string;
}

const USERS = ["aarav.sharma", "priya.nair", "rohan.gupta", "meera.iyer", "karthik.rao", "sana.khan", "dev.patel", "ananya.das"];

const PROMPTS = [
  "Generate 5 medium difficulty questions on binary search trees for B.Tech Semester 3…",
  "Explain why quicksort degrades to O(n^2) with sorted input, keep it under 200 words…",
  "Extract chapter-wise topics from the attached physics PDF (24 pages)…",
  "Build a 25-mark unit test on operating system scheduling with section A/B structure…",
  "Map these 40 topics against CBSE Class 12 computer science syllabus units…",
];
const RESPONSES = [
  "Here are 5 questions covering insertion, deletion, traversal complexity and balancing…",
  "Quicksort picks the pivot; with sorted input, partitioning is unbalanced every call…",
  "Chapter 3: Units and Measurements — topics: SI units, dimensional analysis…",
  "Section A (10 × 1): MCQ on process states, preemption and context switches…",
  "Mapped 38 of 40 topics; 2 topics have no close syllabus unit and were flagged…",
];

const buildAttempts = (rng: () => number, primary: string, fallback: string, status: LogStatus): LogAttempt[] => {
  const base = () => ({
    inputTokens: 800 + Math.round(rng() * 5200),
    outputTokens: 200 + Math.round(rng() * 2400),
    latencyMs: 700 + Math.round(rng() * 5200),
  });
  if (status === "success") return [{ model: primary, status: "ok", ...base() }];
  if (status === "fallback") {
    return [
      { model: primary, status: "timeout", errorCode: "ETIMEDOUT", errorMessage: "Upstream did not respond within timeout", ...base() },
      { model: fallback, status: "ok", ...base() },
    ];
  }
  if (status === "failed") {
    return [
      { model: primary, status: "error", errorCode: "429", errorMessage: "Rate limit exceeded for organization", ...base() },
      { model: fallback, status: "rate_limited", errorCode: "429", errorMessage: "Fallback also rate limited", ...base() },
    ];
  }
  return [{ model: primary, status: "ok", ...base() }];
};

const logs = (() => {
  const rng = mulberry32(99);
  const list: RequestLog[] = [];
  let minute = 42;
  let hour = 19;
  for (let i = 0; i < 132; i += 1) {
    minute -= 2 + Math.floor(rng() * 3);
    while (minute < 0) {
      minute += 60;
      hour -= 1;
    }
    const feature = FEATURES[Math.floor(rng() * FEATURES.length)];
    const model = MODELS[Math.floor(rng() * 8)];
    const fallback = MODELS[Math.floor(rng() * 6)];
    const roll = rng();
    const status: LogStatus = roll < 0.82 ? "success" : roll < 0.93 ? "fallback" : roll < 0.99 ? "failed" : "running";
    const attempts = buildAttempts(rng, model.id, fallback.id, status);
    const inputTokens = attempts.reduce((sum, a) => sum + a.inputTokens, 0);
    const outputTokens = attempts.reduce((sum, a) => sum + a.outputTokens, 0);
    const costInr = round((inputTokens * model.inputPricePerM + outputTokens * model.outputPricePerM) / 1_000_000, 2);
    const hh = String(Math.max(0, hour)).padStart(2, "0");
    const mm = String(minute).padStart(2, "0");
    const ss = String(Math.floor(rng() * 60)).padStart(2, "0");
    list.push({
      requestId: `req_${(i + 1024).toString(16)}${Math.floor(rng() * 4096).toString(16)}`,
      ts: `19 Oct · ${hh}:${mm}:${ss}`,
      tsIso: `2026-10-19T${hh}:${mm}:${ss}`,
      user: USERS[Math.floor(rng() * USERS.length)],
      feature: feature.id,
      primaryModel: model.id,
      finalModel: attempts[attempts.length - 1].model,
      status,
      inputTokens,
      outputTokens,
      costInr,
      reportedCostInr: rng() > 0.45 ? round(costInr * (0.92 + rng() * 0.16), 2) : null,
      latencyMs: attempts.reduce((sum, a) => sum + a.latencyMs, 0),
      attempts,
      promptPreview: PROMPTS[Math.floor(rng() * PROMPTS.length)],
      responsePreview: RESPONSES[Math.floor(rng() * RESPONSES.length)],
    });
  }
  return list;
})();

export const REQUEST_LOGS: RequestLog[] = logs;

export interface ProviderErrorRow {
  ts: string;
  provider: ProviderName;
  model: string;
  code: string;
  message: string;
  occurrences: number;
}

export const PROVIDER_ERRORS: ProviderErrorRow[] = [
  { ts: "19 Oct · 18:12", provider: "Anthropic", model: "claude-sonnet", code: "ETIMEDOUT", message: "Upstream timeout after 45s", occurrences: 14 },
  { ts: "19 Oct · 16:48", provider: "OpenAI", model: "o4-mini", code: "429", message: "Rate limit exceeded (tier 4)", occurrences: 9 },
  { ts: "19 Oct · 14:05", provider: "Google", model: "gemini-pro", code: "503", message: "Model overloaded, retry suggested", occurrences: 7 },
  { ts: "19 Oct · 11:32", provider: "OpenAI", model: "gpt-4.1", code: "500", message: "Internal server error", occurrences: 3 },
  { ts: "18 Oct · 22:10", provider: "Anthropic", model: "claude-haiku", code: "OVERLOADED", message: "Capacity constrained, fallback used", occurrences: 11 },
];

/* ------------------------------------------------------------------ */
/* Usage & costs                                                       */
/* ------------------------------------------------------------------ */

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cachedTokens: number;
  estimatedCostInr: number;
  reportedCostInr: number | null;
  reconciledCostInr: number | null;
}

export const USAGE_TOTALS: Record<DemoRange, UsageTotals> = {
  "24h": { inputTokens: 8_420_000, outputTokens: 2_910_000, reasoningTokens: 840_000, cachedTokens: 1_260_000, estimatedCostInr: 2140, reportedCostInr: null, reconciledCostInr: null },
  "7d": { inputTokens: 57_300_000, outputTokens: 19_840_000, reasoningTokens: 5_120_000, cachedTokens: 8_940_000, estimatedCostInr: 14_860, reportedCostInr: 14_210, reconciledCostInr: null },
  "30d": { inputTokens: 236_400_000, outputTokens: 81_900_000, reasoningTokens: 21_300_000, cachedTokens: 36_800_000, estimatedCostInr: 61_240, reportedCostInr: 59_870, reconciledCostInr: null },
};

export interface UnitEconomics {
  label: string;
  costInr: number | null;
  note: string;
}

export const UNIT_ECONOMICS: UnitEconomics[] = [
  { label: "Cost per request", costInr: 0.36, note: "Average across all features" },
  { label: "Cost per completed quiz", costInr: 7.42, note: "Generation + selection + repairs" },
  { label: "Cost per question paper", costInr: 24.8, note: "Includes one regeneration allowance" },
  { label: "Cost per tutor reply", costInr: 0.18, note: "Median tutor chat turn" },
];

export interface UserSpendRow {
  user: string;
  plan: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  costInr: number;
  budgetInr: number;
}

export const USER_SPEND: UserSpendRow[] = [
  { user: "aarav.sharma", plan: "Master", requests: 4_820, inputTokens: 22_400_000, outputTokens: 7_600_000, costInr: 4_860, budgetInr: 6_000 },
  { user: "priya.nair", plan: "Teacher", requests: 3_940, inputTokens: 18_100_000, outputTokens: 6_200_000, costInr: 3_920, budgetInr: 4_000 },
  { user: "rohan.gupta", plan: "Teacher", requests: 3_210, inputTokens: 14_800_000, outputTokens: 5_100_000, costInr: 3_180, budgetInr: 4_000 },
  { user: "meera.iyer", plan: "Master", requests: 2_880, inputTokens: 13_200_000, outputTokens: 4_400_000, costInr: 2_940, budgetInr: 6_000 },
  { user: "karthik.rao", plan: "Starter", requests: 1_460, inputTokens: 6_100_000, outputTokens: 2_100_000, costInr: 1_280, budgetInr: 1_500 },
  { user: "sana.khan", plan: "Starter", requests: 1_120, inputTokens: 4_800_000, outputTokens: 1_600_000, costInr: 980, budgetInr: 1_500 },
  { user: "dev.patel", plan: "Master", requests: 860, inputTokens: 3_900_000, outputTokens: 1_300_000, costInr: 870, budgetInr: 6_000 },
  { user: "ananya.das", plan: "Teacher", requests: 640, inputTokens: 2_800_000, outputTokens: 940_000, costInr: 610, budgetInr: 4_000 },
];

export interface EfficiencyRow {
  label: string;
  value: string;
  hint: string;
}

export const EFFICIENCY: EfficiencyRow[] = [
  { label: "Cache hit ratio", value: "15.6%", hint: "Cached input tokens ÷ total input tokens" },
  { label: "Fallback overhead", value: "3.3%", hint: "Cost added by fallback attempts" },
  { label: "Repair rate", value: "1.9%", hint: "JSON repair calls ÷ generation calls" },
  { label: "Avg tokens / request", value: "12.4k", hint: "Input + output across all features" },
  { label: "Reasoning share", value: "6.4%", hint: "Reasoning tokens ÷ output tokens" },
];

/* ------------------------------------------------------------------ */
/* User access                                                         */
/* ------------------------------------------------------------------ */

export type UserAccountStatus = "active" | "trial" | "suspended" | "exhausted";

export interface AccessUser {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  plan: "Starter" | "Teacher" | "Master";
  tier: AiTier;
  features: string[];
  dailyLimit: number;
  monthlyLimit: number;
  reasoningAccess: boolean;
  creditBalance: number;
  periodCostInr: number;
  status: UserAccountStatus;
}

export const ACCESS_USERS: AccessUser[] = [
  { id: "u_1001", name: "Aarav Sharma", email: "aarav.sharma@example.edu", role: "teacher", plan: "Master", tier: "advanced", features: FEATURES.map((f) => f.id), dailyLimit: 400, monthlyLimit: 6000, reasoningAccess: true, creditBalance: 1840, periodCostInr: 4860, status: "active" },
  { id: "u_1002", name: "Priya Nair", email: "priya.nair@example.edu", role: "teacher", plan: "Teacher", tier: "balanced", features: ["tutor_chat", "quiz_generation", "answer_explanation", "paper_generation"], dailyLimit: 250, monthlyLimit: 3000, reasoningAccess: false, creditBalance: 620, periodCostInr: 3920, status: "active" },
  { id: "u_1003", name: "Rohan Gupta", email: "rohan.gupta@example.edu", role: "teacher", plan: "Teacher", tier: "balanced", features: ["quiz_generation", "answer_explanation", "question_selection"], dailyLimit: 200, monthlyLimit: 2500, reasoningAccess: false, creditBalance: 340, periodCostInr: 3180, status: "active" },
  { id: "u_1004", name: "Meera Iyer", email: "meera.iyer@example.edu", role: "admin", plan: "Master", tier: "auto", features: FEATURES.map((f) => f.id), dailyLimit: 500, monthlyLimit: 8000, reasoningAccess: true, creditBalance: 2410, periodCostInr: 2940, status: "active" },
  { id: "u_1005", name: "Karthik Rao", email: "karthik.rao@example.edu", role: "teacher", plan: "Starter", tier: "fast", features: ["tutor_chat", "answer_explanation"], dailyLimit: 60, monthlyLimit: 600, reasoningAccess: false, creditBalance: 45, periodCostInr: 1280, status: "exhausted" },
  { id: "u_1006", name: "Sana Khan", email: "sana.khan@example.edu", role: "teacher", plan: "Starter", tier: "fast", features: ["quiz_generation", "tutor_chat"], dailyLimit: 60, monthlyLimit: 600, reasoningAccess: false, creditBalance: 120, periodCostInr: 980, status: "active" },
  { id: "u_1007", name: "Dev Patel", email: "dev.patel@example.edu", role: "teacher", plan: "Master", tier: "advanced", features: FEATURES.map((f) => f.id), dailyLimit: 450, monthlyLimit: 7000, reasoningAccess: true, creditBalance: 1980, periodCostInr: 870, status: "trial" },
  { id: "u_1008", name: "Ananya Das", email: "ananya.das@example.edu", role: "teacher", plan: "Teacher", tier: "auto", features: ["tutor_chat", "quiz_generation", "paper_generation"], dailyLimit: 220, monthlyLimit: 2800, reasoningAccess: true, creditBalance: 510, periodCostInr: 610, status: "active" },
  { id: "u_1009", name: "Vikram Singh", email: "vikram.singh@example.edu", role: "teacher", plan: "Starter", tier: "fast", features: ["tutor_chat"], dailyLimit: 40, monthlyLimit: 400, reasoningAccess: false, creditBalance: 0, periodCostInr: 300, status: "suspended" },
  { id: "u_1010", name: "Ishita Bose", email: "ishita.bose@example.edu", role: "teacher", plan: "Teacher", tier: "balanced", features: ["quiz_generation", "pdf_topic_extraction", "syllabus_mapping"], dailyLimit: 180, monthlyLimit: 2200, reasoningAccess: false, creditBalance: 275, periodCostInr: 540, status: "active" },
];

/* ------------------------------------------------------------------ */
/* Credits & billing                                                   */
/* ------------------------------------------------------------------ */

export interface CreditPackage {
  id: string;
  name: string;
  priceInr: number;
  credits: number | null;
  note: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: "starter", name: "Starter", priceInr: 49, credits: 50, note: "For trying tutor chat and short quizzes." },
  { id: "teacher", name: "Teacher", priceInr: 99, credits: 200, note: "Most popular for regular classroom use." },
  { id: "master", name: "Master", priceInr: 199, credits: null, note: "Credit quantity is configurable and not finalised yet." },
];

export type TransactionType = "purchase" | "consume" | "refund" | "bonus";

export interface CreditTransaction {
  id: string;
  ts: string;
  user: string;
  type: TransactionType;
  packageName: string | null;
  credits: number;
  amountInr: number | null;
  status: "completed" | "pending" | "failed" | "refunded";
}

export const CREDIT_TRANSACTIONS: CreditTransaction[] = [
  { id: "txn_9031", ts: "19 Oct · 17:22", user: "aarav.sharma", type: "purchase", packageName: "Master", credits: 500, amountInr: 199, status: "completed" },
  { id: "txn_9030", ts: "19 Oct · 16:40", user: "priya.nair", type: "consume", packageName: null, credits: -86, amountInr: null, status: "completed" },
  { id: "txn_9029", ts: "19 Oct · 15:08", user: "meera.iyer", type: "purchase", packageName: "Teacher", credits: 200, amountInr: 99, status: "completed" },
  { id: "txn_9028", ts: "19 Oct · 13:51", user: "karthik.rao", type: "refund", packageName: "Starter", credits: 50, amountInr: 49, status: "refunded" },
  { id: "txn_9027", ts: "19 Oct · 12:14", user: "rohan.gupta", type: "consume", packageName: null, credits: -120, amountInr: null, status: "completed" },
  { id: "txn_9026", ts: "19 Oct · 10:02", user: "sana.khan", type: "purchase", packageName: "Starter", credits: 50, amountInr: 49, status: "completed" },
  { id: "txn_9025", ts: "18 Oct · 21:36", user: "dev.patel", type: "bonus", packageName: null, credits: 25, amountInr: null, status: "completed" },
  { id: "txn_9024", ts: "18 Oct · 19:18", user: "ananya.das", type: "purchase", packageName: "Master", credits: 500, amountInr: 199, status: "pending" },
  { id: "txn_9023", ts: "18 Oct · 17:44", user: "ishita.bose", type: "consume", packageName: null, credits: -64, amountInr: null, status: "completed" },
  { id: "txn_9022", ts: "18 Oct · 15:10", user: "vikram.singh", type: "purchase", packageName: "Starter", credits: 50, amountInr: 49, status: "failed" },
  { id: "txn_9021", ts: "18 Oct · 11:52", user: "aarav.sharma", type: "consume", packageName: null, credits: -142, amountInr: null, status: "completed" },
  { id: "txn_9020", ts: "17 Oct · 20:31", user: "priya.nair", type: "refund", packageName: "Teacher", credits: 200, amountInr: 99, status: "refunded" },
  { id: "txn_9019", ts: "17 Oct · 18:07", user: "meera.iyer", type: "consume", packageName: null, credits: -95, amountInr: null, status: "completed" },
  { id: "txn_9018", ts: "17 Oct · 14:26", user: "rohan.gupta", type: "purchase", packageName: "Teacher", credits: 200, amountInr: 99, status: "completed" },
];

export interface CreditMetrics {
  creditsSold: number;
  creditsConsumed: number;
  outstandingCredits: number;
  apiCostInr: number;
  revenueInr: number;
  contributionMarginInr: number | null;
  marginNote: string;
}

export const CREDIT_METRICS: CreditMetrics = {
  creditsSold: 12_450,
  creditsConsumed: 8_930,
  outstandingCredits: 3_520,
  apiCostInr: 61_240,
  revenueInr: 92_600,
  contributionMarginInr: null,
  marginNote: "Requires reconciled provider invoices and payment fees before a margin can be reported.",
};

/* ------------------------------------------------------------------ */
/* Budgets & limits                                                    */
/* ------------------------------------------------------------------ */

export type BudgetAction = "warn" | "reject" | "disable";

export interface BudgetConfig {
  id: string;
  scope: "global" | "feature" | "user" | "requests" | "tokens" | "jobs" | "fallback";
  label: string;
  detail: string;
  limit: number;
  unit: string;
  warnThreshold: number;
  action: BudgetAction;
  enabled: boolean;
  status: "within" | "near" | "exceeded";
}

export const BUDGETS: BudgetConfig[] = [
  { id: "global-daily", scope: "global", label: "Global daily API spend", detail: "All features, all users", limit: 3_000, unit: "INR / day", warnThreshold: 80, action: "reject", enabled: true, status: "near" },
  { id: "global-monthly", scope: "global", label: "Global monthly API spend", detail: "Rolling calendar month", limit: 80_000, unit: "INR / month", warnThreshold: 85, action: "reject", enabled: true, status: "within" },
  { id: "user-daily", scope: "user", label: "Per-user daily spend", detail: "Applies to every teacher account", limit: 150, unit: "INR / user / day", warnThreshold: 75, action: "warn", enabled: true, status: "within" },
  { id: "feature-paper", scope: "feature", label: "Question paper generation cap", detail: "Most expensive feature", limit: 25_000, unit: "INR / month", warnThreshold: 80, action: "disable", enabled: true, status: "near" },
  { id: "requests-daily", scope: "requests", label: "Daily request limit", detail: "Across all providers", limit: 60_000, unit: "requests / day", warnThreshold: 90, action: "reject", enabled: true, status: "within" },
  { id: "tokens-request", scope: "tokens", label: "Max tokens per request", detail: "Input + output combined", limit: 32_000, unit: "tokens", warnThreshold: 85, action: "warn", enabled: true, status: "within" },
  { id: "concurrent-jobs", scope: "jobs", label: "Maximum concurrent AI jobs", detail: "Paper generation and PDF extraction", limit: 24, unit: "jobs", warnThreshold: 83, action: "warn", enabled: true, status: "near" },
  { id: "fallback-rate", scope: "fallback", label: "Fallback rate ceiling", detail: "Alert when fallbacks cross this rate", limit: 8, unit: "% of requests", warnThreshold: 75, action: "warn", enabled: false, status: "within" },
];

/* ------------------------------------------------------------------ */
/* Health & alerts                                                     */
/* ------------------------------------------------------------------ */

export type ProviderStatus = "operational" | "degraded" | "outage";

export interface ProviderHealthRow {
  provider: ProviderName;
  status: ProviderStatus;
  modelsAvailable: string;
  avgLatencyMs: number;
  errorRate: number;
  lastChecked: string;
}

export const PROVIDER_HEALTH: ProviderHealthRow[] = [
  { provider: "OpenAI", status: "operational", modelsAvailable: "3 / 3", avgLatencyMs: 1840, errorRate: 0.8, lastChecked: "19 Oct · 19:40" },
  { provider: "Anthropic", status: "degraded", modelsAvailable: "2 / 2", avgLatencyMs: 3120, errorRate: 3.6, lastChecked: "19 Oct · 19:39" },
  { provider: "Google", status: "degraded", modelsAvailable: "1 / 2", avgLatencyMs: 2680, errorRate: 2.9, lastChecked: "19 Oct · 19:39" },
  { provider: "Meta", status: "operational", modelsAvailable: "1 / 1", avgLatencyMs: 2210, errorRate: 1.2, lastChecked: "19 Oct · 19:38" },
  { provider: "DeepSeek", status: "outage", modelsAvailable: "0 / 2", avgLatencyMs: 0, errorRate: 0, lastChecked: "19 Oct · 19:35" },
];

export interface ModelAvailabilityRow {
  model: string;
  provider: ProviderName;
  availability: string;
  latencyMs: number;
  errorRate: number;
  lastChecked: string;
}

export const MODEL_AVAILABILITY: ModelAvailabilityRow[] = MODELS.map((m, i) => ({
  model: m.id,
  provider: m.provider,
  availability: m.status === "disabled" ? "Disabled" : m.status === "deprecated" ? "Deprecating" : m.status === "degraded" ? "Partial" : "Available",
  latencyMs: m.status === "active" ? 1200 + i * 260 : 0,
  errorRate: m.status === "active" ? round(0.4 + i * 0.28, 1) : m.status === "degraded" ? 4.2 : 0,
  lastChecked: "19 Oct · 19:38",
}));

export type AlertSeverity = "critical" | "warning" | "info";

export interface AiAlert {
  id: string;
  title: string;
  severity: AlertSeverity;
  status: "open" | "acknowledged" | "dismissed";
  ts: string;
  source: string;
  detail: string;
  recommendation: string;
}

export const ALERTS: AiAlert[] = [
  { id: "alert-01", title: "Provider timeout spike on Anthropic", severity: "critical", status: "open", ts: "19 Oct · 18:12", source: "Provider health", detail: "Claude Sonnet timeouts rose to 3.6% in the last hour (baseline 0.6%). Fallbacks are absorbing the load but paper generation latency is up 42%.", recommendation: "Review the Anthropic status page and consider temporarily promoting GPT-4.1 as the primary model for paper generation." },
  { id: "alert-02", title: "High daily spend approaching cap", severity: "critical", status: "open", ts: "19 Oct · 17:55", source: "Budgets", detail: "Today's API spend is ₹2,540 of the ₹3,000 global daily cap (85%). Paper generation contributes 46% of the total.", recommendation: "Raise the daily cap or enable the paper generation cost cap before evening traffic." },
  { id: "alert-03", title: "Fallback rate increased", severity: "warning", status: "acknowledged", ts: "19 Oct · 16:30", source: "Routing", detail: "Fallback usage moved from 2.1% to 3.6% over the last 24 hours, mostly from tutor chat hitting rate limits on GPT-4o mini.", recommendation: "Check OpenAI rate-limit tier or move tutor chat to a lower-volume primary model." },
  { id: "alert-04", title: "DeepSeek Reasoner deprecation window", severity: "warning", status: "open", ts: "19 Oct · 12:00", source: "Models", detail: "DeepSeek Reasoner is marked deprecated in the registry and is still referenced by one archived route.", recommendation: "Repoint or archive the legacy route before the provider retires the model." },
  { id: "alert-05", title: "Insufficient credit balance for 2 users", severity: "info", status: "open", ts: "19 Oct · 09:41", source: "Credits", detail: "Vikram Singh (0 credits) and Karthik Rao (45 credits) are below the low-balance threshold. Their next AI call may be rejected.", recommendation: "Notify the users or grant a small bonus so their quota does not break mid-session." },
  { id: "alert-06", title: "Gemini Pro error rate normalised", severity: "info", status: "dismissed", ts: "18 Oct · 22:18", source: "Provider health", detail: "The earlier 503 burst on Gemini Pro has cleared; error rate returned to 2.9% from 9.4%.", recommendation: "No action needed. Monitoring continues." },
];

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export interface AiOpsSettings {
  defaultTier: AiTier;
  autoFallback: boolean;
  preferCheapestModel: boolean;
  usageRetentionDays: string;
  logRetentionDays: string;
  compactNumbers: boolean;
  currency: "INR" | "USD";
  showTokenEstimates: boolean;
  defaultMaxOutputTokens: number;
  defaultTimeoutMs: number;
  alertCostSpikePct: number;
  alertFallbackRatePct: number;
  alertErrorRatePct: number;
  exportEnabled: boolean;
  exportFormat: "csv" | "json";
  exportIncludePrompts: boolean;
}

export const SETTINGS_DEFAULTS: AiOpsSettings = {
  defaultTier: "auto",
  autoFallback: true,
  preferCheapestModel: false,
  usageRetentionDays: "180",
  logRetentionDays: "90",
  compactNumbers: true,
  currency: "INR",
  showTokenEstimates: true,
  defaultMaxOutputTokens: 4_000,
  defaultTimeoutMs: 45_000,
  alertCostSpikePct: 25,
  alertFallbackRatePct: 8,
  alertErrorRatePct: 5,
  exportEnabled: true,
  exportFormat: "csv",
  exportIncludePrompts: false,
};
