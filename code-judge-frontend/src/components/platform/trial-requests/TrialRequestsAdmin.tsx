"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, Search, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/helpers";
import { getApiErrorMessage } from "@/lib/apiError";
import { useToast } from "@/hooks/useToast";
import {
  platformApi,
  type PlatformTrialRequest,
  type PlatformTrialRequestSummary,
  type PlatformTrialRequestStatus,
} from "@/services/platform";
import { BTN, BTN_PRI, INPUT } from "@/components/platform/pricing/admin-ui";
import { EmptyState, ErrorState, Skeleton } from "@/components/platform/ui";
import { MiniStat } from "@/components/platform/subpage-blocks";

type Filter = "pending" | "approved" | "rejected" | "all";
type ReviewAction = "approve" | "reject";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const EMPTY_SUMMARY: PlatformTrialRequestSummary = {
  pending: 0,
  approved: 0,
  rejected: 0,
};

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: PlatformTrialRequestStatus }) {
  const tone =
    status === "pending"
      ? "border-amber-300 bg-amber-50 text-amber-700"
      : status === "approved"
        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
        : status === "rejected"
          ? "border-red-200 bg-red-50 text-red-600"
          : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)]";
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em]", tone)}>
      {status}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2" aria-label="Loading trial requests">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-12 rounded-[10px]" />
      ))}
    </div>
  );
}

