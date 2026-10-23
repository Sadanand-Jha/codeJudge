"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronDown, ClipboardList, Copy, Eye, KeyRound, RefreshCw, ShieldCheck, Shuffle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { regenerateQuizCode } from "@/services/quiz";
import { useStudio } from "../StudioProvider";
import { StudioStepHeader, StudioStepLayout, SwitchField } from "../primitives";
import { TimingSection } from "../components/timing";
import { formatDateTimeIST } from "../components/timing/helpers";

const GROUPS: Array<{ id: string; label: string; icon: LucideIcon; fields: SettingField[]; comingSoon?: boolean; alwaysOn?: boolean }> = [
  {
    id: "behavior",
    label: "Question Behavior",
    icon: Shuffle,
    fields: [
      { key: "randomizeQuestions", label: "Randomize question order" },
      { key: "randomizeOptions", label: "Randomize option order" },
    ],
  },
  {
    id: "result",
    label: "Result & Visibility",
    icon: Eye,
    fields: [
      { key: "showResultsImmediately", label: "Show results", description: "Students can see the marks obtained in their attempt" },
    ],
  },
  {
    id: "security",
    label: "Security",
    icon: ShieldCheck,
    alwaysOn: true,
    fields: [
      { key: "fullscreenMode", label: "Full-screen mode" },
      { key: "tabSwitchDetection", label: "Tab-switch detection" },
      { key: "copyProtection", label: "Disable copy / text selection" },
    ],
  },
];

interface SettingField {
  key: string;
  label: string;
  type?: "number" | "select";
  options?: string[];
  description?: string;
}

export function SettingsStep() {
  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader title="Rules" />
      <p className="-mt-1 px-1 text-sm font-medium text-[var(--qs-muted)]">
        Only the rules that apply during an attempt.
      </p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <TimingSection variant="rules" />

          {GROUPS.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
            >
              <SettingGroup
                key={g.id}
                id={g.id}
                label={g.label}
                icon={g.icon}
                fields={g.fields}
                comingSoon={g.comingSoon}
                alwaysOn={g.alwaysOn}
              />
            </motion.div>
          ))}
        </div>

        <SummaryAside />
      </div>
    </StudioStepLayout>
  );
}

export function QuizCodeCard() {
  const { state, updateInfo } = useStudio();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  if (!state.serverQuizId) return null;

  const code = state.info.code;

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success({ title: "Quiz code copied", description: code });
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error({ title: "Could not copy code", description: "Copy it manually from the box." });
    }
  };

  const regenerate = async () => {
    if (!state.serverQuizId) return;
    setGenerating(true);
    try {
      const nextCode = await regenerateQuizCode(state.serverQuizId);
      updateInfo({ code: nextCode });
      setConfirming(false);
      toast.success({
        title: "New quiz code generated",
        description: "The previous code has stopped working.",
      });
    } catch {
      toast.error({
        title: "Could not generate a new code",
        description: "Please try again in a moment.",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1a1240]">
            <KeyRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-[var(--qs-ink)]">Quiz code</h3>
            <p className="mt-0.5 text-xs font-medium text-[var(--qs-muted)]">
              Students use this code to join your quiz.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={copyCode}
          disabled={!code}
          className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 text-xs font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[var(--qs-ok)]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-bg)] px-3 py-2 font-mono text-sm font-black tracking-[0.18em] text-[var(--qs-ink)]">
          {code || "—"}
        </code>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={generating}
            className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] px-3 text-xs font-extrabold text-[var(--qs-ink)] shadow-[2px_2px_0_var(--qs-sun)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
            Generate new code
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-[10px] border-2 border-[#e2b13c] bg-[#fff3d6] py-1.5 pl-2.5 pr-1.5">
            <p className="text-xs font-bold text-[#7a4a00]">The old code will stop working.</p>
            <button
              type="button"
              onClick={regenerate}
              disabled={generating}
              className="inline-flex h-7 items-center gap-1.5 rounded-[8px] border-2 border-[var(--qs-ink)] bg-[var(--qs-ink)] px-2 text-[11px] font-extrabold text-[var(--qs-bg)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3 w-3", generating && "animate-spin")} />
              {generating ? "Generating…" : "Yes, generate"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={generating}
              className="inline-flex h-7 items-center rounded-[8px] border-2 border-[#e2b13c] bg-transparent px-2 text-[11px] font-extrabold text-[#7a4a00] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryAside() {
  const { state } = useStudio();
  const lifecycle = state.info.quizLifecycle;
  const status =
    lifecycle === "live"
      ? { label: "Live", pill: "border-[var(--qs-ok)]/40 bg-[var(--qs-okbg)] text-[var(--qs-ok)]", live: true }
      : lifecycle === "scheduled"
        ? { label: "Scheduled", pill: "border-[#a85d00]/40 bg-[#fff3d6] text-[#a85d00]", live: false }
        : lifecycle === "ended"
          ? { label: "Ended", pill: "border-[var(--qs-bad)]/40 bg-[var(--qs-badbg)] text-[var(--qs-bad)]", live: false }
          : { label: "Draft", pill: "border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]", live: false };

  const startLabel =
    lifecycle === "scheduled" && state.info.startDate
      ? formatDateTimeIST(state.info.startDate)
      : "Manual";

  return (
    <aside className="min-w-0 lg:sticky lg:top-4">
      <div className="overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
        <div className="flex items-center justify-between border-b-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] px-4 py-3">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1a1240]">Summary</p>
          <ClipboardList className="h-4 w-4 text-[#1a1240]" />
        </div>
        <dl className="divide-y-2 divide-[var(--qs-line)] text-xs">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <dt className="font-bold text-[var(--qs-muted)]">Status</dt>
            <dd>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border-2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide",
                  status.pill
                )}
              >
                {status.live && (
                  <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" />
                )}
                {status.label}
              </span>
            </dd>
          </div>
          <SummaryRow label="Start" value={startLabel} />
        </dl>
      </div>
    </aside>
  );
}

function SummaryRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <dt className="font-bold text-[var(--qs-muted)]">{label}</dt>
      <dd className={cn("font-extrabold tabular-nums text-[var(--qs-ink)]", valueClassName)}>{value}</dd>
    </div>
  );
}

function SettingGroup({
  label,
  icon: Icon,
  fields,
  comingSoon,
  alwaysOn,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  fields: SettingField[];
  comingSoon?: boolean;
  alwaysOn?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4", comingSoon && "opacity-60")}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 text-sm font-black text-[var(--qs-ink)]">
            {label}
          </span>
          {comingSoon && (
            <span className="shrink-0 rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--qs-muted)]">
              Coming soon
            </span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-[var(--qs-muted)] transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-2 divide-y-2 divide-[var(--qs-line)]">
          {fields.map((f) =>
            alwaysOn ? (
              <div key={f.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-[var(--qs-ink)]">{f.label}</span>
                <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)]">
                  <span className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>
            ) : comingSoon ? (
              <div key={f.key} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium text-[var(--qs-muted)]">{f.label}</span>
                <span className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-line)] opacity-60">
                  <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
                </span>
              </div>
            ) : (
              <Field key={f.key} field={f} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function Field({ field }: { field: SettingField }) {
  const { state, updateSettings } = useStudio();
  const value = (state.settings as unknown as Record<string, unknown>)[field.key];

  if (field.type === "select") {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm font-medium text-[var(--qs-ink)]">{field.label}</span>
        <select
          value={String(value)}
          onChange={(e) => updateSettings({ [field.key]: e.target.value })}
          className="rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2.5 py-1 text-xs font-bold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
        >
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="flex items-center justify-between py-2.5">
        <span className="text-sm font-medium text-[var(--qs-ink)]">{field.label}</span>
        <input
          type="number"
          min={0}
          value={Number(value) || ""}
          onChange={(e) => updateSettings({ [field.key]: Number(e.target.value) })}
          className="h-8 w-20 rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-2 text-xs font-bold text-[var(--qs-ink)] outline-none focus:border-[var(--qs-brand)]"
        />
      </div>
    );
  }

  return (
    <SwitchField
      label={field.label}
      description={field.description}
      checked={!!value}
      onChange={(v) => updateSettings({ [field.key]: v })}
    />
  );
}
