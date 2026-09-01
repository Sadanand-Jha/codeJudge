import { CampaignBuilder } from "@/components/creator/advertise/CampaignBuilder";
import { demoStateFromParams } from "@/lib/demoState";

export default async function CreateCampaignRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <CampaignBuilder demoState={demoStateFromParams(state)} />;
}
