"use client";

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  KeyRound,
  Layers3,
  RefreshCw,
  Route,
  Search,
  Sparkles,
  WifiOff,
  X,
} from "lucide-react";
import { Drawer, KeyValueList } from "@/components/platform/ai-ops/primitives";
import { Skeleton, TableSkeleton } from "@/components/platform/ui";

const MODELS_ENDPOINT = "/api/openrouter/models";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/models";
const PAGE_SIZE = 8;
const TOKENS_PER_MILLION = 1_000_000;

type ModelStatus = "active" | "degraded" | "retired";
type SummaryTone = "brand" | "blue" | "green" | "amber" | "rose";

interface OpenRouterModel {
  id: string;
  canonical_slug?: string | null;
  name?: string;
  description?: string;
  created?: number;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string | null;
  };
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
  };
  top_provider?: {
    context_length?: number | null;
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  supported_parameters?: string[];
  expiration_date?: string | null;
  knowledge_cutoff?: string | null;
  links?: {
    details?: string;
  };
}

interface CatalogueModel {
  id: string;
  canonicalSlug: string;
  providerKey: string;
  providerLabel: string;
  displayName: string;
  inputPricePerM: number | null;
  outputPricePerM: number | null;
  contextLength: number;
  maxCompletionTokens: number | null;
  status: ModelStatus;
  capabilities: string[];
  description: string;
  createdAt: number | null;
  expirationDate: string | null;
  modelUrl: string;
  endpointUrl: string;
  supportedParameters: string[];
  knowledgeCutoff: string | null;
  tokenizer: string | null;
  inputModalities: string[];
  outputModalities: string[];
  modality: string;
}

interface CatalogueError {
  message: string;
  authRequired: boolean;
}

class CatalogueRequestError extends Error {
  authRequired: boolean;

  constructor(message: string, authRequired = false) {
    super(message);
    this.name = "CatalogueRequestError";
    this.authRequired = authRequired;
  }
}

const PROVIDER_STYLES: Record<string, { label: string; className: string }> = {
  openai: { label: "OpenAI", className: "border-[#b7e7d8] bg-[#e9fbf3] text-[#087a5b]" },
  anthropic: { label: "Anthropic", className: "border-[#f0d2b0] bg-[#fff6e9] text-[#9a5b00]" },
  google: { label: "Google", className: "border-[#c5d8ff] bg-[#eef4ff] text-[#1d4ed8]" },
  meta: { label: "Meta", className: "border-[#c9cbfa] bg-[#eef0ff] text-[#4338ca]" },
  "meta-llama": { label: "Meta", className: "border-[#c9cbfa] bg-[#eef0ff] text-[#4338ca]" },
  mistralai: { label: "Mistral", className: "border-[#f3dfaa] bg-[#fff8e6] text-[#9a6700]" },
  deepseek: { label: "DeepSeek", className: "border-[#d8c7fb] bg-[#f4edff] text-[#6d28d9]" },
  qwen: { label: "Qwen", className: "border-[#b9e5ec] bg-[#ecfeff] text-[#0e7490]" },
  "x-ai": { label: "xAI", className: "border-[#cbd5e1] bg-[#f1f5f9] text-[#334155]" },
  cohere: { label: "Cohere", className: "border-[#f4c5dd] bg-[#fdf2f8] text-[#be185d]" },
  nvidia: { label: "NVIDIA", className: "border-[#cfe5ad] bg-[#f7fee7] text-[#4d7c0f]" },
  amazon: { label: "Amazon", className: "border-[#f6c9a9] bg-[#fff7ed] text-[#c2410c]" },
  microsoft: { label: "Microsoft", className: "border-[#b9dcf4] bg-[#f0f9ff] text-[#0369a1]" },
  perplexity: { label: "Perplexity", className: "border-[#b4e5dd] bg-[#f0fdfa] text-[#0f766e]" },
  moonshotai: { label: "Moonshot AI", className: "border-[#c5d8ff] bg-[#eff6ff] text-[#1e40af]" },
  minimax: { label: "MiniMax", className: "border-[#f4c1cc] bg-[#fff1f2] text-[#be123c]" },
  "z-ai": { label: "Z.AI", className: "border-[#dfc8f8] bg-[#faf5ff] text-[#7e22ce]" },
  "bytedance-seed": { label: "ByteDance", className: "border-[#b9dcf4] bg-[#f0f9ff] text-[#075985]" },
  bytedance: { label: "ByteDance", className: "border-[#b9dcf4] bg-[#f0f9ff] text-[#075985]" },
  xiaomi: { label: "Xiaomi", className: "border-[#f6c9a9] bg-[#fff7ed] text-[#c2410c]" },
  liquid: { label: "Liquid AI", className: "border-[#c2e9e0] bg-[#f0fdfa] text-[#0f766e]" },
  nousresearch: { label: "Nous Research", className: "border-[#d6cdf8] bg-[#f5f3ff] text-[#6d28d9]" },
  arcee: { label: "Arcee AI", className: "border-[#f3d7ad] bg-[#fffbeb] text-[#92400e]" },
  "arcee-ai": { label: "Arcee AI", className: "border-[#f3d7ad] bg-[#fffbeb] text-[#92400e]" },
  ibm: { label: "IBM", className: "border-[#b9d6f2] bg-[#eff6ff] text-[#1d4ed8]" },
  "ibm-granite": { label: "IBM", className: "border-[#b9d6f2] bg-[#eff6ff] text-[#1d4ed8]" },
  tencent: { label: "Tencent", className: "border-[#b9dcf4] bg-[#f0f9ff] text-[#0369a1]" },
  stepfun: { label: "StepFun", className: "border-[#d8c7fb] bg-[#f4edff] text-[#6d28d9]" },
  upstage: { label: "Upstage", className: "border-[#f4c5dd] bg-[#fdf2f8] text-[#be185d]" },
  "aion-labs": { label: "Aion Labs", className: "border-[#cbd5e1] bg-[#f1f5f9] text-[#334155]" },
  "cognitivecomputations": { label: "Cognitive Computations", className: "border-[#dfc8f8] bg-[#faf5ff] text-[#7e22ce]" },
  "the-drummer": { label: "TheDrummer", className: "border-[#f3d7ad] bg-[#fffbeb] text-[#92400e]" },
  thedrummer: { label: "TheDrummer", className: "border-[#f3d7ad] bg-[#fffbeb] text-[#92400e]" },
  sao10k: { label: "Sao10K", className: "border-[#f0d2b0] bg-[#fff6e9] text-[#9a5b00]" },
  openrouter: { label: "OpenRouter", className: "border-[#c9cbfa] bg-[#eef0ff] text-[#4338ca]" },
  "dots-studio": { label: "Dots Studio", className: "border-[#cbd5e1] bg-[#f1f5f9] text-[#334155]" },
};

