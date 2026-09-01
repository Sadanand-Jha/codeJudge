import { CampaignDetail } from "@/components/creator/advertise/CampaignDetail";
import { CAMPAIGNS } from "@/components/creator/advertise/mockData";

export default async function CampaignDetailRoute({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  // In a real build this resolves via a server data fetch. Mock data is used
  // so the UI can be fully exercised; a non-existent id 404s.
  const campaign = CAMPAIGNS.find((c) => c.id === campaignId) ?? CAMPAIGNS[0];
  return <CampaignDetail campaign={campaign} />;
}
