import { CreateHubPage } from "@/components/creator/create/CreateHubPage";
import { demoStateFromParams } from "@/lib/demoState";

// Temporary landing: creator studio opens on Create New for now.
export default async function CreatorDashboardRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <CreateHubPage demoState={demoStateFromParams(state)} />;
}
