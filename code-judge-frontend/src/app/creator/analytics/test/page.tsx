import { TestAnalyticsPage } from "@/components/creator/analytics/TestAnalyticsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function TestAnalyticsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <TestAnalyticsPage demoState={demoStateFromParams(state)} />;
}