export function TrialRequestsAdmin() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [requests, setRequests] = useState<PlatformTrialRequest[]>([]);
  const [summary, setSummary] = useState<PlatformTrialRequestSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<PlatformTrialRequest | null>(null);
  const [reviewAction, setReviewAction] = useState<ReviewAction | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await platformApi.trialRequests({
        status: filter === "all" ? undefined : filter,
        search: appliedSearch,
      });
      setRequests(data.requests);
      setSummary(data.summary);
      setError(null);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError, "Could not load trial requests."));
    } finally {
      setLoading(false);
    }
  }, [filter, appliedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial request load
    void load();
  }, [load]);

  const openReview = (request: PlatformTrialRequest, action: ReviewAction) => {
    setSelected(request);
    setReviewAction(action);
    setNote(request.reviewNote ?? "");
  };

  const closeReview = () => {
    if (busy) return;
    setSelected(null);
    setReviewAction(null);
    setNote("");
  };

  const submitReview = async () => {
    if (!selected || !reviewAction || busy) return;
    setBusy(true);
    try {
      if (reviewAction === "approve") {
        const result = await platformApi.approveTrialRequest(selected.id, note);
        toast.success({
          title: "Trial approved",
          description: `@${selected.username} received Basic for 7 days with ${result.creditsGranted} AI credits.`,
        });
      } else {
        await platformApi.rejectTrialRequest(selected.id, note);
        toast.success({
          title: "Trial request rejected",
          description: `@${selected.username} can submit a new request later.`,
        });
      }
      setSelected(null);
      setReviewAction(null);
      setNote("");
      await load();
    } catch (reviewError) {
      toast.error({
        title: "Could not review the request",
        description: getApiErrorMessage(reviewError, "Please try again."),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniStat label="Pending" value={String(summary.pending)} sub="Awaiting owner review" />
        <MiniStat label="Approved" value={String(summary.approved)} sub="Basic trials granted" />
        <MiniStat label="Rejected" value={String(summary.rejected)} sub="Trial requests declined" />
      </div>

      <section className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 sm:p-5">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedSearch(search);
          }}
        >
          <div className="min-w-[220px] flex-1">
            <label htmlFor="trial-request-search" className="mb-1 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
              Search users
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--qs-muted)]" />
              <input
                id="trial-request-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Username or email"
                className={cn(INPUT, "pl-9")}
              />
            </div>
          </div>
          <button type="submit" className={BTN}>
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
          <button
            type="button"
            className={BTN}
            onClick={() => {
              setSearch("");
              setAppliedSearch("");
              void load();
            }}
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={cn(
                "rounded-full border-2 px-3 py-1.5 text-[11px] font-extrabold transition-colors",
                filter === item.value
                  ? "border-[var(--qs-ink)] bg-[var(--qs-ink)] text-[var(--qs-bg)]"
                  : "border-[var(--qs-line)] bg-[var(--qs-surface)] text-[var(--qs-muted)] hover:border-[var(--qs-brand)] hover:text-[var(--qs-ink)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {selected && reviewAction && (
        <section className="rounded-[22px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)] p-4 shadow-[4px_4px_0_var(--qs-sun)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className={cn(
                "grid h-10 w-10 shrink-0 place-items-center rounded-full border-2",
                reviewAction === "approve"
                  ? "border-[var(--qs-ok)] bg-emerald-50 text-[var(--qs-ok)]"
                  : "border-red-200 bg-red-50 text-red-600"
              )}>
                {reviewAction === "approve" ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="text-[16px] font-extrabold text-[var(--qs-ink)]">
                  {reviewAction === "approve" ? "Approve" : "Reject"} trial request
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--qs-muted)]">
                  @{selected.username} · {selected.email} · requested {formatDateTime(selected.requestedAt)}
                </p>
              </div>
            </div>
            <button type="button" className={BTN} onClick={closeReview} disabled={busy}>
              Cancel
            </button>
          </div>

          <label htmlFor="trial-review-note" className="mb-1 mt-4 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
            Review note {reviewAction === "reject" ? "(recommended)" : "(optional)"}
          </label>
          <textarea
            id="trial-review-note"
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 500))}
            rows={2}
            placeholder={
              reviewAction === "approve"
                ? "Optional note shown to the user."
                : "Tell the user why the trial request was declined."
            }
            className={cn(INPUT, "resize-none")}
          />

          {selected.requestNote && (
            <p className="mt-2 rounded-[10px] border border-[var(--qs-line)] bg-[var(--qs-bg)] px-3 py-2 text-[12px] text-[var(--qs-muted)]">
              User note: {selected.requestNote}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-semibold text-[var(--qs-muted)]">
              {reviewAction === "approve"
                ? `Starts the ${selected.planName} trial for 7 days and grants 20 AI credits.`
                : "The user can submit another request after rejection."}
            </span>
            <button
              type="button"
              className={reviewAction === "approve" ? BTN_PRI : "inline-flex items-center justify-center gap-2 rounded-[10px] border-2 border-red-300 bg-red-50 px-3 py-2 text-[12px] font-extrabold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"}
              onClick={() => void submitReview()}
              disabled={busy}
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : reviewAction === "approve" ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
              {busy ? "Saving…" : reviewAction === "approve" ? "Approve and start trial" : "Reject request"}
            </button>
          </div>
        </section>
      )}

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading ? (
        <TableSkeleton />
      ) : requests.length === 0 ? (
        <EmptyState
          message="No trial requests"
          detail={
            filter === "pending"
              ? "Pending requests will appear here for review."
              : "No requests match the selected filter."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-[18px] border-2 border-[var(--qs-ink)] bg-[var(--qs-surface)]">
          <table className="w-full min-w-[880px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b-2 border-[var(--qs-ink)] text-left">
                {["User", "Plan", "Requested", "Trial window", "Credits", "Status", "Actions"].map((heading) => (
                  <th key={heading} className="px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--qs-muted)]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-[var(--qs-line)] align-top last:border-0 hover:bg-[var(--qs-bg)]">
                  <td className="px-3 py-3">
                    <p className="font-extrabold text-[var(--qs-ink)]">@{request.username}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--qs-muted)]">{request.email}</p>
                    {request.requestNote && (
                      <p className="mt-1 max-w-[260px] whitespace-normal text-[11px] leading-5 text-[var(--qs-muted)]">
                        “{request.requestNote}”
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 font-bold text-[var(--qs-ink)]">
                    {request.planName}
                    <p className="mt-0.5 text-[11px] font-medium text-[var(--qs-muted)]">{request.planSlug}</p>
                  </td>
                  <td className="px-3 py-3 text-[var(--qs-muted)]">{formatDateTime(request.requestedAt)}</td>
                  <td className="px-3 py-3 text-[var(--qs-muted)]">
                    {request.trialStartedAt
                      ? `${formatDate(request.trialStartedAt)} – ${formatDate(request.trialEndsAt)}`
                      : "Not started"}
                  </td>
                  <td className="px-3 py-3 font-bold tabular-nums text-[var(--qs-ink)]">
                    {request.creditsGranted > 0 ? request.creditsGranted : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={request.status} />
                    {request.reviewedAt && (
                      <p className="mt-1 text-[10px] text-[var(--qs-muted)]">
                        {formatDateTime(request.reviewedAt)}
                        {request.reviewerEmail ? ` · ${request.reviewerEmail}` : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {request.status === "pending" ? (
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" className={BTN_PRI} onClick={() => openReview(request, "approve")}>
                          <Check className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border-2 border-red-200 bg-red-50 px-3 py-2 text-[12px] font-extrabold text-red-600 transition-colors hover:bg-red-100"
                          onClick={() => openReview(request, "reject")}
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--qs-muted)]">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Reviewed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t-2 border-[var(--qs-line)] px-3 py-2 text-[11px] text-[var(--qs-muted)]">
            Showing {requests.length} request{requests.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </div>
  );
}
