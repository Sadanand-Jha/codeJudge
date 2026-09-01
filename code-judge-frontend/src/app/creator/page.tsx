import { CreatorDashboard } from "@/components/creator/workspace/CreatorDashboard";
import { demoStateFromParams } from "@/lib/demoState";

export default async function CreatorDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <CreatorDashboard demoState={demoStateFromParams(state)} />;
}