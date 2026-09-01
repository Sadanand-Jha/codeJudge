import { PageHeader, Panel, BillButton } from "@/components/creator/billing/ui";

export default function CreateProblemRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Problem"
        subtitle="Add a standalone problem to your question bank."
        actions={
          <BillButton variant="ghost" href="/creator/problems">
            Back to Problems
          </BillButton>
        }
      />
      <Panel title="Problem Builder" subtitle="The problem builder is part of this build phase.">
        <p className="text-sm text-text-secondary">
          This is a placeholder — the complete problem builder is being wired up here.
        </p>
      </Panel>
    </div>
  );
}