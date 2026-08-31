"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Split,
  Users,
  Lightbulb,
  SkipForward,
  Timer,
  Zap,
  Snowflake,
  MinusCircle,
  Eye,
  Info,
  Check,
  X,
  Settings2,
  Trophy,
  Gamepad2,
  Flame,
  Gauge,
  RotateCcw,
  TimerOff,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  type GameMechanicsConfig,
  type MechanicId,
  type UsesValue,
  isMechanicAvailable,
  getEnabledMechanicsSummary,
  MECHANIC_META,
  DEFAULT_GAME_MECHANICS,
} from "../types/gameMechanics";
import type { CreatorQuestionType } from "@/components/quiz/creator/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  split: Split,
  users: Users,
  lightbulb: Lightbulb,
  skip: SkipForward,
  timer: Timer,
  zap: Zap,
  snowflake: Snowflake,
  minus: MinusCircle,
  flame: Flame,
  gauge: Gauge,
  rotate: RotateCcw,
  "timer-off": TimerOff,
};

function UsesSelect({ value, onChange, disabled }: { value: UsesValue; onChange: (v: UsesValue) => void; disabled?: boolean }) {
  const numValue = typeof value === "number" ? value : 1;
  const [local, setLocal] = useState(String(numValue));
  return (
    <div className="flex items-center gap-1.5">
      <input
        data-uses-input="true"
        type="number"
        min={1}
        max={99}
        value={typeof value === "number" ? String(value) : local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          if (v === "") return;
          const num = Math.max(1, Math.min(99, Number(v) || 1));
          if (!isNaN(num)) onChange(num as UsesValue);
        }}
        disabled={disabled}
        placeholder="1"
        className={cn(
          "h-7 w-16 rounded-full border bg-background px-3 text-center text-xs font-medium focus:outline-none focus:border-[#E91E63]/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          "border-border text-text-primary",
          disabled && "opacity-40 cursor-not-allowed"
        )}
      />
      <span className="text-[11px] text-text-muted">times per test</span>
    </div>
  );
}

function SmallToggle({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
        disabled ? "opacity-40 cursor-not-allowed" : "",
        enabled ? "bg-[#E91E63] border-[#E91E63]" : "bg-card border-border"
      )}
    >
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", enabled ? "translate-x-4" : "translate-x-0.5")} />
    </button>
  );
}

