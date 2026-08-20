import { AnalyticsOverviewPage } from "@/components/creator/analytics/AnalyticsOverviewPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function AnalyticsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <AnalyticsOverviewPage demoState={demoStateFromParams(state)} />;
}