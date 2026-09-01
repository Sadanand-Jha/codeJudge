import { TestSeriesPage } from "@/components/creator/manage/TestSeriesPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function SeriesRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <TestSeriesPage demoState={demoStateFromParams(state)} />;
}