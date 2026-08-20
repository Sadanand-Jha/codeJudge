import { PageHeader, Panel, BillButton } from "@/components/creator/billing/ui";

export default function CreateTestSeriesRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Test Series"
        subtitle="Bundle tests into a series and sell them together."
        actions={
          <BillButton variant="ghost" href="/creator/series">
            Back to Test Series
          </BillButton>
        }
      />
      <Panel title="Test Series Builder" subtitle="The series builder is part of this build phase.">
        <p className="text-sm text-text-secondary">
          This is a placeholder — the complete series builder is being wired up here.
        </p>
      </Panel>
    </div>
  );
}