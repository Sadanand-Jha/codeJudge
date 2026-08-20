import { EarningsPage } from "@/components/creator/billing/EarningsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function EarningsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <EarningsPage demoState={demoStateFromParams(state)} />;
}