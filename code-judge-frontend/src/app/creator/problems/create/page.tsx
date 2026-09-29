import { PageHeader, BillButton } from "@/components/creator/billing/ui";
import { QuestionGeneratorPanel } from "@/components/creator/tests/sections/QuestionGeneratorPanel";

export default function CreateProblemRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader
        title="Create Problem"
        subtitle="Generate and prepare standalone Operating System questions for your question bank."
        actions={
          <BillButton variant="ghost" href="/creator/problems">
            Back to Problems
          </BillButton>
        }
      />
      <div className="rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-6">
        <div className="mb-5 border-b border-border pb-4">
          <h2 className="text-base font-extrabold text-text-primary">AI question generator</h2>
          <p className="mt-1 text-sm leading-5 text-text-secondary">Create individual questions independently—no test, section, or full paper is required.</p>
        </div>
        <QuestionGeneratorPanel />
      </div>
    </div>
  );
}
