import { TaxPage } from "@/components/creator/billing/TaxPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function TaxRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <TaxPage demoState={demoStateFromParams(state)} />;
}