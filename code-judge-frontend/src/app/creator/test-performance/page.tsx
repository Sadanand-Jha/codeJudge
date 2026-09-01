import { ComingSoon } from "@/components/creator/layout/ComingSoon";
import { Gauge } from "lucide-react";

export default function CreatorTestPerformanceRoute() {
  return (
    <ComingSoon
      title="Test Performance"
      description="Understand how each test performs — attempts, average scores, question-level analytics and drop-offs."
      icon={Gauge}
      accent="#F59E0B"
      features={[
        "Attempts & completion rates",
        "Average score distribution",
        "Question-level analytics",
        "Difficulty & discrimination index",
      ]}
    />
  );
}