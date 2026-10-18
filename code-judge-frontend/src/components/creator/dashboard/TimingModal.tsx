"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Clock, RotateCcw, Square } from "lucide-react";
import { cn } from "@/lib/helpers";
import { IST_TIMEZONE, formatDateTimeIST } from "@/lib/formatters";
import { useToast } from "@/hooks/useToast";
import { getQuizById, updateQuiz, updateQuizStatus } from "@/services/quiz";

export interface TimingTarget {
  id: string;
  title: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
}

const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]";
const BTN_PRI =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-60";

const EXTEND_PRESETS = [
  { label: "+15m", minutes: 15 },
  { label: "+30m", minutes: 30 },
  { label: "+1h", minutes: 60 },
];

const INPUT =
  "w-full rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2.5 text-[13px] font-semibold text-[var(--qs-ink)] outline-none transition-colors focus:border-[var(--qs-brand)] [color-scheme:light]";

/** "YYYY-MM-DDTHH:mm" now in IST wall-clock (backend stores naive IST). */
function nowInputValue(): string {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: IST_TIMEZONE })
    .replace(" ", "T")
    .slice(0, 16);
}

/**
 * Normalise a backend timestamp into a `datetime-local` value.
 * Naive IST strings are sliced; values with an offset/Z are converted to IST.
 */
function toInputValue(raw: string | null | undefined): string {
  if (!raw) return "";
  const naive = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  if (naive && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) return `${naive[1]}T${naive[2]}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date
    .toLocaleString("sv-SE", { timeZone: IST_TIMEZONE })
    .replace(" ", "T")
    .slice(0, 16);
}

/** Add minutes to a naive "YYYY-MM-DDTHH:mm" value without TZ drift. */
function addMinutes(value: string, minutes: number): string {
  const [datePart, timePart] = value.split("T");
  const [y, mo, d] = datePart.split("-").map(Number);
  const [h, mi] = timePart.split(":").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d, h, mi) + minutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}T${pad(
    next.getUTCHours()
  )}:${pad(next.getUTCMinutes())}`;
}

export function TimingModal({
  quiz,
  onClose,
  onSaved,
}: {
  quiz: TimingTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [start, setStart] = useState(() => toInputValue(quiz.startAt));
  const [end, setEnd] = useState(() => toInputValue(quiz.endAt));
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ending, setEnding] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLive = quiz.status.toLowerCase() === "live";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The dashboard list may not carry the current end time — always load the
  // quiz detail so saving can never silently clear an existing end time.
  useEffect(() => {
    let cancelled = false;
    getQuizById(quiz.id)
      .then((detail) => {
        if (cancelled) return;
        setStart(toInputValue(detail.starttime));
        setEnd(toInputValue(detail.endtime));
      })
      .catch(() => {
        if (cancelled) return;
        setError("Couldn't load the current timing — double-check both times before saving.");
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quiz.id]);

  const extendEnd = (minutes: number) => {
    setEnd((current) => addMinutes(current || nowInputValue(), minutes));
    setError(null);
  };

  const handleSave = async () => {
    if (loadingDetail) return;
    if (start && end && end <= start) {
      setError("End time must be after the start time.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateQuiz(quiz.id, {
        starttime: start || null,
        endtime: end || null,
      });
      toast.success({
        title: "Timing updated",
        description: end
          ? `“${quiz.title}” now closes ${formatDateTimeIST(`${end}:00+05:30`)}.`
          : `“${quiz.title}” will run until manually closed.`,
      });
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update the timing.";
      setError(message);
      toast.error({ title: "Update failed", description: message });
    } finally {
      setSaving(false);
    }
  };

  const handleEndNow = async () => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      return;
    }
    setEnding(true);
    setError(null);
    try {
      await updateQuizStatus(quiz.id, "ended");
      toast.success({ title: "Quiz ended", description: `“${quiz.title}” is closed now.` });
      onSaved();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not end the quiz.";
      setError(message);
      toast.error({ title: "Could not end quiz", description: message });
      setConfirmEnd(false);
    } finally {
      setEnding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#1A1240]/60 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Change timing for ${quiz.title}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] shadow-[6px_6px_0_var(--qs-sun)]"
      >
        <div className="px-6 pb-6 pt-6">
          <div className="flex items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240] shadow-[3px_3px_0_var(--qs-brand)]">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="qs-display text-[19px] font-extrabold text-[var(--qs-ink)]">Change timing</h3>
              <p className="mt-0.5 truncate text-[13px] text-[var(--qs-muted)]" title={quiz.title}>
                {quiz.title}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
                Starts
              </span>
              <input
                type="datetime-local"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setError(null);
                }}
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.11em] text-[var(--qs-muted)]">
                Ends
                {end && (
                  <button
                    type="button"
                    onClick={() => setEnd("")}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--qs-line)] px-2 py-[2px] text-[9px] font-bold normal-case tracking-normal text-[var(--qs-muted)] transition-colors hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
                  >
                    <RotateCcw className="h-3 w-3" />
                    No end time
                  </button>
                )}
              </span>
              <input
                type="datetime-local"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setError(null);
                }}
                className={INPUT}
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--qs-muted)]">
              <Clock className="h-3.5 w-3.5" />
              Extend end:
            </span>
            {EXTEND_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => extendEnd(preset.minutes)}
                className="rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-1 text-[11px] font-extrabold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)]"
              >
                {preset.label}
              </button>
            ))}
            <span className="ml-auto text-[11px] font-semibold text-[var(--qs-muted)]">IST (Asia/Kolkata)</span>
          </div>

          {!end && (
            <p className="mt-3 rounded-2xl border-2 border-dashed border-[var(--qs-line)] px-3.5 py-2.5 text-[12px] leading-5 text-[var(--qs-muted)]">
              {isLive
                ? "Without an end time the quiz keeps running until you close it."
                : "Students cannot attempt the quiz after the end time."}
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-2xl border-2 border-[var(--qs-bad)] bg-[var(--qs-bad)]/10 px-3.5 py-2.5 text-[12px] font-semibold leading-5 text-[var(--qs-bad)]">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t-2 border-[var(--qs-line)] bg-[var(--qs-bg)] px-6 py-4">
          {isLive ? (
            <button
              type="button"
              onClick={handleEndNow}
              disabled={ending || saving}
              className={cn(
                "inline-flex items-center gap-2 rounded-[12px] border-2 px-4 py-2.5 text-[13px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                confirmEnd
                  ? "border-[var(--qs-ink)] bg-[var(--qs-bad)] text-white hover:brightness-110"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-bad)] hover:border-[var(--qs-bad)]"
              )}
            >
              <Square className="h-3.5 w-3.5" />
              {ending ? "Ending…" : confirmEnd ? "Confirm end" : "End now"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={onClose} className={BTN}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || ending || loadingDetail}
              className={BTN_PRI}
            >
              {loadingDetail ? "Loading…" : saving ? "Saving…" : "Save timing"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
