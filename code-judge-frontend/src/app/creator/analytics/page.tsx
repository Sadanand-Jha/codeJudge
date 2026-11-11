import { redirect } from "next/navigation";

// Analytics overview is temporarily disabled.
// import { AnalyticsOverviewPage } from "@/components/creator/analytics/AnalyticsOverviewPage";
// import { demoStateFromParams } from "@/lib/demoState";

export default function AnalyticsRoute() {
  redirect("/creator/quizzes");
}
