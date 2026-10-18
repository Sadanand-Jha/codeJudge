import { AICreditsPage } from "@/components/creator/billing/AICreditsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function AICreditsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; pack?: string }>;
}) {
  const { state, pack } = await searchParams;
  return <AICreditsPage demoState={demoStateFromParams(state)} initialPackId={pack ?? null} />;
}
