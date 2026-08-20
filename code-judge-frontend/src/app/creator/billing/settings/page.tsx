import { PaymentSettingsPage } from "@/components/creator/billing/PaymentSettingsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function PaymentSettingsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <PaymentSettingsPage demoState={demoStateFromParams(state)} />;
}