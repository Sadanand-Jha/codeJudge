"use client";

import React, { useState } from "react";
import { Gauge, Pencil, ShieldCheck, TriangleAlert, Wallet } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  BUDGETS,
  type BudgetAction,
  type BudgetConfig,
} from "@/components/platform/ai-ops/mock-data";
import {
  AiOpsPageHeader,
  Field,
  FilterSelect,
  KpiCard,
  Modal,
  NoteBanner,
  ProgressBar,
  SectionCard,
  StatusBadge,
  Toggle,
  fmtInt,
  fmtMoney,
  inputClass,
  type StatusTone,
} from "@/components/platform/ai-ops/primitives";

const ACTION_TONE: Record<BudgetAction, StatusTone> = {
  warn: "warn",
  reject: "bad",
  disable: "info",
};

const STATUS_TONE: Record<BudgetConfig["status"], StatusTone> = {
  within: "ok",
  near: "warn",
  exceeded: "bad",
};

const STATUS_BASE_PCT: Record<BudgetConfig["status"], number> = {
  within: 62,
  near: 87,
  exceeded: 104,
};

const actionOptions = [
  { value: "warn", label: "Warn only" },
  { value: "reject", label: "Reject requests" },
  { value: "disable", label: "Disable feature" },
];

interface BudgetEditor {
  id: string;
  limit: string;
  warnThreshold: string;
  action: BudgetAction;
}

