import { CreateHubPage } from "@/components/creator/create/CreateHubPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function CreatorCreateRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <CreateHubPage demoState={demoStateFromParams(state)} />;
}