function MechanicCard({
  id,
  config,
  onChange,
  available,
  reason,
  scopeLabel,
}: {
  id: MechanicId;
  config: GameMechanicsConfig;
  onChange: (next: GameMechanicsConfig) => void;
  available: boolean;
  reason?: string;
  scopeLabel: string;
}) {
  const meta = MECHANIC_META[id];
  const Icon = ICON_MAP[meta.icon] ?? Lightbulb;
  const m: any = (config as any)[id];
  const enabled = m?.enabled ?? false;

  // helper to patch — when disabling, force uses to 0; when enabling from 0, restore to 1
  const patch = (patchObj: any) => {
    const next = JSON.parse(JSON.stringify(config)) as GameMechanicsConfig;
    const merged = { ...(next as any)[id], ...patchObj };
    if ("enabled" in patchObj) {
      if (patchObj.enabled === false) merged.uses = 0;
      else if (patchObj.enabled === true && (merged.uses === 0 || merged.uses == null)) merged.uses = 1;
    }
    (next as any)[id] = merged;
    onChange(next);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-background p-4 transition-all duration-200",
        !available ? "opacity-60 bg-card border-dashed" : enabled ? "border-[#E91E63]/30 bg-[#E91E63]/[0.04] shadow-[0_0_0_1px_rgba(233,30,99,0.08),0_4px_16px_rgba(233,30,99,0.08)]" : "border-border hover:border-border-hover hover:bg-card"
      )}
    >
      {!available && (
        <div className="absolute inset-0 bg-card/60 backdrop-blur-[0.5px] pointer-events-none" />
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", enabled ? "bg-[#E91E63] text-white border-[#E91E63] shadow-[0_2px_8px_rgba(233,30,99,0.3)]" : "bg-card-hover border-border text-text-muted")}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-text-primary leading-none flex items-center gap-1.5">
              {meta.label}
              {id === "doublePoints" && enabled && <Trophy className="h-3 w-3 text-amber-500" />}
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted line-clamp-2">{meta.description}</p>
          </div>
        </div>
        <SmallToggle enabled={enabled} onToggle={() => patch({ enabled: !enabled })} disabled={!available} />
      </div>

      {!available && reason && (
        <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          {reason}
        </p>
      )}
      {available && (id === "streakBonus" || id === "speedBonus" || id === "secondChance") && (
        <p className="mt-2 text-[11px] text-text-muted italic">Extensible — UI ready, backend will enforce when enabled.</p>
      )}

      {available && enabled && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 space-y-3 border-t border-border pt-3">
          {/* Uses */}
          {id !== "hint" && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-secondary">
                {id === "skip" || id === "doublePoints" || id === "extraTime" || id === "freezeTimer" ? "Uses per quiz" : "Uses per student"}
              </span>
              <UsesSelect value={m.uses} onChange={(v) => patch({ uses: v })} />
            </div>
          )}

          {/* Specific configs */}
          {id === "audiencePoll" && (
            <div className="space-y-2">
              <label className="flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-2">
                <span className="text-xs text-text-primary">Show percentages</span>
                <SmallToggle enabled={m.showPercentages} onToggle={() => patch({ showPercentages: !m.showPercentages })} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border bg-card px-2.5 py-2">
                <span className="text-xs text-text-primary">Show response count</span>
                <SmallToggle enabled={m.showResponseCount} onToggle={() => patch({ showResponseCount: !m.showResponseCount })} />
              </label>
              <p className="text-[11px] text-text-muted">Poll uses actual participant answers when available.</p>
            </div>
          )}

          {id === "hint" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">Uses per student</span>
                <UsesSelect value={m.uses} onChange={(v) => patch({ uses: v })} />
              </div>
              <div className="space-y-2">
                {m.hints.map((h: any, idx: number) => (
                  <div key={h.id} className="rounded-xl border border-border bg-card p-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary">Hint {idx + 1}</span>
                      <button onClick={() => {
                        const next = JSON.parse(JSON.stringify(config)) as GameMechanicsConfig;
                        next.hint.hints = next.hint.hints.filter((x: any) => x.id !== h.id);
                        if (next.hint.hints.length === 0) next.hint.hints = [{ id: `h${Date.now()}`, content: "", penalty: 0 }];
                        onChange(next);
                      }} className="text-[11px] text-text-muted hover:text-red-600">Remove</button>
                    </div>
                    <textarea
                      value={h.content}
                      onChange={(e) => {
                        const next = JSON.parse(JSON.stringify(config)) as GameMechanicsConfig;
                        const target = next.hint.hints.find((x: any) => x.id === h.id);
                        if (target) target.content = e.target.value;
                        onChange(next);
                      }}
                      placeholder={idx === 0 ? "Think about the operation used to remove the most recently inserted element." : "Stronger clue..."}
                      rows={2}
                      className="mt-2 w-full rounded-lg border border-border bg-background px-2.5 py-2 text-xs focus:outline-none focus:border-[#E91E63]/40"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[11px] text-text-muted">Penalty</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={h.penalty}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.\-]/g, "");
                          const num = v === "" || v === "-" ? 0 : Number(v);
                          const next = JSON.parse(JSON.stringify(config)) as GameMechanicsConfig;
                          const target = next.hint.hints.find((x: any) => x.id === h.id);
                          if (target) target.penalty = isNaN(num) ? 0 : num;
                          onChange(next);
                        }}
                        className="h-7 w-20 rounded-lg border border-border bg-background px-2 text-xs"
                      />
                      <span className="text-[11px] text-text-muted">marks {h.penalty === 0 ? "(free)" : `(-${h.penalty})`}</span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const next = JSON.parse(JSON.stringify(config)) as GameMechanicsConfig;
                    if (next.hint.hints.length >= 3) return;
                    next.hint.hints.push({ id: `h${Date.now()}`, content: "", penalty: 0.25 });
                    onChange(next);
                  }}
                  disabled={m.hints.length >= 3}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-pink-300 dark:border-pink-400/30 bg-pink-50/50 dark:bg-pink-500/10 py-1.5 text-xs font-medium text-[#E91E63] disabled:opacity-40"
                >
                  + Add hint level
                </button>
              </div>
            </div>
          )}

          {id === "skip" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Penalty</span>
              <input
                type="text"
                inputMode="decimal"
                value={m.penalty}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9.\-]/g, "");
                  patch({ penalty: v === "" ? 0 : Number(v) || 0 });
                }}
                className="h-7 w-20 rounded-lg border border-border bg-background px-2 text-xs"
              />
              <span className="text-xs text-text-muted">marks</span>
              <span className="ml-auto text-[11px] text-text-muted">Shown in navigator</span>
            </div>
          )}

          {id === "extraTime" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Extra time</span>
                <div className="flex gap-1">
                  {[15, 30, 60].map((sec) => (
                    <button key={sec} onClick={() => patch({ seconds: sec })} className={cn("rounded-full border px-2 py-1 text-xs", m.seconds === sec ? "bg-[#E91E63] text-white border-[#E91E63]" : "bg-card border-border text-text-muted")}>
                      {sec}s
                    </button>
                  ))}
                  <button onClick={() => patch({ seconds: 45 })} className={cn("rounded-full border px-2 py-1 text-xs", ![15, 30, 60].includes(m.seconds) ? "bg-[#E91E63] text-white border-[#E91E63]" : "bg-card border-border")}>Custom</button>
                </div>
              </div>
              {![15, 30, 60].includes(m.seconds) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Custom</span>
                  <input type="number" value={m.seconds} onChange={(e) => patch({ seconds: Math.max(5, Number(e.target.value) || 15) })} className="h-7 w-20 rounded-lg border border-border bg-background px-2 text-xs" />
                  <span className="text-xs text-text-muted">sec</span>
                </div>
              )}
              <p className="text-[11px] text-text-muted">Only for timed quizzes.</p>
            </div>
          )}

          {id === "freezeTimer" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">Duration</span>
              <div className="flex gap-1">
                {[10, 15, 30].map((d) => (
                  <button key={d} onClick={() => patch({ duration: d })} className={cn("rounded-full border px-2 py-1 text-xs", m.duration === d ? "bg-[#E91E63] text-white border-[#E91E63]" : "bg-card border-border text-text-muted")}>
                    {d}s
                  </button>
                ))}
              </div>
            </div>
          )}
          {(id === "streakBonus" || id === "speedBonus" || id === "secondChance") && enabled && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary">Uses per quiz</span>
              <UsesSelect value={m.uses} onChange={(v) => patch({ uses: v })} />
            </div>
          )}

          {id === "decayingPoints" && (
            <div className="space-y-2">
              <p className="text-[11px] text-text-muted">Points on each question decrease every second. Faster answers earn more marks.</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-secondary">Decay per second</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={m.decayPerSecond}
                    onChange={(e) => patch({ decayPerSecond: Math.max(0.5, Number(e.target.value) || 1) })}
                    className="h-7 w-16 rounded-lg border border-border bg-background px-2 text-xs text-center"
                  />
                  <span className="text-[11px] text-text-muted">pts/s</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-text-secondary">Minimum points</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={m.minPoints}
                    onChange={(e) => patch({ minPoints: Math.max(0, Number(e.target.value) || 0) })}
                    className="h-7 w-16 rounded-lg border border-border bg-background px-2 text-xs text-center"
                  />
                  <span className="text-[11px] text-text-muted">marks</span>
                </div>
              </div>
              <p className="text-[11px] text-text-muted">Example: 10-mark question, 1 pt/s decay, 1 min left → {Math.max(1, 10 - 60)} marks possible.</p>
            </div>
          )}

          {id === "fiftyFifty" && (
            <p className="text-[11px] text-text-muted">Removes 2 incorrect options intelligently — never the correct answer. For &lt;4 options, removes only 1.</p>
          )}
          {id === "eliminateOne" && (
            <p className="text-[11px] text-text-muted">Removes a single incorrect option. Lighter than 50:50.</p>
          )}
          <p className="text-[10px] text-text-muted">{scopeLabel}</p>
        </motion.div>
      )}
    </div>
  );
}