export default function AiOpsBudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetConfig[]>(() =>
    BUDGETS.map((budget) => ({ ...budget })),
  );
  const [editor, setEditor] = useState<BudgetEditor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const configuredCount = budgets.length;
  const enabledCount = budgets.filter((budget) => budget.enabled).length;
  const nearCount = budgets.filter((budget) => budget.status === "near").length;
  const exceededCount = budgets.filter((budget) => budget.status === "exceeded").length;

  const toggleBudget = (id: string, enabled: boolean) => {
    setBudgets((previous) =>
      previous.map((budget) => (budget.id === id ? { ...budget, enabled } : budget)),
    );
    toast.info("Demo-only change — enforcement requires the budgets API.");
  };

  const setAllEnabled = (enabled: boolean) => {
    setBudgets((previous) => previous.map((budget) => ({ ...budget, enabled })));
    toast.info(enabled ? "All budgets enabled (demo)" : "All budgets disabled (demo)", {
      description: "Enforcement requires the budgets API.",
    });
  };

  const openEdit = (budget: BudgetConfig) => {
    setFormError(null);
    setEditor({
      id: budget.id,
      limit: String(budget.limit),
      warnThreshold: String(budget.warnThreshold),
      action: budget.action,
    });
  };

  const saveBudget = () => {
    if (!editor) return;
    const limit = Number(editor.limit);
    const warnThreshold = Number(editor.warnThreshold);

    if (!Number.isFinite(limit) || limit <= 0) {
      setFormError("Limit must be a positive number.");
      return;
    }
    if (!Number.isInteger(warnThreshold) || warnThreshold < 1 || warnThreshold > 100) {
      setFormError("Warn threshold must be a whole number between 1 and 100.");
      return;
    }

    setBudgets((previous) =>
      previous.map((budget) =>
        budget.id === editor.id ? { ...budget, limit, warnThreshold, action: editor.action } : budget,
      ),
    );
    setEditor(null);
    toast.success("Budget updated (demo)", {
      description: "Backend integration required to persist budget changes.",
    });
  };

  return (
    <div className="space-y-6">
      <AiOpsPageHeader
        eyebrow="Guardrails"
        title="Budgets & limits"
        description="Spending, request and feature caps for AI operations. Configure thresholds and preview the intended enforcement action before the budgets API is connected."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="b sm b-ghost" onClick={() => setAllEnabled(false)}>
              Disable all
            </button>
            <button type="button" className="b sm" onClick={() => setAllEnabled(true)}>
              Enable all
            </button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Configured limits" value={fmtInt(configuredCount)} hint="across spend and volume" icon={Wallet} />
        <KpiCard label="Enabled limits" value={fmtInt(enabledCount)} hint="currently enforced in demo" icon={ShieldCheck} />
        <KpiCard label="Near limit" value={fmtInt(nearCount)} hint="status near" icon={Gauge} />
        <KpiCard label="Exceeded" value={fmtInt(exceededCount)} hint="status exceeded" icon={TriangleAlert} />
      </div>

      <NoteBanner tone="warn">
        Budgets currently demonstrate configuration only — no AI request is rejected or disabled in this console.
        Enforcement arrives with the budgets API.
      </NoteBanner>

      <div className="grid gap-5 lg:grid-cols-2">
        {budgets.map((budget, index) => {
          const usagePct = STATUS_BASE_PCT[budget.status] + ((index * 3) % 7);
          const used = Math.round((budget.limit * usagePct) / 100);
          const progressValue = Math.min(used, budget.limit);
          const isInr = budget.unit.includes("INR");
          const usageLabel = isInr
            ? `${fmtMoney(used)} used of ${fmtMoney(budget.limit)}`
            : `${fmtInt(used)} used of ${fmtInt(budget.limit)} ${budget.unit}`;

          return (
            <SectionCard
              key={budget.id}
              tone={budget.status === "exceeded" ? "ink" : "line"}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {budget.label}
                  <StatusBadge tone="neutral">{budget.scope}</StatusBadge>
                </span>
              }
              subtitle={budget.detail}
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-extrabold text-[var(--qs-ink)]">
                      {fmtInt(budget.limit)} {budget.unit}
                    </p>
                    <p className="mt-0.5 text-[12px] font-medium text-[var(--qs-muted)]">
                      warn at {budget.warnThreshold}%
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge tone={ACTION_TONE[budget.action]}>{budget.action}</StatusBadge>
                    <StatusBadge tone={STATUS_TONE[budget.status]} dot>
                      {budget.status}
                    </StatusBadge>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--qs-muted)]">
                    <span>{usageLabel}</span>
                    <span className="font-bold text-[var(--qs-ink)]">{usagePct}% simulated</span>
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar
                      value={progressValue}
                      max={budget.limit}
                      tone={budget.status === "exceeded" ? "bad" : budget.status === "near" ? "warn" : "ok"}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[var(--qs-line)] pt-3">
                  <div className="flex items-center gap-2.5">
                    <Toggle
                      checked={budget.enabled}
                      onChange={(next) => toggleBudget(budget.id, next)}
                      label={`Enforce ${budget.label}`}
                    />
                    <span className="text-[12.5px] font-bold text-[var(--qs-ink)]">
                      Enforce {budget.label}
                    </span>
                  </div>
                  <button type="button" className="b sm" onClick={() => openEdit(budget)}>
                    <Pencil size={13} />
                    Edit
                  </button>
                </div>
              </div>
            </SectionCard>
          );
        })}
      </div>

      <Modal
        open={editor !== null}
        onClose={() => setEditor(null)}
        title="Edit budget"
        description="Demo configuration only — saving does not change live enforcement."
        footer={
          <>
            <button type="button" className="b" onClick={() => setEditor(null)}>
              Cancel
            </button>
            <button type="button" className="b b-pri" onClick={saveBudget}>
              Save budget
            </button>
          </>
        }
      >
        {editor ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Limit" htmlFor="budget-limit" required>
                <input
                  id="budget-limit"
                  type="number"
                  min={1}
                  className={inputClass}
                  value={editor.limit}
                  onChange={(event) =>
                    setEditor((previous) => (previous ? { ...previous, limit: event.target.value } : previous))
                  }
                />
              </Field>
              <Field label="Warn threshold (%)" htmlFor="budget-warn" required>
                <input
                  id="budget-warn"
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  className={inputClass}
                  value={editor.warnThreshold}
                  onChange={(event) =>
                    setEditor((previous) =>
                      previous ? { ...previous, warnThreshold: event.target.value } : previous,
                    )
                  }
                />
              </Field>
            </div>
            <Field label="Action at limit" htmlFor="budget-action">
              <FilterSelect
                id="budget-action"
                label="Action at limit"
                value={editor.action}
                onChange={(value) =>
                  setEditor((previous) =>
                    previous ? { ...previous, action: value as BudgetAction } : previous,
                  )
                }
                options={actionOptions}
              />
            </Field>
            <p className="rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[12px] leading-relaxed text-[var(--qs-muted)]">
              Changes are stored in this demo session. Backend integration required to persist budget changes.
            </p>
            {formError ? (
              <p
                className="rounded-[12px] border-2 border-[var(--qs-bad)] bg-[var(--qs-badbg)] px-3 py-2 text-[12.5px] font-bold text-[var(--qs-bad)]"
                role="alert"
              >
                {formError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
