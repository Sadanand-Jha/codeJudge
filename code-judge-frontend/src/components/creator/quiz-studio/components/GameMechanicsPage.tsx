"use client";

import { useState, useMemo } from "react";
import { Gamepad2, Eye, Trophy, Timer, ShieldCheck, Users, Save, Check } from "lucide-react";
import { useStudio } from "../StudioProvider";
import { GameMechanicsPanel } from "./GameMechanicsPanel";
import { getEnabledMechanicsSummary, isMechanicAvailable } from "../types/gameMechanics";
import { cn } from "@/lib/helpers";

export function GameMechanicsPage() {
  const { state, updateGameMechanics, saveToServer, savingToServer } = useStudio();
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const hasTimer = (state.info.duration ?? 0) > 0;
  const summary = getEnabledMechanicsSummary(state.gameMechanics);

  const lifelineCount = [
    state.gameMechanics.fiftyFifty.enabled,
    state.gameMechanics.audiencePoll.enabled,
    state.gameMechanics.hint.enabled,
    state.gameMechanics.skip.enabled,
    state.gameMechanics.extraTime.enabled,
    state.gameMechanics.eliminateOne.enabled,
  ].filter(Boolean).length;
  const powerUpCount = [
    state.gameMechanics.doublePoints.enabled,
    state.gameMechanics.freezeTimer.enabled,
    (state.gameMechanics as any).streakBonus?.enabled,
    (state.gameMechanics as any).speedBonus?.enabled,
    (state.gameMechanics as any).secondChance?.enabled,
    (state.gameMechanics as any).decayingPoints?.enabled,
  ].filter(Boolean).length;

  const questionTypes = useMemo(() => {
    const map = new Map<string, number>();
    state.questions.forEach((q) => map.set(q.type, (map.get(q.type) ?? 0) + 1));
    return Array.from(map.entries());
  }, [state.questions]);

  const hasMCQ = state.questions.some((q) => q.type === "single_choice" || q.type === "multiple_choice");
  const hasMatchOnly = state.questions.length > 0 && state.questions.every((q) => q.type === "match_following");

  // applicability hints
  const applicabilityNotes = useMemo(() => {
    const notes: string[] = [];
    if (!hasMCQ && state.gameMechanics.fiftyFifty.enabled) notes.push("50:50 requires multiple-choice questions and will only be available on applicable questions.");
    if (hasMatchOnly && state.gameMechanics.fiftyFifty.enabled) notes.push("Current quiz contains only Match the Following — 50:50 will be disabled at runtime.");
    if (!hasTimer && (state.gameMechanics.extraTime.enabled || state.gameMechanics.freezeTimer.enabled)) notes.push("Extra Time / Freeze Time require a timed assessment (quiz duration > 0).");
    if (!hasTimer && (state.gameMechanics as any).decayingPoints?.enabled) notes.push("Decaying Points requires a timed assessment (quiz duration > 0) to function.");
    return notes;
  }, [hasMCQ, hasMatchOnly, hasTimer, state.gameMechanics]);

  const handleSave = async () => {
    if (saving || savingToServer) return;
    setSaving(true);
    setSaveStatus("saving");
    try {
      await saveToServer();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    } finally {
      setSaving(false);
    }
  };

  const isPublished = state.published;
  const quizName = state.info.title || "Untitled Quiz";

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3 min-w-0">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E91E63] text-white shadow-[0_4px_12px_rgba(233,30,99,0.25)]">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                Game Mechanics
                <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", isPublished ? "bg-emerald-500 text-white border-emerald-500" : "bg-amber-500 text-white border-amber-500")}>
                  {isPublished ? "Published" : "Draft"}
                </span>
              </h1>
              <p className="mt-1 text-sm text-text-muted">Configure the interactive game rules and power-ups available to students during this assessment.</p>
              <p className="mt-1 text-xs font-medium text-text-secondary truncate">{quizName} · {state.questions.length} questions · {state.info.duration} min</p>
              {applicabilityNotes.length > 0 && (
                <div className="mt-2 space-y-1">
                  {applicabilityNotes.map((n, i) => (
                    <p key={i} className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg px-2.5 py-1.5">
                      {n}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-text-muted">
              {saveStatus === "saving" ? (
                <><span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" /> Saving...</>
              ) : saveStatus === "saved" ? (
                <><Check className="h-3.5 w-3.5 text-emerald-500" /> Saved</>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Auto-save</>
              )}
            </span>
            <button
              onClick={handleSave}
              disabled={saving || savingToServer}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D81B60] disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main mechanics */}
        <div className="space-y-6">
          <GameMechanicsPanel
            config={state.gameMechanics}
            onChange={(next) => updateGameMechanics(next)}
            scope="quiz"
            questionType="quiz"
            hasTimer={hasTimer}
          />

          {/* Question-type awareness footer */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Question-type awareness</h4>
            <p className="mt-1 text-xs text-text-muted">
              {state.questions.length === 0
                ? "Add questions to see which mechanics will be applicable at runtime."
                : `${questionTypes.map(([t, c]) => `${t} ×${c}`).join(" · ")} · Timed: ${hasTimer ? "yes" : "no"}`}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {[
                "fiftyFifty",
                "audiencePoll",
                "eliminateOne",
                "extraTime",
                "freezeTimer",
              ].map((mid) => {
                const anyAvailable = state.questions.some((q) => isMechanicAvailable(mid as any, q.type, hasTimer).available);
                const quizAvailable = isMechanicAvailable(mid as any, "quiz" as any, hasTimer).available;
                const available = state.questions.length === 0 ? quizAvailable : anyAvailable;
                return (
                  <div key={mid} className={cn("rounded-lg border px-2.5 py-2", available ? "border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10" : "border-amber-500/20 bg-amber-50 dark:bg-amber-500/10")}>
                    <p className="font-medium text-text-primary">{mid}</p>
                    <p className="text-[11px] text-text-muted">{available ? "Available on some questions" : "Not applicable to current quiz types"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Game Rules Summary — right rail */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border bg-background sticky top-4">
            <div className="bg-card px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" /> Game Rules
              </h3>
              <p className="text-xs text-text-muted">Immediate overview without opening every setting.</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="text-sm text-text-primary flex items-center gap-1.5"><Gamepad2 className="h-4 w-4 text-[#E91E63]" /> Lifelines enabled</span>
                <span className="text-sm font-bold text-[#E91E63]">{lifelineCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="text-sm text-text-primary flex items-center gap-1.5"><Trophy className="h-4 w-4 text-amber-500" /> Power-Ups enabled</span>
                <span className="text-sm font-bold text-amber-600">{powerUpCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="text-sm text-text-primary flex items-center gap-1.5"><Timer className="h-4 w-4 text-text-muted" /> Timed assessment</span>
                <span className={cn("text-xs font-bold rounded-full px-2 py-0.5", hasTimer ? "bg-emerald-500 text-white" : "bg-card border border-border text-text-muted")}>{hasTimer ? `${state.info.duration} min` : "Off"}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="text-sm text-text-primary flex items-center gap-1.5"><Users className="h-4 w-4 text-text-muted" /> Leaderboard</span>
                <span className="text-xs text-text-muted">Enabled</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                <span className="text-sm text-text-primary flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-text-muted" /> Secure Exam</span>
                <span className="text-xs text-text-muted">—</span>
              </div>

              {summary.length > 0 ? (
                <div className="rounded-xl bg-[#E91E63]/[0.06] border border-[#E91E63]/20 p-3">
                  <p className="text-xs font-semibold text-[#E91E63]">Active powers</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {summary.map((s) => (
                      <span key={s} className="rounded-full bg-white dark:bg-card border border-[#E91E63]/20 px-2 py-0.5 text-[11px] font-medium text-[#E91E63]">{s}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted text-center py-2">No powers enabled yet.</p>
              )}

              <div className="rounded-xl border border-dashed border-border bg-card p-3">
                <p className="text-xs font-medium text-text-primary">Example</p>
                <p className="mt-1 text-xs text-text-muted">DSA Championship · 20 Questions · ⏱ 15 min · 50:50 ×2 · Audience ×1 · Hint ×3 · Skip ×1 · 2× Points ×1</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Data & persistence</h4>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              Single source of truth: <code className="rounded bg-background border border-border px-1 py-0.5 text-[11px]">quiz.gameMechanics</code>. Question builder reads quiz-level config but does not own it. Auto-saves via existing Studio save. Refresh preserves data. Switching Questions ↔ Game Mechanics preserves state.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
