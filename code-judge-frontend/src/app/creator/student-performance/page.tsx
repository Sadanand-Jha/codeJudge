import { ComingSoon } from "@/components/creator/layout/ComingSoon";
import { GraduationCap } from "lucide-react";

export default function CreatorStudentPerformanceRoute() {
  return (
    <ComingSoon
      title="Student Performance"
      description="Follow each student's progress across your tests — scores, rank, strengths and areas for improvement."
      icon={GraduationCap}
      accent="#EC4899"
      features={[
        "Per-student score history",
        "Percentile & rank tracking",
        "Strength / weakness analysis",
        "Share feedback with students",
      ]}
    />
  );
}