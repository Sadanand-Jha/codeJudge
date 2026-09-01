import { ComingSoon } from "@/components/creator/layout/ComingSoon";
import { NotebookPen } from "lucide-react";

export default function CreatorProblemsRoute() {
  return (
    <ComingSoon
      title="Problems"
      description="Build and manage a reusable bank of practice problems that can be attached to any test."
      icon={NotebookPen}
      accent="#8B5CF6"
      features={[
        "Question bank of reusable problems",
        "Subject & difficulty tagging",
        "Bulk import and edit",
        "Attach problems to tests and series",
      ]}
    />
  );
}