export function GameMechanicsPanel({
  config,
  onChange,
  scope,
  questionType = "quiz",
  hasTimer = true,
}: {
  config: GameMechanicsConfig;
  onChange: (next: GameMechanicsConfig) => void;
  scope: "quiz" | "question";
  questionType?: CreatorQuestionType | "quiz";
  hasTimer: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const summary = getEnabledMechanicsSummary(config);
  const scopeLabel = scope === "quiz" ? "Available throughout the quiz." : "Available only for this question.";
  const usageLabel = scope === "quiz" ? "Quiz-wide" : "Question-specific";

  const lifelines: MechanicId[] = ["fiftyFifty", "audiencePoll", "hint", "skip", "extraTime", "eliminateOne"];
  const powerUps: MechanicId[] = ["doublePoints", "freezeTimer", "streakBonus", "speedBonus", "secondChance", "decayingPoints"];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E91E63] text-white shadow-[0_4px_12px_rgba(233,30,99,0.25)]">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                🎮 Game Mechanics
                <span className="rounded-full bg-[#E91E63]/10 border border-[#E91E63]/20 px-2 py-0.5 text-[10px] font-bold text-[#E91E63] tracking-wide">{usageLabel}</span>
              </h3>
              <p className="mt-1 text-xs text-text-muted">Give students limited-use abilities to make the assessment more interactive.</p>
              <p className="mt-0.5 text-[11px] text-text-muted font-medium">{scope === "quiz" ? "Quiz-wide rules · applies to all questions" : "Question-specific · overrides quiz-wide for this question only"}</p>
            </div>
          </div>
          <button onClick={() => setPreviewOpen(true)} className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-card-hover">
            <Eye className="h-3.5 w-3.5" /> Preview Game Controls
          </button>
        </div>

        {/* Available Mechanics summary */}
        <div className="mt-4 rounded-xl border border-border bg-background px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Available Mechanics</p>
          {summary.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {summary.map((s) => (
                <span key={s} className="inline-flex items-center rounded-full bg-[#E91E63]/10 border border-[#E91E63]/20 px-2.5 py-1 text-xs font-medium text-[#E91E63]">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-text-muted">No mechanics enabled — enable cards below.</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] text-text-muted">
            <span className="whitespace-nowrap">Example:</span>
            <span className="whitespace-nowrap">DSA Championship</span><span className="opacity-60">·</span>
            <span className="whitespace-nowrap">20 Questions</span><span className="opacity-60">·</span>
            <span className="whitespace-nowrap">⏱ 15 min</span><span className="opacity-60">·</span>
            {summary.length > 0 ? (
              summary.map((s, i) => (
                <span key={s} className="contents">
                  <span className="whitespace-nowrap">{s}</span>
                  {i < summary.length - 1 && <span className="opacity-60">·</span>}
                </span>
              ))
            ) : (
              <span className="whitespace-nowrap">Enable powers below</span>
            )}
            <span className="opacity-60">·</span>
            <span className="whitespace-nowrap">🏆 Live Leaderboard</span>
          </div>
        </div>
      </div>

      {/* Lifelines */}
      <div className="p-4 sm:p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5" /> Lifelines</h4>
        <p className="mt-1 text-xs text-text-muted">Give students limited-use abilities during the assessment.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {lifelines.map((mid) => {
            const { available, reason } = isMechanicAvailable(mid, questionType, hasTimer);
            return <MechanicCard key={mid} id={mid} config={config} onChange={onChange} available={available} reason={reason} scopeLabel={scopeLabel} />;
          })}
        </div>

        {/* Power-Ups */}
        <h4 className="mt-6 text-xs font-semibold uppercase tracking-wider text-text-muted flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Power-Ups</h4>
        <p className="mt-1 text-xs text-text-muted">Competitive boosts — visually distinct from lifelines.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {powerUps.map((mid) => {
            const { available, reason } = isMechanicAvailable(mid, questionType, hasTimer);
            return <MechanicCard key={mid} id={mid} config={config} onChange={onChange} available={available} reason={reason} scopeLabel={scopeLabel} />;
          })}
        </div>

        {/* Usage Rules */}
        <div className="mt-5 rounded-2xl border border-border bg-card p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Settings2 className="h-4 w-4 text-text-muted" /> Usage Rules</h4>
          <label className="mt-3 flex items-center justify-between rounded-xl border border-border bg-background px-3 py-3">
            <div>
              <p className="text-sm font-medium text-text-primary">Shared across quiz</p>
              <p className="text-xs text-text-muted">{config.usageRules.sharedAcrossQuiz ? "Once used, remaining uses decrease for entire quiz." : "Usage resets for each question."}</p>
            </div>
            <SmallToggle
              enabled={config.usageRules.sharedAcrossQuiz}
              onToggle={() => onChange({ ...config, usageRules: { sharedAcrossQuiz: !config.usageRules.sharedAcrossQuiz } })}
            />
          </label>
          <p className="mt-2 text-[11px] text-text-muted">Default: Shared across quiz — competitive tension.</p>
        </div>

        <button onClick={() => setPreviewOpen(true)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E91E63] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D81B60] sm:hidden">
          <Eye className="h-4 w-4" /> Preview Game Controls
        </button>
      </div>

      {/* Student preview */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={() => setPreviewOpen(false)}>
            <motion.div initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-sm font-semibold text-text-primary">Student toolbar preview</p>
                <button onClick={() => setPreviewOpen(false)} className="rounded-lg border border-border bg-card p-1.5 text-text-muted hover:bg-card-hover">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    config.fiftyFifty.enabled && { label: "50:50", uses: config.fiftyFifty.uses, icon: Split, done: false },
                    config.eliminateOne.enabled && { label: "Eliminate 1", uses: config.eliminateOne.uses, icon: MinusCircle, done: false },
                    config.audiencePoll.enabled && { label: "Audience", uses: config.audiencePoll.uses, icon: Users, done: false },
                    config.hint.enabled && { label: "Hint", uses: config.hint.uses, icon: Lightbulb, done: false },
                    config.skip.enabled && { label: "Skip", uses: config.skip.uses, icon: SkipForward, done: false },
                    config.extraTime.enabled && { label: `+${config.extraTime.seconds}s`, uses: config.extraTime.uses, icon: Timer, done: false },
                    config.freezeTimer.enabled && { label: `Freeze ${config.freezeTimer.duration}s`, uses: config.freezeTimer.uses, icon: Snowflake, done: false },
                    config.doublePoints.enabled && { label: "2× Points", uses: config.doublePoints.uses, icon: Zap, done: false },
                  ]
                    .filter(Boolean)
                    .map((m: any) => {
                      const Icon = m.icon;
                      return (
                        <span key={m.label} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-text-primary shadow-sm">
                          <Icon className="h-3.5 w-3.5 text-[#E91E63]" />
                          {m.label} <span className="rounded-full bg-[#E91E63]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#E91E63]">×{m.uses === "unlimited" ? "∞" : m.uses}</span>
                        </span>
                      );
                    })}
                  {getEnabledMechanicsSummary(config).length === 0 && <p className="text-xs text-text-muted">No powers enabled — enable some above.</p>}
                </div>
                <p className="mt-3 text-center text-[11px] text-text-muted">When used: <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-white text-[11px]"><Check className="h-3 w-3" /> 50:50 ✓</span> Uses decrement. Configuration hidden from students.</p>
                <div className="mt-3 rounded-xl border border-dashed border-border bg-background p-3 text-center text-xs text-text-muted">
                  Example student view: DSA Championship · Q7 · <span className="font-medium text-text-primary">Lifelines remaining</span> shown as above. Skip jumps to navigator.
                </div>
              </div>
              <div className="flex justify-end border-t border-border bg-background px-4 py-3">
                <button onClick={() => setPreviewOpen(false)} className="rounded-xl bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white">Done</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