const STATUS_STYLES: Record<ModelStatus, { label: string; className: string; dot: string }> = {
  active: {
    label: "Active",
    className: "border-[#b7e7d8] bg-[#dff5ec] text-[#13795b]",
    dot: "bg-[#13795b]",
  },
  degraded: {
    label: "Degraded",
    className: "border-[#f2d38a] bg-[#fff4d6] text-[#9a5b00]",
    dot: "bg-[#c47a00]",
  },
  retired: {
    label: "Retired",
    className: "border-[#f3b6bc] bg-[#fde4e6] text-[#c2303a]",
    dot: "bg-[#c2303a]",
  },
};

const SUMMARY_TONES: Record<SummaryTone, { icon: string; badge: string }> = {
  brand: {
    icon: "border-[#d9ceff] bg-[#f1ecff] text-[var(--qs-brand)]",
    badge: "border-[#d9ceff] bg-[#f7f3ff] text-[var(--qs-brand)]",
  },
  blue: {
    icon: "border-[#c5d8ff] bg-[#eef4ff] text-[#1d4ed8]",
    badge: "border-[#c5d8ff] bg-[#f5f8ff] text-[#1d4ed8]",
  },
  green: {
    icon: "border-[#b7e7d8] bg-[#e9fbf3] text-[#13795b]",
    badge: "border-[#b7e7d8] bg-[#f1fcf7] text-[#13795b]",
  },
  amber: {
    icon: "border-[#f2d38a] bg-[#fff4d6] text-[#9a5b00]",
    badge: "border-[#f2d38a] bg-[#fffaeb] text-[#9a5b00]",
  },
  rose: {
    icon: "border-[#f3b6bc] bg-[#fde4e6] text-[#c2303a]",
    badge: "border-[#f3b6bc] bg-[#fff5f6] text-[#c2303a]",
  },
};

const CAPABILITY_ORDER = [
  "Reasoning",
  "Vision",
  "Tools",
  "JSON",
  "Structured outputs",
  "Audio",
  "Video",
  "Image generation",
  "Free",
];

