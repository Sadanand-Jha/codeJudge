import { ContentAnalyticsPage } from "@/components/creator/analytics/ContentAnalyticsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function ContentAnalyticsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <ContentAnalyticsPage demoState={demoStateFromParams(state)} />;
}