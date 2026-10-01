import { PageHeader, BillButton } from "@/components/creator/billing/ui";
import { QuestionGeneratorPanel } from "@/components/creator/tests/sections/QuestionGeneratorPanel";

export default function CreateProblemRoute() {
  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Create Problem"
        subtitle="Generate and prepare standalone Operating System questions for your question bank."
        actions={
          <BillButton variant="ghost" href="/creator/problems">
            Back to Problems
          </BillButton>
        }
      />
      <QuestionGeneratorPanel />
    </div>
  );
}
