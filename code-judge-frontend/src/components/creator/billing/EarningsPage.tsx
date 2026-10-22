"use client";

import { PageHeader, BillButton, EmptyState, ErrorState } from "./ui";

export function EarningsPage({ demoState }: { demoState?: "empty" | "error" }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings"
        subtitle="Revenue analytics, sales performance and where your money comes from."
        actions={<BillButton variant="ghost" href="/creator/billing/transactions">View transactions</BillButton>}
      />

      {demoState === "error" ? (
        <ErrorState onRetry={() => {}} />
      ) : (
        <EmptyState
          title="No sales data yet"
          description="Your earnings analytics will appear here once students start buying your tests."
          action={<BillButton href="/creator/tests/create">Create a Test</BillButton>}
        />
      )}
    </div>
  );
}
