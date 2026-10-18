"use client";

import { useState } from "react";
import { platformApi } from "@/services/platform";
import { SectionCard, SectionSkeleton, EmptyState, ErrorState, timeAgo } from "@/components/platform/ui";
import { useAsync } from "@/components/platform/usePlatformAsync";
import { PageHeader } from "@/components/platform/subpage-blocks";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug or problem",
  feature: "Feature request",
  content: "Quiz or question issue",
  billing: "Credits and billing",
  other: "Something else",
};

/* /platform/feedback — calls /user-feedback only. Feedback submitted by
   signed-in users from the public contact page. */
export default function FeedbackPage() {
  const [category, setCategory] = useState("");
  const feedbackQ = useAsync(
    () => platformApi.userFeedback(category || undefined),
    `user-feedback:${category}`
  );
  const data = feedbackQ.data;

  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
      active
        ? "border-[var(--text-primary)] bg-[var(--platform-soft-strong)] text-[var(--text-primary)]"
        : "border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    }`;

  return (
    <div className="space-y-4">
      <PageHeader title="User feedback" detail="Everything users send from the contact page." />

      <SectionCard
        title="Feedback inbox"
        subtitle={
          data
            ? `${data.total} ${data.total === 1 ? "message" : "messages"}${
                category ? " in this category" : ""
              }`
            : "Loading feedback…"
        }
      >
        {feedbackQ.loading ? (
          <SectionSkeleton rows={4} />
        ) : feedbackQ.error ? (
          <ErrorState message={feedbackQ.error.message} onRetry={feedbackQ.retry} />
        ) : !data || data.unavailable ? (
          <EmptyState message="Feedback is unavailable right now" detail="Try again in a moment." />
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <button type="button" className={chip(!category)} onClick={() => setCategory("")}>
                All ({data.total})
              </button>
              {data.categories.map((row) => (
                <button
                  key={row.category}
                  type="button"
                  className={chip(category === row.category)}
                  onClick={() => setCategory(row.category)}
                >
                  {CATEGORY_LABELS[row.category] ?? row.category} ({row.count})
                </button>
              ))}
            </div>

            {data.items.length === 0 ? (
              <EmptyState
                message="No feedback yet"
                detail="Messages sent from the contact page will appear here."
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {data.items.map((item) => (
                  <article key={item.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-semibold text-[var(--text-secondary)]">
                        {CATEGORY_LABELS[item.category] ?? item.category}
                      </span>
                      <span className="text-[12px] font-medium text-[var(--text-primary)]">
                        {item.username || item.email || `User #${item.user_id}`}
                      </span>
                      {item.username && item.email ? <span>{item.email}</span> : null}
                      <span>·</span>
                      <span>{timeAgo(item.created_at)}</span>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--text-primary)]">
                      {item.message}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  );
}
