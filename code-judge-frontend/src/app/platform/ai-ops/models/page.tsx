"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  CAPABILITIES,
  DEFAULT_ROUTES,
  MODELS,
  PROVIDERS,
  TIER_LABELS,
  featureLabel,
  type AiModel,
  type AiTier,
  type Capability,
  type ModelStatus,
  type ProviderName,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  CHART_COLORS,
  ConfirmDialog,
  DataTable,
  Drawer,
  Field,
  FilterSelect,
  KeyValueList,
  KpiCard,
  LineChart,
  Modal,
  SearchInput,
  SectionCard,
  StatusBadge,
  Toggle,
  fmtDate,
  fmtInt,
  fmtMoney,
  type Column,
  type StatusTone,
} from "@/components/platform/ai-ops/primitives";

const STATUS_TONE: Record<ModelStatus, StatusTone> = {
  active: "ok",
  degraded: "warn",
  disabled: "neutral",
  deprecated: "bad",
};

const statusOptions = [
  { value: "all", label: "All statuses" },
  ...(["active", "degraded", "disabled", "deprecated"] as ModelStatus[]).map((status) => ({
    value: status,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
];

const providerOptions = [
  { value: "all", label: "All providers" },
  ...PROVIDERS.map((provider) => ({ value: provider, label: provider })),
];

const capabilityOptions = [
  { value: "all", label: "All capabilities" },
  ...CAPABILITIES.map((capability) => ({ value: capability, label: capability })),
];

interface ModelDraft {
  name: string;
  provider: ProviderName;
  modelId: string;
  inputPricePerM: string;
  outputPricePerM: string;
  contextWindow: string;
  status: ModelStatus;
  tierHint: AiTier;
  capabilities: Capability[];
}

interface EditorState {
  mode: "create" | "edit";
  id: string | null;
  draft: ModelDraft;
}

const toDraft = (model: AiModel): ModelDraft => ({
  name: model.name,
  provider: model.provider,
  modelId: model.modelId,
  inputPricePerM: String(model.inputPricePerM),
  outputPricePerM: String(model.outputPricePerM),
  contextWindow: String(model.contextWindow),
  status: model.status,
  tierHint: model.tierHint,
  capabilities: [...model.capabilities],
});

const emptyDraft = (): ModelDraft => ({
  name: "",
  provider: "OpenAI",
  modelId: "",
  inputPricePerM: "",
  outputPricePerM: "",
  contextWindow: "128000",
  status: "active",
  tierHint: "fast",
  capabilities: ["chat"],
});

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const cloneModels = (): AiModel[] =>
  MODELS.map((model) => ({ ...model, capabilities: [...model.capabilities], priceHistory: model.priceHistory.map((p) => ({ ...p })) }));

export default function AiOpsModelsPage() {
  const [models, setModels] = useState<AiModel[]>(cloneModels);
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [status, setStatus] = useState("all");
  const [capability, setCapability] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AiModel | null>(null);

  const selected = models.find((model) => model.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return models.filter((model) => {
      if (provider !== "all" && model.provider !== provider) return false;
      if (status !== "all" && model.status !== status) return false;
      if (capability !== "all" && !model.capabilities.includes(capability as Capability)) return false;
      if (!needle) return true;
      return [model.name, model.modelId, model.provider, model.id, ...model.capabilities]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [models, query, provider, status, capability]);

  const routesFor = (modelId: string) =>
    DEFAULT_ROUTES.filter((route) => route.primary === modelId || route.fallbacks.includes(modelId));

  const activeCount = models.filter((model) => model.status === "active").length;
  const attentionCount = models.filter((model) => model.status !== "active").length;
  const providerCount = new Set(models.map((model) => model.provider)).size;

  const columns: Column<AiModel>[] = [
    {
      key: "name",
      header: "Model",
      sortValue: (model) => model.name,
      render: (model) => (
        <div className="min-w-[170px]">
          <p className="font-bold text-[var(--qs-ink)]">{model.name}</p>
          <p className="font-mono text-[11.5px] text-[var(--qs-muted)]">{model.modelId}</p>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      sortValue: (model) => model.provider,
      render: (model) => <StatusBadge tone="neutral">{model.provider}</StatusBadge>,
    },
    {
      key: "pricing",
      header: "Price / 1M tokens",
      align: "right",
      sortValue: (model) => model.inputPricePerM,
      render: (model) => (
        <div>
          <p className="font-bold text-[var(--qs-ink)]">{fmtMoney(model.inputPricePerM)} in</p>
          <p className="text-[11.5px] text-[var(--qs-muted)]">{fmtMoney(model.outputPricePerM)} out</p>
        </div>
      ),
    },
    {
      key: "contextWindow",
      header: "Context",
      align: "right",
      sortValue: (model) => model.contextWindow,
      render: (model) => fmtInt(model.contextWindow),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (model) => model.status,
      render: (model) => <StatusBadge tone={STATUS_TONE[model.status]} dot>{model.status}</StatusBadge>,
    },
    {
      key: "routes",
      header: "Routes",
      align: "center",
      render: (model) => {
        const count = routesFor(model.id).length;
        return count > 0 ? (
          <span className="font-bold text-[var(--qs-ink)]">{count}</span>
        ) : (
          <span className="text-[var(--qs-muted)]">—</span>
        );
      },
    },
    {
      key: "updated",
      header: "Price updated",
      sortValue: (model) => model.lastPriceUpdate,
      render: (model) => <span className="text-[12px] text-[var(--qs-muted)]">{fmtDate(model.lastPriceUpdate)}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (model) => (
        <button
          type="button"
          className="b b-icon sm b-ghost"
          aria-label={`Open ${model.name}`}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedId(model.id);
          }}
        >
          <Eye size={14} />
        </button>
      ),
    },
  ];

  const openCreate = () => {
    setFormError(null);
    setEditor({ mode: "create", id: null, draft: emptyDraft() });
  };

  const openEdit = (model: AiModel) => {
    setFormError(null);
    setEditor({ mode: "edit", id: model.id, draft: toDraft(model) });
  };

  const updateDraft = <K extends keyof ModelDraft>(key: K, value: ModelDraft[K]) => {
    setEditor((prev) => (prev ? { ...prev, draft: { ...prev.draft, [key]: value } } : prev));
  };

  const toggleCapability = (capabilityValue: Capability) => {
    setEditor((prev) => {
      if (!prev) return prev;
      const exists = prev.draft.capabilities.includes(capabilityValue);
      const next = exists
        ? prev.draft.capabilities.filter((item) => item !== capabilityValue)
        : [...prev.draft.capabilities, capabilityValue];
      return { ...prev, draft: { ...prev.draft, capabilities: next } };
    });
  };

  const saveModel = () => {
    if (!editor) return;
    const { draft, mode, id } = editor;
    const input = Number(draft.inputPricePerM);
    const output = Number(draft.outputPricePerM);
    const context = Number(draft.contextWindow);

    if (!draft.name.trim()) {
      setFormError("Model name is required.");
      return;
    }
    if (!draft.modelId.trim()) {
      setFormError("Provider model ID is required.");
      return;
    }
    if (!Number.isFinite(input) || input < 0 || !Number.isFinite(output) || output < 0) {
      setFormError("Input and output prices must be zero or positive numbers.");
      return;
    }
    if (!Number.isFinite(context) || context < 1000) {
      setFormError("Context window must be at least 1,000 tokens.");
      return;
    }
    if (draft.capabilities.length === 0) {
      setFormError("Select at least one capability.");
      return;
    }

    if (mode === "edit" && id) {
      setModels((prev) =>
        prev.map((model) =>
          model.id === id
            ? {
                ...model,
                name: draft.name.trim(),
                provider: draft.provider,
                modelId: draft.modelId.trim(),
                inputPricePerM: input,
                outputPricePerM: output,
                contextWindow: context,
                status: draft.status,
                tierHint: draft.tierHint,
                capabilities: draft.capabilities,
                lastPriceUpdate: "2026-10-19",
              }
            : model,
        ),
      );
      toast.success("Model updated", {
        description: "Saved to this demo session only — backend integration required to persist registry changes.",
      });
    } else {
      let id = slugify(draft.name) || `model-${models.length + 1}`;
      let suffix = 2;
      while (models.some((model) => model.id === id)) {
        id = `${slugify(draft.name)}-${suffix}`;
        suffix += 1;
      }
      const nextModel: AiModel = {
        id,
        name: draft.name.trim(),
        provider: draft.provider,
        modelId: draft.modelId.trim(),
        inputPricePerM: input,
        outputPricePerM: output,
        contextWindow: context,
        capabilities: draft.capabilities,
        status: draft.status,
        tierHint: draft.tierHint,
        lastPriceUpdate: "2026-10-19",
        priceHistory: [
          { label: "Sep", input, output },
          { label: "Oct", input, output },
        ],
      };
      setModels((prev) => [...prev, nextModel]);
      setSelectedId(id);
      toast.success("Model added", {
        description: "Added to this demo session only — backend integration required to persist registry changes.",
      });
    }
    setEditor(null);
  };

  const quickToggle = (model: AiModel, enabled: boolean) => {
    setModels((prev) =>
      prev.map((item) =>
        item.id === model.id ? { ...item, status: enabled ? "active" : "disabled" } : item,
      ),
    );
    toast.info(enabled ? "Model enabled for routing" : "Model disabled for routing", {
      description: "Demo-only change. Production toggles will be written through the AI operations API.",
    });
  };

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Registry"
        title="Models & pricing"
        description="The model catalogue behind QuizSupport AI features. Add providers, review sample pricing, inspect price history and control which models are available to routing."
        actions={
          <button type="button" className="b b-pri sm" onClick={openCreate}>
            <Plus size={14} />
            Add model
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Models in registry" value={fmtInt(models.length)} hint={`${providerCount} providers`} icon={Boxes} />
        <KpiCard label="Routing-ready" value={fmtInt(activeCount)} hint="status active" icon={CheckCircle2} />
        <KpiCard label="Providers" value={fmtInt(providerCount)} hint={PROVIDERS.join(" · ")} icon={Building2} />
        <KpiCard
          label="Needs attention"
          value={fmtInt(attentionCount)}
          hint="degraded, disabled or deprecated"
          icon={AlertTriangle}
        />
      </div>

      <SectionCard
        title="Model catalogue"
        subtitle="Prices are illustrative demo rates per 1M tokens — confirm with provider pricing before production use."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search models…" className="w-[190px]" />
            <FilterSelect label="Provider" value={provider} onChange={setProvider} options={providerOptions} className="w-[150px]" />
            <FilterSelect label="Capability" value={capability} onChange={setCapability} options={capabilityOptions} className="w-[150px]" />
            <FilterSelect label="Status" value={status} onChange={setStatus} options={statusOptions} className="w-[140px]" />
          </div>
        }
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(model) => model.id}
          pageSize={8}
          onRowClick={(model) => setSelectedId(model.id)}
          emptyLabel="No models match the current filters."
        />
      </SectionCard>

      <Drawer
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? "Model"}
        subtitle={selected ? `${selected.provider} · ${selected.modelId}` : undefined}
        footer={
          selected ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                className="b sm b-danger"
                onClick={() => setDeleteTarget(selected)}
              >
                <Trash2 size={13} />
                Delete
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[var(--qs-muted)]">
                  {selected.status === "disabled" ? "Disabled for routing" : "Enabled for routing"}
                </span>
                <Toggle
                  checked={selected.status !== "disabled" && selected.status !== "deprecated"}
                  onChange={(next) => quickToggle(selected, next)}
                  label={`Enable ${selected.name} for routing`}
                />
                <button type="button" className="b b-pri sm" onClick={() => openEdit(selected)}>
                  <Pencil size={13} />
                  Edit model
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={STATUS_TONE[selected.status]} dot>
                {selected.status}
              </StatusBadge>
              <StatusBadge tone="brand">{TIER_LABELS[selected.tierHint]}</StatusBadge>
              {selected.capabilities.map((item) => (
                <StatusBadge key={item} tone="neutral">
                  {item}
                </StatusBadge>
              ))}
            </div>

            <KeyValueList
              columns={2}
              items={[
                { label: "Provider", value: selected.provider },
                { label: "Provider model ID", value: <span className="font-mono text-[12.5px]">{selected.modelId}</span> },
                { label: "Input price", value: `${fmtMoney(selected.inputPricePerM)} / 1M tokens` },
                { label: "Output price", value: `${fmtMoney(selected.outputPricePerM)} / 1M tokens` },
                { label: "Context window", value: `${fmtInt(selected.contextWindow)} tokens` },
                { label: "Price updated", value: fmtDate(selected.lastPriceUpdate) },
              ]}
            />

            <div>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
                Price history (sample)
              </p>
              <LineChart
                ariaLabel={`Price history for ${selected.name}`}
                labels={selected.priceHistory.map((point) => point.label)}
                formatValue={(value) => fmtMoney(value)}
                height={170}
                series={[
                  {
                    name: "Input / 1M",
                    color: CHART_COLORS.blue,
                    points: selected.priceHistory.map((point) => point.input),
                    area: true,
                  },
                  {
                    name: "Output / 1M",
                    color: CHART_COLORS.brand,
                    points: selected.priceHistory.map((point) => point.output),
                  },
                ]}
              />
            </div>

            <div>
              <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.09em] text-[var(--qs-muted)]">
                Used by routes
              </p>
              {routesFor(selected.id).length === 0 ? (
                <p className="text-[13px] text-[var(--qs-muted)]">Not referenced by any current feature route.</p>
              ) : (
                <ul className="space-y-2">
                  {routesFor(selected.id).map((route) => (
                    <li
                      key={route.feature}
                      className="flex items-center justify-between gap-3 rounded-[12px] border-2 border-[var(--qs-line)] px-3 py-2 text-[13px]"
                    >
                      <span className="font-bold text-[var(--qs-ink)]">{featureLabel(route.feature)}</span>
                      <StatusBadge tone={route.primary === selected.id ? "brand" : "neutral"}>
                        {route.primary === selected.id ? "Primary" : "Fallback"}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-[12px] leading-relaxed text-[var(--qs-muted)]">
              All pricing on this page is sample data. Real rates come from provider invoices and must be synced by the
              backend before spend figures are treated as authoritative.
            </p>
          </div>
        ) : null}
      </Drawer>

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === "create" ? "Add model" : "Edit model"}
        description="Demo registry only — saving updates this session and does not call any provider."
        footer={
          <>
            <button type="button" className="b" onClick={() => setEditor(null)}>
              Cancel
            </button>
            <button type="button" className="b b-pri" onClick={saveModel}>
              {editor?.mode === "create" ? "Add model" : "Save changes"}
            </button>
          </>
        }
      >
        {editor ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Display name" htmlFor="model-name" required>
                <input
                  id="model-name"
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                  value={editor.draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="GPT-5 mini"
                />
              </Field>
              <Field label="Provider model ID" htmlFor="model-provider-id" required>
                <input
                  id="model-provider-id"
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 font-mono text-[13px] text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                  value={editor.draft.modelId}
                  onChange={(event) => updateDraft("modelId", event.target.value)}
                  placeholder="gpt-5-mini-2026-01"
                />
              </Field>
              <Field label="Provider" htmlFor="model-provider">
                <FilterSelect
                  id="model-provider"
                  label="Provider"
                  value={editor.draft.provider}
                  onChange={(value) => updateDraft("provider", value as ProviderName)}
                  options={PROVIDERS.map((item) => ({ value: item, label: item }))}
                />
              </Field>
              <Field label="Tier hint" htmlFor="model-tier">
                <FilterSelect
                  id="model-tier"
                  label="Tier hint"
                  value={editor.draft.tierHint}
                  onChange={(value) => updateDraft("tierHint", value as AiTier)}
                  options={(Object.keys(TIER_LABELS) as AiTier[]).map((tier) => ({
                    value: tier,
                    label: TIER_LABELS[tier],
                  }))}
                />
              </Field>
              <Field label="Input price (₹ / 1M)" htmlFor="model-input-price" required>
                <input
                  id="model-input-price"
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                  value={editor.draft.inputPricePerM}
                  onChange={(event) => updateDraft("inputPricePerM", event.target.value)}
                />
              </Field>
              <Field label="Output price (₹ / 1M)" htmlFor="model-output-price" required>
                <input
                  id="model-output-price"
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                  value={editor.draft.outputPricePerM}
                  onChange={(event) => updateDraft("outputPricePerM", event.target.value)}
                />
              </Field>
              <Field label="Context window (tokens)" htmlFor="model-context" required>
                <input
                  id="model-context"
                  type="number"
                  min={1000}
                  step="1000"
                  className="w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-field)] px-3.5 py-2.5 text-[14px] font-medium text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
                  value={editor.draft.contextWindow}
                  onChange={(event) => updateDraft("contextWindow", event.target.value)}
                />
              </Field>
              <Field label="Status" htmlFor="model-status">
                <FilterSelect
                  id="model-status"
                  label="Status"
                  value={editor.draft.status}
                  onChange={(value) => updateDraft("status", value as ModelStatus)}
                  options={(["active", "degraded", "disabled", "deprecated"] as ModelStatus[]).map((item) => ({
                    value: item,
                    label: item.charAt(0).toUpperCase() + item.slice(1),
                  }))}
                />
              </Field>
            </div>

            <Field label="Capabilities" hint="Choose every capability this model supports in routing.">
              <div className="flex flex-wrap gap-1.5">
                {CAPABILITIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="b b-chip sm"
                    data-selected={editor.draft.capabilities.includes(item)}
                    aria-pressed={editor.draft.capabilities.includes(item)}
                    onClick={() => toggleCapability(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </Field>

            {formError ? (
              <p className="rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2 text-[12.5px] font-bold text-[var(--qs-bad)]" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          const referenced = routesFor(deleteTarget.id).length;
          setModels((prev) => prev.filter((model) => model.id !== deleteTarget.id));
          setSelectedId((current) => (current === deleteTarget.id ? null : current));
          toast.warning("Model removed", {
            description: referenced
              ? `${referenced} demo route(s) still reference this model — production deletes should require reassignment first.`
              : "Removed from this demo session. Backend integration required for persistence.",
          });
          setDeleteTarget(null);
        }}
        title="Delete model?"
        description={
          deleteTarget
            ? `“${deleteTarget.name}” will be removed from this demo registry. Real deletion needs to check routing fallbacks first.`
            : ""
        }
        confirmLabel="Delete model"
        tone="danger"
      />
    </div>
  );
}
