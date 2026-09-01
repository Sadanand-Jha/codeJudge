import { StudentAnalyticsPage } from "@/components/creator/analytics/StudentAnalyticsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function StudentAnalyticsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <StudentAnalyticsPage demoState={demoStateFromParams(state)} />;
}