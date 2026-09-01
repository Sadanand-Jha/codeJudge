import { BatchesPage } from "@/components/creator/audience/BatchesPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function BatchesRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <BatchesPage demoState={demoStateFromParams(state)} />;
}