"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  AppWindow,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  Eye,
  KeyRound,
  Lock,
  Maximize,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/helpers";
import { useToast } from "@/hooks/useToast";
import { useMySubscription } from "@/hooks/useMySubscription";
import { regenerateQuizCode } from "@/services/quiz";
import { useStudio } from "../StudioProvider";
import { StudioStepHeader, StudioStepLayout, SwitchField } from "../primitives";
import { TimingSection } from "../components/timing";
import { PlansUpsellModal } from "../components/PlansUpsellModal";

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
];

interface SettingField {
  key: string;
  label: string;
  type?: "number" | "select";
  options?: string[];
  description?: string;
  requiresPaid?: boolean;
}

export function SettingsStep() {
  const { subscription } = useMySubscription();
  const antiCheatAvailable = subscription?.antiCheatAvailable === true;

  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader title="Rules" />
      <p className="-mt-1 px-1 text-sm font-medium text-[var(--qs-muted)]">
        Only the rules that apply during an attempt.
      </p>
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
              antiCheatAvailable={antiCheatAvailable}
            />
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 + GROUPS.length * 0.06 }}
        >
          <SecurityCard antiCheatAvailable={antiCheatAvailable} />
        </motion.div>
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

const ANTI_CHEAT_FEATURES: Array<{ icon: LucideIcon; title: string; description: string }> = [
  { icon: Maximize, title: "Fullscreen lock", description: "Students stay inside the quiz" },
  { icon: AppWindow, title: "Tab-switch detection", description: "Know when someone leaves the tab" },
  { icon: Copy, title: "Copy protection", description: "Question text cannot be copied" },
];

function SecurityPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative hidden w-[300px] flex-none flex-col min-[900px]:flex min-[1240px]:w-[340px]"
    >
      <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-[18px] border-2 border-[#1a1033] bg-[radial-gradient(circle_at_25%_15%,#4a1fb8,#2a0f7a_70%)]">
        <div className="absolute -right-[26px] -top-[26px] h-[100px] w-[100px] rounded-full bg-[#ffc72c]" />
        <div className="absolute -bottom-[34px] -left-[30px] h-[110px] w-[110px] rounded-full border-[12px] border-[#ff6fb1]" />
        <span className="qs-student-view-label absolute left-[14px] top-[14px] rounded-full bg-white/15 px-[9px] py-1 text-[10px] font-extrabold tracking-[0.08em] text-white">
          STUDENT VIEW
        </span>
        <div className="absolute left-1/2 top-1/2 w-[76%] -translate-x-1/2 -translate-y-[46%] rounded-[14px] border-2 border-[#1a1033] bg-white p-3">
          <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#5b5470]">
            Question 4 of 10
            <span className="flex items-center gap-1 text-[#5b2ee8]">
              <ShieldCheck className="h-[15px] w-[15px]" />
              Anti-cheat on
            </span>
          </div>
          <div className="mb-2 mt-2.5 h-2 w-4/5 rounded-[4px] bg-[#e4ddf7]" />
          <div className="mb-1.5 h-[22px] rounded-[8px] border-2 border-[#e4ddf7]" />
          <div className="h-[22px] rounded-[8px] border-2 border-[#5b2ee8] bg-[#f1ecff]" />
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-[12px] border-2 border-[#1a1033] bg-[#fff3d6] px-3 py-[9px] text-xs font-bold text-[#8a4b00] shadow-[3px_3px_0_#1a1033]">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Tab switch detected
            <span className="block text-[11px] font-semibold">Return to your quiz</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SecurityCard({ antiCheatAvailable }: { antiCheatAvailable: boolean }) {
  const { state, updateSettings } = useStudio();
  const [open, setOpen] = useState(true);
  const [plansOpen, setPlansOpen] = useState(false);
  const [plansMounted, setPlansMounted] = useState(false);
  const locked = !antiCheatAvailable;
  const enabled = state.settings.antiCheatEnabled === true;

  const openPlans = () => {
    setPlansMounted(true);
    setPlansOpen(true);
  };

  return (
    <section
      aria-label="Security"
      className="min-w-0 overflow-hidden rounded-[20px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-[22px] py-[18px] text-left"
      >
        <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] border-2 border-[var(--qs-ink)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
          <ShieldCheck className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 text-base font-extrabold text-[var(--qs-ink)]">Security</span>
        <ChevronDown
          className={cn(
            "ml-auto h-[18px] w-[18px] shrink-0 text-[var(--qs-ink)] transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="flex gap-6 px-[22px] pb-[22px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[14px]">
            <div className="flex flex-wrap items-center gap-[10px]">
              <span className="text-[19px] font-extrabold leading-tight text-[var(--qs-ink)]">
                Anti-cheat mode
              </span>
              {locked && (
                <span className="inline-flex items-center gap-[5px] rounded-full bg-[var(--qs-ink)] px-[9px] py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#ffc72c]">
                  <Sparkles className="h-3 w-3" />
                  Paid plans
                </span>
              )}
              {locked ? (
                <button
                  type="button"
                  onClick={openPlans}
                  aria-label="Upgrade to enable anti-cheat mode"
                  className="ml-auto flex h-7 w-[50px] flex-none items-center rounded-full border-2 border-[#8b849c] bg-[#e4e0ee] p-0.5 transition-transform hover:-translate-y-px active:translate-y-0"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#8b849c] text-white">
                    <Lock className="h-[11px] w-[11px]" />
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-label="Anti-cheat mode"
                  onClick={() => updateSettings({ antiCheatEnabled: !enabled })}
                  className={cn(
                    "ml-auto flex h-7 w-[50px] flex-none items-center rounded-full border-2 p-0.5 transition-colors",
                    enabled
                      ? "border-[var(--qs-ink)] bg-[var(--qs-ok)]"
                      : "border-[#8b849c] bg-[#e4e0ee]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full transition-transform",
                      enabled
                        ? "translate-x-[22px] bg-[var(--qs-surface)] text-[var(--qs-ok)]"
                        : "bg-[#8b849c] text-white"
                    )}
                  >
                    {enabled ? (
                      <Check className="h-[11px] w-[11px]" strokeWidth={3} />
                    ) : (
                      <Lock className="h-[11px] w-[11px]" />
                    )}
                  </span>
                </button>
              )}
            </div>

            <p className="text-sm leading-normal text-[var(--qs-muted)]">
              {locked
                ? "Keep every attempt fair. Available on paid plans, so upgrade to switch it on."
                : "Keep every attempt fair. Fullscreen, tab-switch detection and copy protection are ready for this quiz."}
            </p>

            <div className="flex flex-col gap-3">
              {ANTI_CHEAT_FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-center gap-3">
                  <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[12px] border-2 border-[var(--qs-poly-3)] bg-[var(--qs-poly-1)] text-[var(--qs-brand)]">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-[var(--qs-ink)]">{title}</span>
                    <span className="block text-[13px] text-[var(--qs-muted)]">{description}</span>
                  </span>
                </div>
              ))}
            </div>

            {locked && (
              <>
                <div className="mt-1 flex flex-wrap items-center gap-[10px]">
                  <button
                    type="button"
                    onClick={openPlans}
                    className="inline-flex min-h-12 items-center justify-center gap-[10px] rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] py-0 pl-4 pr-2.5 text-sm font-extrabold text-[var(--qs-ink)] shadow-[3px_3px_0_var(--qs-ink)] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-[#ffd650] hover:shadow-[5px_5px_0_var(--qs-ink)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[var(--qs-brand)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                  >
                    <Sparkles className="h-[18px] w-[18px]" />
                    Unlock anti-cheat
                    <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--qs-ink)] text-[var(--qs-sun)]">
                      <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  </button>
                  <Link
                    href="/creator/billing/plans"
                    className="inline-flex min-h-11 items-center px-2 text-[13px] font-bold text-[var(--qs-brand)] underline underline-offset-2"
                  >
                    Compare plans
                  </Link>
                </div>
              </>
            )}
          </div>

          <SecurityPreview />
        </div>
      )}

      {plansMounted && (
        <PlansUpsellModal
          preset="anti-cheat"
          open={plansOpen}
          onClose={() => setPlansOpen(false)}
        />
      )}
    </section>
  );
}