function titleCase(value: string): string {
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function providerMeta(providerKey: string) {
  const key = providerKey.replace(/^~/, "");
  return PROVIDER_STYLES[key] ?? {
    label: titleCase(key),
    className: "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]",
  };
}

function perMillionTokens(rate: string | number | null | undefined): number | null {
  const numeric = Number(rate);
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  return numeric * TOKENS_PER_MILLION;
}

function formatPrice(price: number | null): string {
  if (price === null) return "Variable";
  if (price === 0) return "Free";
  if (price > 0 && price < 0.0001) return "<$0.0001";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 0.01 ? 4 : 2,
  }).format(price);
}

function formatTokens(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatUnixDate(value: number | null | undefined): string {
  if (!value) return "—";
  return formatDate(new Date(value * 1000).toISOString());
}

function formatSyncTime(value: number | null): string {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatModality(modality: string | null | undefined): string {
  if (!modality) return "—";
  return modality.replace("->", " → ");
}

function deriveStatus(expirationDate: string | null | undefined): ModelStatus {
  if (!expirationDate) return "active";

  const expiry = new Date(expirationDate).getTime();
  if (!Number.isFinite(expiry)) return "active";

  const daysUntilExpiry = (expiry - Date.now()) / 86_400_000;
  if (daysUntilExpiry < 0) return "retired";
  if (daysUntilExpiry <= 30) return "degraded";
  return "active";
}

function deriveCapabilities(raw: OpenRouterModel, inputPrice: number | null, outputPrice: number | null): string[] {
  const capabilities = new Set<string>();
  const inputs = raw.architecture?.input_modalities ?? [];
  const outputs = raw.architecture?.output_modalities ?? [];
  const parameters = raw.supported_parameters ?? [];

  if (inputs.includes("image")) capabilities.add("Vision");
  if (inputs.includes("audio") || outputs.includes("audio")) capabilities.add("Audio");
  if (inputs.includes("video")) capabilities.add("Video");
  if (outputs.includes("image")) capabilities.add("Image generation");
  if (parameters.includes("tools") || parameters.includes("tool_choice")) capabilities.add("Tools");
  if (parameters.includes("reasoning")) capabilities.add("Reasoning");
  if (parameters.includes("response_format")) capabilities.add("JSON");
  if (parameters.includes("structured_outputs")) capabilities.add("Structured outputs");
  if (inputPrice === 0 && outputPrice === 0) capabilities.add("Free");

  return [...capabilities].sort(
    (a, b) => CAPABILITY_ORDER.indexOf(a) - CAPABILITY_ORDER.indexOf(b),
  );
}

function normalizeModel(raw: OpenRouterModel): CatalogueModel | null {
  if (!raw?.id || typeof raw.id !== "string") return null;

  const providerKey = raw.id.split("/")[0].replace(/^~/, "") || "other";
  const provider = providerMeta(providerKey);
  const rawName = raw.name?.trim() || raw.id;
  const displayName = rawName.includes(":") ? rawName.slice(rawName.indexOf(":") + 1).trim() : rawName;
  const inputPricePerM = perMillionTokens(raw.pricing?.prompt);
  const outputPricePerM = perMillionTokens(raw.pricing?.completion);
  const canonicalSlug = raw.canonical_slug || raw.id;
  const endpointPath = raw.links?.details;

  return {
    id: raw.id,
    canonicalSlug,
    providerKey,
    providerLabel: provider.label,
    displayName: displayName || raw.id,
    inputPricePerM,
    outputPricePerM,
    contextLength: raw.context_length ?? raw.top_provider?.context_length ?? 0,
    maxCompletionTokens: raw.top_provider?.max_completion_tokens ?? null,
    status: deriveStatus(raw.expiration_date),
    capabilities: deriveCapabilities(raw, inputPricePerM, outputPricePerM),
    description: raw.description?.trim() || "No description has been published for this model.",
    createdAt: raw.created ?? null,
    expirationDate: raw.expiration_date ?? null,
    modelUrl: `https://openrouter.ai/${canonicalSlug}`,
    endpointUrl: endpointPath
      ? `https://openrouter.ai${endpointPath}`
      : `https://openrouter.ai/api/v1/models/${canonicalSlug}/endpoints`,
    supportedParameters: raw.supported_parameters ?? [],
    knowledgeCutoff: raw.knowledge_cutoff ?? null,
    tokenizer: raw.architecture?.tokenizer ?? null,
    inputModalities: raw.architecture?.input_modalities ?? [],
    outputModalities: raw.architecture?.output_modalities ?? [],
    modality: raw.architecture?.modality ?? "",
  };
}

function isOpenRouterPayload(value: unknown): value is { data: OpenRouterModel[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { data?: unknown }).data)
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  hint,
  badge,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint: string;
  badge: string;
  tone: SummaryTone;
}) {
  const styles = SUMMARY_TONES[tone];

  return (
    <div className="group rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--qs-brand)] hover:shadow-[0_18px_32px_-26px_rgba(26,18,64,0.5)]">
      <div className="flex items-start justify-between gap-3">
        <span className={`grid h-10 w-10 place-items-center rounded-[13px] border-2 ${styles.icon}`}>
          <Icon size={17} />
        </span>
        <span className={`rounded-full border px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] ${styles.badge}`}>
          {badge}
        </span>
      </div>
      <p className="mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">{label}</p>
      <p className="mt-1 text-[28px] font-extrabold leading-none tracking-tight text-[var(--qs-ink)] tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] text-[var(--qs-muted)]">{hint}</p>
    </div>
  );
}

