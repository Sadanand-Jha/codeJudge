"use client";

import { useMemo } from "react";
import { Gamepad2, Eye, Trophy, Timer, ShieldCheck, Users } from "lucide-react";
import { useStudio } from "../StudioProvider";
import { GameMechanicsPanel } from "./GameMechanicsPanel";
import { getEnabledMechanicsSummary, isMechanicAvailable, MECHANIC_META, type MechanicId } from "../types/gameMechanics";
import { cn } from "@/lib/helpers";
import type { CreatorQuestionType } from "../types";
import { Badge, StudioStepHeader, StudioStepLayout } from "../primitives";

export function GameMechanicsPage() {
  const { state, updateGameMechanics } = useStudio();

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

  return (
    <StudioStepLayout width="wide">
      <StudioStepHeader
        title="Game Mechanics"
        actions={<Badge color={state.published ? "success" : "warning"}>{state.published ? "Published" : "Draft"}</Badge>}
      />

      {applicabilityNotes.length > 0 && (
        <div className="space-y-2">
          {applicabilityNotes.map((note) => (
            <p key={note} className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              {note}
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1fr_320px]">
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

          {/* Per-question-type mechanics preview */}
          {state.questions.length > 0 && (() => {
            const lifelines: MechanicId[] = ["fiftyFifty", "audiencePoll", "hint", "skip", "extraTime", "eliminateOne"];
            const powerUps: MechanicId[] = ["doublePoints", "freezeTimer", "streakBonus", "speedBonus", "secondChance", "decayingPoints"];
            const allMechanics = [...lifelines, ...powerUps];
            const enabledMechanics = allMechanics.filter((mid) => (state.gameMechanics as any)[mid]?.enabled);
            const qTypes = useMemo(() => {
              const map = new Map<CreatorQuestionType, number>();
              state.questions.forEach((q) => map.set(q.type, (map.get(q.type) ?? 0) + 1));
              return Array.from(map.entries());
            }, [state.questions]);

            const TYPE_LABEL: Record<string, string> = {
              single_choice: "MCQ",
              multiple_choice: "Multi",
              true_false: "True/False",
              match_following: "Match the Following",
              fill_blanks: "Fill Blanks",
              text: "Text",
              integer: "Integer",
              paragraph: "Paragraph",
              code_output: "Code Output",
            };

            return (
              <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="h-4 w-4 text-[#E91E63]" />
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Per-Question Mechanics Preview</h4>
                </div>
                <p className="text-xs text-text-muted mb-4">How each enabled mechanic applies to your question types at runtime.</p>

                <div className="space-y-3">
                  {qTypes.map(([qType, count]) => (
                    <div key={qType} className="rounded-xl border border-border overflow-hidden">
                      <div className="flex items-center justify-between bg-background px-3 py-2.5 border-b border-border">
                        <span className="text-sm font-semibold text-text-primary">{TYPE_LABEL[qType] ?? qType} <span className="text-text-muted font-normal">×{count}</span></span>
                      </div>
                      {enabledMechanics.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-text-muted">No mechanics enabled.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 p-2.5">
                          {enabledMechanics.map((mid) => {
                            const result = isMechanicAvailable(mid, qType, hasTimer);
                            return (
                              <div
                                key={mid}
                                className={cn(
                                  "rounded-lg border px-2 py-1.5 text-center",
                                  result.available
                                    ? "border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10"
                                    : "border-red-500/20 bg-red-50 dark:bg-red-500/10"
                                )}
                              >
                                <p className={cn("text-[11px] font-semibold", result.available ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                                  {MECHANIC_META[mid]?.short ?? mid}
                                </p>
                                <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
                                  {result.available ? "Active" : (result.reason?.split("(")[0]?.trim() ?? "N/A")}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Game Rules Summary — right rail */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <div className="bg-card px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-amber-500" /> Game Rules
              </h3>
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

            </div>
          </div>
        </div>
      </div>
    </StudioStepLayout>
  );
}
