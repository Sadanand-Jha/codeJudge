"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Clock3,
  Coins,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { getApiErrorMessage } from "@/lib/apiError";
import { formatTrialEnd } from "@/hooks/useMySubscription";
import { useTrialStatus } from "@/hooks/useTrialStatus";
import { useToast } from "@/hooks/useToast";

const BTN_PRI =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-ink)] bg-[var(--qs-brand)] px-4 py-2.5 text-[13px] font-extrabold text-[var(--qs-on-brand)] shadow-[3px_3px_0_var(--qs-sun)] transition-all hover:brightness-110 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_var(--qs-sun)] disabled:cursor-not-allowed disabled:opacity-60";
const BTN =
  "inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-4 py-2.5 text-[13px] font-bold text-[var(--qs-ink)] transition-colors hover:border-[var(--qs-brand)] disabled:opacity-60";
const PILL =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-current px-2.5 py-[3px] text-[10px] font-black uppercase tracking-[0.08em]";

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id="trial-request"
      aria-label="Basic free trial"
      className={cn(
        "rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-5 shadow-[5px_5px_0_var(--qs-sun)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export function TrialRequestPanel() {
  const toast = useToast();
  const { status, isLoading, error, refresh, submitRequest } = useTrialStatus();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (isLoading && !status) {
    return (
      <Card className="shadow-none">
        <div className="flex items-center gap-2 text-[13px] font-bold text-[var(--qs-muted)]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Checking trial eligibility…
        </div>
      </Card>
    );
  }

  if (error && !status) {
    return (
      <Card className="shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] font-bold text-[var(--qs-bad)]">{error}</p>
          <button type="button" onClick={() => void refresh()} className={BTN}>
            Try again
          </button>
        </div>
      </Card>
    );
  }

  if (!status || status.reason === "active_plan") return null;

  const planName = status.plan?.name ?? "Basic";
  const trialDays = status.plan?.trialDays ?? 7;
  const credits = status.plan?.credits ?? 20;
  const latest = status.latestRequest;
  const requestedOn = latest ? formatTrialEnd(latest.requestedAt) : null;
  const reviewNote = latest?.reviewNote;

  if (status.reason === "active_trial") {
    const endsOn = formatTrialEnd(status.activeTrialEndsAt ?? latest?.trialEndsAt ?? null);
    return (
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-ok)] text-white">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <div className="min-w-0">
              <span className={cn(PILL, "text-[var(--qs-ok)]")}>Trial active</span>
              <h2 className="mt-1.5 text-[18px] font-extrabold text-[var(--qs-ink)]">
                {planName} trial is active
              </h2>
              <p className="mt-1 text-[13px] text-[var(--qs-muted)]">
                Full {planName} features and {credits} AI credits
                {endsOn ? ` · ends ${endsOn}` : ""}.
              </p>
            </div>
          </div>
          <Link href="/creator/billing/plans" className={BTN}>
            Compare plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>
    );
  }

  if (status.reason === "pending") {
    return (
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-brand)]">
              <Clock3 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <span className={cn(PILL, "text-[#a85d00]")}>Pending review</span>
              <h2 className="mt-1.5 text-[18px] font-extrabold text-[var(--qs-ink)]">
                Your {planName} trial request is in review
              </h2>
              <p className="mt-1 text-[13px] text-[var(--qs-muted)]">
                Requested{requestedOn ? ` on ${requestedOn}` : ""}. An owner will approve or reject it shortly.
              </p>
              {latest?.requestNote && (
                <p className="mt-2 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[12px] text-[var(--qs-muted)]">
                  “{latest.requestNote}”
                </p>
              )}
            </div>
          </div>
          <button type="button" onClick={() => void refresh()} className={BTN} disabled={isLoading}>
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Check status
          </button>
        </div>
      </Card>
    );
  }

  if (status.reason === "trial_used") {
    return (
      <Card className="border-[var(--qs-line)] shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-line)] bg-[var(--qs-bg)] text-[var(--qs-muted)]">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <span className={cn(PILL, "text-[var(--qs-muted)]")}>Trial used</span>
              <h2 className="mt-1.5 text-[18px] font-extrabold text-[var(--qs-ink)]">
                The free trial has already been used
              </h2>
              <p className="mt-1 text-[13px] text-[var(--qs-muted)]">
                Choose a monthly plan to get full features and AI credits.
              </p>
              {reviewNote && (
                <p className="mt-2 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[12px] text-[var(--qs-muted)]">
                  Review note: {reviewNote}
                </p>
              )}
            </div>
          </div>
          <Link href="/creator/billing/plans" className={BTN_PRI}>
            View plans
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>
    );
  }

  if (status.reason === "unavailable") {
    return (
      <Card className="border-[var(--qs-line)] shadow-none">
        <p className="text-[13px] font-bold text-[var(--qs-muted)]">
          The free trial is not available right now. Please check back later.
        </p>
      </Card>
    );
  }

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setSubmitError(null);
    try {
      await submitRequest(note);
      setNote("");
      toast.success({
        title: "Trial request submitted",
        description: "An owner will review your request shortly.",
      });
    } catch (requestError) {
      setSubmitError(
        getApiErrorMessage(requestError, "Could not submit the trial request. Please try again.")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[var(--qs-ink)] bg-[var(--qs-sun)] text-[#1A1240]">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <span className={cn(PILL, "text-[var(--qs-brand)]")}>Free trial</span>
            <h2 className="mt-1.5 text-[20px] font-extrabold text-[var(--qs-ink)]">
              Try {planName} free for {trialDays} days
            </h2>
            <p className="mt-1 max-w-xl text-[13px] leading-6 text-[var(--qs-muted)]">
              Get full {planName} features with {credits} AI credits for {trialDays} days.
              No card required — an owner reviews every request before the trial starts.
            </p>
            {reviewNote && latest?.status === "rejected" && (
              <p className="mt-2 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[12px] text-[var(--qs-muted)]">
                Previous request note: {reviewNote}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] font-bold text-[var(--qs-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
            Full {planName} features
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Coins className="h-3.5 w-3.5 text-[var(--qs-brand)]" />
            {credits} AI credits
          </span>
        </div>
      </div>

      <div className="mt-4 border-t-2 border-[var(--qs-line)] pt-4">
        <label
          htmlFor="trial-request-note"
          className="mb-1 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]"
        >
          What will you use the trial for? (optional)
        </label>
        <textarea
          id="trial-request-note"
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 500))}
          rows={2}
          placeholder="A short note helps the owner review your request faster."
          className="w-full resize-none rounded-[10px] border-2 border-[var(--qs-line)] bg-[var(--qs-surface)] px-3 py-2 text-[13px] font-medium text-[var(--qs-ink)] outline-none placeholder:text-[var(--qs-muted)]/70 focus:border-[var(--qs-brand)]"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-[var(--qs-muted)]">
            {note.length}/500 · One trial per account
          </span>
          <button type="button" onClick={() => void submit()} disabled={busy} className={BTN_PRI}>
            {busy ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {busy ? "Submitting…" : "Request free trial"}
          </button>
        </div>
        {submitError && (
          <p className="mt-2 text-[12px] font-bold text-[var(--qs-bad)]">{submitError}</p>
        )}
      </div>
    </Card>
  );
}