function ProviderTag({ model }: { model: CatalogueModel }) {
  const provider = providerMeta(model.providerKey);

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border-2 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.08em] ${provider.className}`}>
      {model.providerLabel}
    </span>
  );
}

function StatusPill({ status }: { status: ModelStatus }) {
  const styles = STATUS_STYLES[status];
  const description =
    status === "active"
      ? "Available in the OpenRouter catalogue"
      : status === "degraded"
        ? "Expires within 30 days"
        : "Expiration date has passed";

  return (
    <span
      title={description}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.07em] ${styles.className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} aria-hidden="true" />
      {styles.label}
    </span>
  );
}

function PriceLine({ label, value }: { label: "in" | "out"; value: string }) {
  return (
    <span className="inline-flex items-baseline justify-end gap-1.5">
      <span className="rounded-[5px] border border-[var(--qs-line)] bg-[var(--qs-bg)] px-1 text-[8.5px] font-extrabold uppercase leading-4 tracking-[0.06em] text-[var(--qs-muted)]">
        {label}
      </span>
      <span className="min-w-[54px] text-right text-[12px] font-extrabold tabular-nums text-[var(--qs-ink)]">
        {value}
      </span>
    </span>
  );
}

function CatalogueSelect({
  icon: Icon,
  label,
  value,
  onChange,
  children,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--qs-muted)]"
        aria-hidden="true"
      />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full cursor-pointer appearance-none rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-9 pr-9 text-[12.5px] font-bold text-[var(--qs-ink)] outline-none transition-colors hover:border-[var(--qs-brand)] focus:border-[var(--qs-brand)]"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--qs-muted)]"
        aria-hidden="true"
      />
    </div>
  );
}

function LoadingCatalogue() {
  return (
    <section className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[var(--qs-line)] px-4 py-4 sm:px-5">
        <div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-3 w-64" />
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-[#d9ceff] bg-[#f7f3ff] px-3 py-1.5 text-[11px] font-extrabold text-[var(--qs-brand)]">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          Fetching live catalogue…
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <TableSkeleton rows={8} columns={7} />
      </div>
      <span className="sr-only" role="status">
        Loading models from OpenRouter
      </span>
    </section>
  );
}

function CatalogueErrorState({ error, onRetry }: { error: CatalogueError; onRetry: () => void }) {
  return (
    <section className="rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] border-2 border-[#f3b6bc] bg-[#fde4e6] text-[#c2303a]">
          {error.authRequired ? <KeyRound size={23} /> : <WifiOff size={23} />}
        </span>
        <h2 className="mt-4 text-[21px] font-extrabold tracking-tight text-[var(--qs-ink)]">
          {error.authRequired ? "OpenRouter API key required" : "Catalogue unavailable"}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--qs-muted)]">{error.message}</p>

        {error.authRequired ? (
          <div className="mx-auto mt-4 max-w-md rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-left">
            <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
              Server key wrapper
            </p>
            <code className="mt-1.5 block overflow-x-auto rounded-md bg-[var(--qs-ink)] px-2.5 py-2 font-mono text-[11px] text-white">
              OPENROUTER_API_KEY=sk-or-v1-…
            </code>
            <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--qs-muted)]">
              The catalogue is proxied through <span className="font-mono">/api/openrouter/models</span>. Add the key
              to the server environment, then retry.
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="b b-pri sm" onClick={onRetry}>
            <RefreshCw size={13} />
            Retry connection
          </button>
          <a
            href={OPENROUTER_MODELS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="b sm"
          >
            OpenRouter models
            <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}

export default function ModelCataloguePage() {
  const [models, setModels] = useState<CatalogueModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<CatalogueError | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [capability, setCapability] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const deferredQuery = useDeferredValue(query);

  const loadModels = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;

    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20_000);

    if (mode === "refresh") setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch(MODELS_ENDPOINT, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });

      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        throw new CatalogueRequestError("OpenRouter returned a response that could not be parsed.");
      }

      if (!response.ok) {
        const message =
          typeof payload === "object" && payload !== null && "error" in payload
            ? String((payload as { error: unknown }).error)
            : `OpenRouter returned HTTP ${response.status}.`;

        throw new CatalogueRequestError(message, response.status === 401 || response.status === 403);
      }

      if (!isOpenRouterPayload(payload)) {
        throw new CatalogueRequestError("OpenRouter returned an unexpected payload shape.");
      }

      const normalized = payload.data
        .map(normalizeModel)
        .filter((model): model is CatalogueModel => model !== null)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      setModels(normalized);
      setSyncedAt(Date.now());
      setPage(1);
    } catch (requestError) {
      if (timedOut) {
        setError({
          message: "OpenRouter took too long to respond. Check your connection and try again.",
          authRequired: false,
        });
      } else if (!controller.signal.aborted) {
        if (requestError instanceof CatalogueRequestError) {
          setError({ message: requestError.message, authRequired: requestError.authRequired });
        } else {
          setError({
            message: "The OpenRouter API could not be reached. Check your network connection and retry.",
            authRequired: false,
          });
        }
      }
    } finally {
      window.clearTimeout(timeout);
      if (abortRef.current === controller) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadModels("initial"), 0);

    return () => {
      window.clearTimeout(initialLoad);
      abortRef.current?.abort();
    };
  }, [loadModels]);

  const stats = useMemo(() => {
    const providers = new Set<string>();
    let active = 0;
    let degraded = 0;
    let retired = 0;

    for (const model of models) {
      providers.add(model.providerKey);
      if (model.status === "active") active += 1;
      if (model.status === "degraded") degraded += 1;
      if (model.status === "retired") retired += 1;
    }

    return {
      total: models.length,
      providers: providers.size,
      active,
      degraded,
      retired,
      activePercent: models.length > 0 ? Math.round((active / models.length) * 100) : 0,
    };
  }, [models]);

  const providerOptions = useMemo(() => {
    const counts = new Map<string, { label: string; count: number }>();

    for (const model of models) {
      const current = counts.get(model.providerKey);
      if (current) current.count += 1;
      else counts.set(model.providerKey, { label: model.providerLabel, count: 1 });
    }

    return [...counts.entries()].sort((a, b) => a[1].label.localeCompare(b[1].label));
  }, [models]);

  const capabilityOptions = useMemo(() => {
    const counts = new Map<string, number>();

    for (const model of models) {
      for (const item of model.capabilities) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }

    return [...counts.entries()].sort((a, b) => {
      const rank = CAPABILITY_ORDER.indexOf(a[0]) - CAPABILITY_ORDER.indexOf(b[0]);
      return rank !== 0 ? rank : a[0].localeCompare(b[0]);
    });
  }, [models]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    return models.filter((model) => {
      if (provider !== "all" && model.providerKey !== provider) return false;
      if (capability !== "all" && !model.capabilities.includes(capability)) return false;
      if (status !== "all" && model.status !== status) return false;
      if (!needle) return true;

      return `${model.displayName} ${model.id}`.toLowerCase().includes(needle);
    });
  }, [models, deferredQuery, provider, capability, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visibleModels = filtered.slice(startIndex, startIndex + PAGE_SIZE);
  const selected = useMemo(
    () => models.find((model) => model.id === selectedId) ?? null,
    [models, selectedId],
  );
  const hasActiveFilters = Boolean(query) || provider !== "all" || capability !== "all" || status !== "all";
  const syncLabel = formatSyncTime(syncedAt);
  const liveState = loading && models.length === 0 ? "loading" : error && models.length === 0 ? "error" : "live";

  const updateQuery = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const updateProvider = (value: string) => {
    setProvider(value);
    setPage(1);
  };

  const updateCapability = (value: string) => {
    setCapability(value);
    setPage(1);
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const resetFilters = () => {
    setQuery("");
    setProvider("all");
    setCapability("all");
    setStatus("all");
    setPage(1);
  };

  const goToPage = (nextPage: number) => {
    setPage(Math.min(totalPages, Math.max(1, nextPage)));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--qs-brand)]">
              Platform intelligence
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-[0.1em] ${
                liveState === "live"
                  ? "border-[#b7e7d8] bg-[#e9fbf3] text-[#13795b]"
                  : liveState === "error"
                    ? "border-[#f3b6bc] bg-[#fde4e6] text-[#c2303a]"
                    : "border-[#f2d38a] bg-[#fff4d6] text-[#9a5b00]"
              }`}
            >
              <span className="relative flex h-1.5 w-1.5">
                {liveState === "live" ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />
                ) : null}
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
              </span>
              {liveState === "live" ? "Live OpenRouter" : liveState === "error" ? "Offline" : "Connecting"}
            </span>
          </div>
          <h1 className="mt-1.5 text-[30px] font-extrabold leading-[1.05] tracking-tight text-[var(--qs-ink)] sm:text-[38px]">
            Model catalogue
          </h1>
          <p className="mt-1.5 max-w-3xl text-[13.5px] leading-relaxed text-[var(--qs-muted)]">
            Every model available through OpenRouter, with live capabilities and pricing normalized to{" "}
            <span className="font-bold text-[var(--qs-ink)]">USD per 1M tokens</span>.
            {syncedAt ? (
              <span className="ml-1.5 whitespace-nowrap text-[var(--qs-muted)]">Synced {syncLabel}.</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={OPENROUTER_MODELS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="b sm"
          >
            OpenRouter
            <ArrowUpRight size={13} />
          </a>
          <button
            type="button"
            onClick={() => void loadModels("refresh")}
            className="b sm"
            disabled={loading || refreshing}
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading && models.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-[18px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-4">
              <Skeleton className="h-10 w-10 rounded-[13px]" />
              <Skeleton className="mt-4 h-2.5 w-24" />
              <Skeleton className="mt-2 h-7 w-16" />
              <Skeleton className="mt-2 h-2.5 w-32" />
            </div>
          ))
        ) : (
          <>
            <SummaryCard
              icon={Boxes}
              label="Total models"
              value={formatInteger(stats.total)}
              hint="Tracked from the live OpenRouter catalogue"
              badge="Live"
              tone="brand"
            />
            <SummaryCard
              icon={Building2}
              label="Total providers"
              value={formatInteger(stats.providers)}
              hint="Unique model providers in the response"
              badge="Unique"
              tone="blue"
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Active"
              value={formatInteger(stats.active)}
              hint={`${stats.activePercent}% of the catalogue is routing-ready`}
              badge="Healthy"
              tone="green"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Degraded"
              value={formatInteger(stats.degraded)}
              hint={`${formatInteger(stats.retired)} retired · expiring within 30 days`}
              badge="Watch"
              tone={stats.degraded > 0 ? "amber" : "green"}
            />
          </>
        )}
      </div>

      {loading && models.length === 0 ? (
        <LoadingCatalogue />
      ) : error && models.length === 0 ? (
        <CatalogueErrorState error={error} onRetry={() => void loadModels("initial")} />
      ) : (
        <>
          {error ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border-2 border-[#f2d38a] bg-[#fffaeb] px-4 py-2.5 text-[12.5px]">
              <span className="flex items-center gap-2 font-bold text-[#9a5b00]">
                <AlertTriangle size={14} />
                Refresh failed. Showing the last successful snapshot.
              </span>
              <button type="button" className="b sm" onClick={() => void loadModels("refresh")}>
                Retry
              </button>
            </div>
          ) : null}

          <section className="rounded-[20px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3 sm:p-4">
            <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_minmax(150px,0.8fr)_minmax(155px,0.9fr)_minmax(140px,0.8fr)]">
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--qs-muted)]"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Search models..."
                  aria-label="Search models"
                  className="h-11 w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] pl-10 pr-10 text-[13px] font-medium text-[var(--qs-ink)] outline-none transition-colors placeholder:text-[var(--qs-muted)] focus:border-[var(--qs-brand)]"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => updateQuery("")}
                    className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-[8px] text-[var(--qs-muted)] transition-colors hover:bg-[var(--qs-bg)] hover:text-[var(--qs-ink)]"
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                ) : null}
              </div>

              <CatalogueSelect icon={Building2} label="Filter by provider" value={provider} onChange={updateProvider}>
                <option value="all">All providers</option>
                {providerOptions.map(([key, option]) => (
                  <option key={key} value={key}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </CatalogueSelect>

              <CatalogueSelect icon={Layers3} label="Filter by capability" value={capability} onChange={updateCapability}>
                <option value="all">All capabilities</option>
                {capabilityOptions.map(([name, count]) => (
                  <option key={name} value={name}>
                    {name} ({count})
                  </option>
                ))}
              </CatalogueSelect>

              <CatalogueSelect icon={AlertTriangle} label="Filter by status" value={status} onChange={updateStatus}>
                <option value="all">All statuses</option>
                <option value="active">Active ({stats.active})</option>
                <option value="degraded">Degraded ({stats.degraded})</option>
                <option value="retired">Retired ({stats.retired})</option>
              </CatalogueSelect>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--qs-line)] pt-3">
              <p className="text-[11.5px] text-[var(--qs-muted)]" aria-live="polite">
                Showing <span className="font-extrabold text-[var(--qs-ink)]">{formatInteger(filtered.length)}</span> of{" "}
                <span className="font-extrabold text-[var(--qs-ink)]">{formatInteger(models.length)}</span> models
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-2 py-1 text-[11px] font-extrabold text-[var(--qs-brand)] transition-colors hover:bg-[#f1ecff]"
                >
                  <X size={12} />
                  Reset filters
                </button>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-[22px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[var(--qs-line)] px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="flex items-center gap-2 text-[15.5px] font-extrabold tracking-tight text-[var(--qs-ink)]">
                  <Sparkles size={15} className="text-[var(--qs-brand)]" />
                  Model matrix
                </h2>
                <p className="mt-0.5 text-[11.5px] text-[var(--qs-muted)]">
                  Prices converted from OpenRouter per-token rates × 1,000,000.
                </p>
              </div>
              <span className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                {formatInteger(filtered.length)} results
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-[var(--qs-line)] bg-[#fbfaff]">
                    <th scope="col" className="px-4 py-3 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)] first:pl-5">
                      Model name
                    </th>
                    <th scope="col" className="px-4 py-3 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                      Provider tag
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                      Price / 1M tokens
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                      Context window
                    </th>
                    <th scope="col" className="px-4 py-3 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                      Routes &amp; price updated
                    </th>
                    <th scope="col" className="px-4 py-3 pr-5 text-right text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--qs-muted)]">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleModels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-14 text-center">
                        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]">
                          <Search size={19} />
                        </span>
                        <p className="mt-3 text-[15px] font-extrabold text-[var(--qs-ink)]">No matching models</p>
                        <p className="mt-1 text-[12.5px] text-[var(--qs-muted)]">
                          Try a different search term or clear the active filters.
                        </p>
                        <button type="button" onClick={resetFilters} className="b sm mt-4">
                          Reset filters
                        </button>
                      </td>
                    </tr>
                  ) : (
                    visibleModels.map((model) => {
                      const provider = providerMeta(model.providerKey);

                      return (
                        <tr
                          key={model.id}
                          className="border-b border-[var(--qs-line)] transition-colors last:border-b-0 hover:bg-[#faf8ff]"
                        >
                          <td className="px-4 py-3.5 first:pl-5">
                            <div className="flex items-center gap-3">
                              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border-2 text-[9.5px] font-extrabold uppercase ${provider.className}`}>
                                {model.providerLabel.slice(0, 2)}
                              </span>
                              <div className="min-w-0">
                                <p className="max-w-[260px] truncate text-[13px] font-extrabold text-[var(--qs-ink)]">
                                  {model.displayName}
                                </p>
                                <p className="mt-0.5 max-w-[260px] truncate font-mono text-[10.5px] text-[var(--qs-muted)]">
                                  {model.id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <ProviderTag model={model} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col items-end gap-1">
                              <PriceLine label="in" value={formatPrice(model.inputPricePerM)} />
                              <PriceLine label="out" value={formatPrice(model.outputPricePerM)} />
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-[12px] font-extrabold tabular-nums text-[var(--qs-ink)]">
                                {formatTokens(model.contextLength)}
                              </span>
                              <span className="text-[9.5px] text-[var(--qs-muted)]">tokens</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusPill status={model.status} />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col items-start gap-0.5">
                              <a
                                href={model.modelUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11.5px] font-extrabold text-[var(--qs-brand)] transition-colors hover:text-[var(--qs-ink)] hover:underline"
                              >
                                <Route size={12} />
                                Routes
                                <ArrowUpRight size={10} />
                              </a>
                              <span className="text-[10px] text-[var(--qs-muted)]">Price updated {syncLabel}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 pr-5 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedId(model.id)}
                              className="inline-grid h-8 w-8 place-items-center rounded-[9px] border-2 border-transparent text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-line)] hover:bg-[var(--qs-bg)] hover:text-[var(--qs-brand)]"
                              aria-label={`View details for ${model.displayName}`}
                              title="View model details"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t-2 border-[var(--qs-line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-[11.5px] text-[var(--qs-muted)]">
                {filtered.length === 0 ? (
                  "No models match the current filters"
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-extrabold text-[var(--qs-ink)]">{formatInteger(startIndex + 1)}–{formatInteger(Math.min(startIndex + PAGE_SIZE, filtered.length))}</span>{" "}
                    of{" "}
                    <span className="font-extrabold text-[var(--qs-ink)]">{formatInteger(filtered.length)}</span> models
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex h-8 items-center gap-1 rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={13} />
                  Prev
                </button>
                <span className="min-w-[68px] rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1.5 text-center text-[11px] font-extrabold tabular-nums text-[var(--qs-ink)]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="inline-flex h-8 items-center gap-1 rounded-[9px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-[11px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      <Drawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.displayName ?? "Model"}
        subtitle={selected ? `${selected.providerLabel} · ${selected.id}` : undefined}
        footer={
          selected ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[var(--qs-muted)]">Rates × 1,000,000 tokens</span>
              <div className="flex items-center gap-2">
                <a
                  href={selected.endpointUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="b sm"
                >
                  Endpoints
                  <ExternalLink size={12} />
                </a>
                <a
                  href={selected.modelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="b b-pri sm"
                >
                  OpenRouter
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill status={selected.status} />
              <ProviderTag model={selected} />
              {selected.capabilities.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.07em] text-[var(--qs-muted)]"
                >
                  {item}
                </span>
              ))}
            </div>

            <p className="text-[13px] leading-relaxed text-[var(--qs-muted)]">{selected.description}</p>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">Input / 1M</p>
                <p className="mt-1 text-[20px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
                  {formatPrice(selected.inputPricePerM)}
                </p>
                <p className="mt-1 text-[9.5px] text-[var(--qs-muted)]">per 1M prompt tokens</p>
              </div>
              <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">Output / 1M</p>
                <p className="mt-1 text-[20px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
                  {formatPrice(selected.outputPricePerM)}
                </p>
                <p className="mt-1 text-[9.5px] text-[var(--qs-muted)]">per 1M completion tokens</p>
              </div>
              <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">Context</p>
                <p className="mt-1 text-[20px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
                  {formatTokens(selected.contextLength)}
                </p>
                <p className="mt-1 text-[9.5px] text-[var(--qs-muted)]">maximum input tokens</p>
              </div>
              <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] p-3">
                <p className="text-[9.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">Max output</p>
                <p className="mt-1 text-[20px] font-extrabold leading-none tabular-nums text-[var(--qs-ink)]">
                  {formatTokens(selected.maxCompletionTokens)}
                </p>
                <p className="mt-1 text-[9.5px] text-[var(--qs-muted)]">completion tokens</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[var(--qs-muted)]">
                Model metadata
              </p>
              <KeyValueList
                columns={2}
                items={[
                  { label: "Provider", value: selected.providerLabel },
                  { label: "Status", value: STATUS_STYLES[selected.status].label },
                  { label: "Model ID", value: <span className="font-mono text-[11.5px]">{selected.id}</span> },
                  { label: "Canonical slug", value: <span className="break-all font-mono text-[11.5px]">{selected.canonicalSlug}</span> },
                  { label: "Created", value: formatUnixDate(selected.createdAt) },
                  { label: "Price synced", value: syncLabel },
                  { label: "Modalities", value: formatModality(selected.modality) },
                  { label: "Tokenizer", value: selected.tokenizer ?? "—" },
                  { label: "Knowledge cutoff", value: selected.knowledgeCutoff ?? "Not published" },
                  {
                    label: "Expiration",
                    value: selected.expirationDate ? formatDate(selected.expirationDate) : "No expiry published",
                  },
                  {
                    label: "Supported parameters",
                    value: `${selected.supportedParameters.length} parameter${selected.supportedParameters.length === 1 ? "" : "s"}`,
                  },
                  {
                    label: "Input / output",
                    value: `${selected.inputModalities.join(", ") || "—"} → ${selected.outputModalities.join(", ") || "—"}`,
                  },
                ]}
              />
            </div>

            <div className="rounded-[14px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] p-3 text-[11.5px] leading-relaxed text-[var(--qs-muted)]">
              OpenRouter publishes pricing per individual token. This catalogue multiplies the prompt and completion
              rates by <span className="font-extrabold text-[var(--qs-ink)]">1,000,000</span> to display the input
              (“in”) and output (“out”) cost per one million tokens.
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