function SettingGroup({
  label,
  icon: Icon,
  fields,
  comingSoon,
  alwaysOn,
  antiCheatAvailable,
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  fields: SettingField[];
  comingSoon?: boolean;
  alwaysOn?: boolean;
  antiCheatAvailable: boolean;
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
              <Field key={f.key} field={f} antiCheatAvailable={antiCheatAvailable} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function Field({ field, antiCheatAvailable }: { field: SettingField; antiCheatAvailable: boolean }) {
  const { state, updateSettings } = useStudio();
  const [plansOpen, setPlansOpen] = useState(false);
  const [plansMounted, setPlansMounted] = useState(false);
  const value = (state.settings as unknown as Record<string, unknown>)[field.key];
  const locked = field.requiresPaid === true && !antiCheatAvailable;
  const disabled = locked && !value;

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
    <div>
      <SwitchField
        label={field.label}
        description={disabled ? `${field.description ?? ""} Upgrade to a paid plan to enable it.` : field.description}
        checked={!!value}
        onChange={(v) => updateSettings({ [field.key]: v })}
        disabled={disabled}
      />
      {disabled && (
        <button
          type="button"
          onClick={() => {
            setPlansMounted(true);
            setPlansOpen(true);
          }}
          className="mb-2 inline-flex items-center rounded-[10px] border-2 border-[var(--qs-poly-3)] bg-[var(--qs-poly-1)] px-3 py-2 text-[12px] font-bold text-[var(--qs-brand)] transition-colors hover:border-[var(--qs-brand)]"
        >
          View paid plans
        </button>
      )}
      {locked && plansMounted && (
        <PlansUpsellModal
          preset="anti-cheat"
          open={plansOpen}
          onClose={() => setPlansOpen(false)}
        />
      )}
    </div>
  );
}
