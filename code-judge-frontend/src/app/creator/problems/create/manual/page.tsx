import { PageHeader, BillButton } from "@/components/creator/billing/ui";
import { ManualProblemCreator } from "@/components/creator/problems/ManualProblemCreator";

export default function CreateProblemManualRoute() {
  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Create Problem Manually"
        subtitle="Write your own problem from scratch — statement, options and answer key."
        actions={
          <BillButton variant="ghost" href="/creator/problems">
            Back to Problems
          </BillButton>
        }
      />
      <ManualProblemCreator />
    </div>
  );
}
