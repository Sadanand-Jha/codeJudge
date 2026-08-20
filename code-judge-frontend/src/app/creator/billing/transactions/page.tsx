import { TransactionsPage } from "@/components/creator/billing/TransactionsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function TransactionsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <TransactionsPage demoState={demoStateFromParams(state)} />;
}