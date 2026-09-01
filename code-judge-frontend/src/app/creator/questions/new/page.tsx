import { PageHeader, Panel, BillButton } from "@/components/creator/billing/ui";

export default function NewQuestionRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Question"
        subtitle="Create a new question for your reusable question bank."
        actions={
          <BillButton variant="ghost" href="/creator/question-bank">
            Back to Question Bank
          </BillButton>
        }
      />
      <Panel title="Add Question" subtitle="The full question builder ships in the next build phase.">
        <p className="text-sm text-text-secondary">
          This is a placeholder — the complete question editor is coming soon.
        </p>
      </Panel>
    </div>
  );
}