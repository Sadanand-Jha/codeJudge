import { RefundsPage } from "@/components/creator/billing/RefundsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function RefundsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <RefundsPage demoState={demoStateFromParams(state)} />;
}