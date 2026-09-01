"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Loader2, Save, AlertCircle, Check } from "lucide-react";
import { useQuizGameConfig } from "@/hooks/useQuizGameConfig";
import type { QuizGameConfig } from "@/services/quiz";
import { cn } from "@/lib/helpers";

function Toggle({ enabled, onToggle, disabled }: { enabled: boolean; onToggle: () => void; disabled?: boolean }) {
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

export function QuizGameConfigPanel({ quizId }: { quizId: string | number }) {
  const { draft, loading, saving, error, saveError, setDraft, save } = useQuizGameConfig(quizId);
  const [localError, setLocalError] = useState<string | null>(null);
  const [savedTick, setSavedTick] = useState(false);

  // Show loading before config fetched — do not allow game to start with stale/default if pending
  if (loading && !draft) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#E91E63]" />
        <p className="text-sm text-text-muted">Loading game configuration…</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4">
        <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Unable to load game configuration. Please try again.
        </p>
      </div>
    );
  }

  const patch = (p: Partial<QuizGameConfig>) => {
    setDraft({ ...draft, ...p });
  };

  const handleSave = async () => {
    setLocalError(null);
    if (draft.movementSpeed <= 0) {
      setLocalError("Movement speed must be greater than 0.");
      return;
    }
    if (draft.lives < 0) {
      setLocalError("Lives cannot be negative.");
      return;
    }
    try {
      await save(draft);
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2000);
    } catch (e: any) {
      // saveError is set by hook; also keep localError for validation
      setLocalError(e.message);
    }
  };

  const hasError = !!error || !!saveError || !!localError;

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="border-b border-border bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E91E63] text-white shadow-[0_4px_12px_rgba(233,30,99,0.25)]">
            <Gamepad2 className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Top-Down Game Configuration</h3>
            <p className="text-xs text-text-muted">Configure movement, speed, lives and other gameplay options for this quiz.</p>
          </div>
          <span className="ml-auto hidden sm:inline-flex items-center gap-2">
            {loading ? (
              <span className="flex items-center gap-1.5 text-xs text-text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</span>
            ) : savedTick ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Check className="h-3.5 w-3.5" /> Saved</span>
            ) : null}
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white hover:bg-[#D81B60] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} {saving ? "Saving…" : "Save"}
            </button>
          </span>
        </div>
        {error && (
          <p className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {(localError || saveError) && (
          <div className="rounded-xl border border-red-500/20 bg-red-50 dark:bg-red-500/10 px-3 py-2.5 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {localError || saveError}
          </div>
        )}

        {/* Enabled */}
        <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
          <div>
            <p className="text-sm font-medium text-text-primary">Game Enabled</p>
            <p className="text-xs text-text-muted">If off, Top-Down campus is hidden.</p>
          </div>
          <Toggle enabled={draft.enabled} onToggle={() => patch({ enabled: !draft.enabled })} disabled={saving} />
        </label>

        {/* Movement */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Movement</p>
              <p className="text-xs text-text-muted">Allow player to walk (WASD / arrows / joystick)</p>
            </div>
            <Toggle enabled={draft.movementEnabled} onToggle={() => patch({ movementEnabled: !draft.movementEnabled })} disabled={saving} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-text-secondary">Movement Speed</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={20}
                value={draft.movementSpeed}
                onChange={(e) => patch({ movementSpeed: Math.max(1, Number(e.target.value) || 1) })}
                disabled={saving || !draft.movementEnabled}
                className="h-8 w-20 rounded-lg border border-border bg-background px-3 text-sm text-center focus:outline-none focus:border-[#E91E63]/40 disabled:opacity-40"
              />
              <span className="text-xs text-text-muted"> (1–20, default 5)</span>
            </div>
          </div>
          <p className="text-[11px] text-text-muted">When movement is off, players stay in place.</p>
        </div>

        {/* Lives / Points / Powerups */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card px-3 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-text-secondary">Lives</span>
              <input
                type="number"
                min={0}
                max={99}
                value={draft.lives}
                onChange={(e) => patch({ lives: Math.max(0, Number(e.target.value) || 0) })}
                disabled={saving}
                className="h-8 w-20 rounded-lg border border-border bg-background px-2 text-sm text-center focus:outline-none focus:border-[#E91E63]/40"
              />
            </div>
            <p className="text-[11px] text-text-muted">Displayed as hearts. 0 = no lives system.</p>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
            <span className="text-sm font-medium text-text-primary">Points</span>
            <Toggle enabled={draft.pointsEnabled} onToggle={() => patch({ pointsEnabled: !draft.pointsEnabled })} disabled={saving} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
            <span className="text-sm font-medium text-text-primary">Power-ups</span>
            <Toggle enabled={draft.powerupsEnabled} onToggle={() => patch({ powerupsEnabled: !draft.powerupsEnabled })} disabled={saving} />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
            <span className="text-sm font-medium text-text-primary">Respawn</span>
            <Toggle enabled={draft.respawnEnabled} onToggle={() => patch({ respawnEnabled: !draft.respawnEnabled })} disabled={saving} />
          </label>
        </div>
        <label className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-3">
          <span className="text-sm font-medium text-text-primary">Damage Enabled</span>
          <Toggle enabled={draft.damageEnabled} onToggle={() => patch({ damageEnabled: !draft.damageEnabled })} disabled={saving} />
        </label>

        <div className="sm:hidden">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#E91E63] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#D81B60] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving…" : "Save configuration"}
          </button>
          {savedTick && <p className="mt-2 text-center text-xs text-emerald-600 flex items-center justify-center gap-1"><Check className="h-3.5 w-3.5" /> Saved</p>}
        </div>

        <p className="text-[11px] text-text-muted">Changes are saved after you click Save. You’ll see a confirmation once it’s done.</p>
      </div>
    </div>
  );
}
