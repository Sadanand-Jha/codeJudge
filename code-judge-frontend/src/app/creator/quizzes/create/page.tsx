import { PageHeader, Panel, BillButton } from "@/components/creator/billing/ui";

export default function CreateQuizRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Quiz"
        subtitle="Set up a new quick-assessment quiz."
        actions={
          <BillButton variant="ghost" href="/creator/quizzes">
            Back to Quizzes
          </BillButton>
        }
      />
      <Panel title="Quiz Builder" subtitle="The unified quiz builder ships in this build phase.">
        <p className="text-sm text-text-secondary">
          This is a placeholder — the complete quiz builder is being wired up here.
        </p>
      </Panel>
    </div>
  );
}