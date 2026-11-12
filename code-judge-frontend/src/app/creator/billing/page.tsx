import { BillingDashboard } from "@/components/creator/billing/BillingDashboard";
import { demoStateFromParams } from "@/lib/demoState";

export const metadata = {
  title: "Overview — Creator Studio",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <BillingDashboard demoState={demoStateFromParams(state)} />;
}