import { PayoutsPage } from "@/components/creator/billing/PayoutsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function PayoutsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <PayoutsPage demoState={demoStateFromParams(state)} />;
}