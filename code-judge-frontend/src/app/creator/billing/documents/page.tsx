import { DocumentsPage } from "@/components/creator/billing/DocumentsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function DocumentsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <DocumentsPage demoState={demoStateFromParams(state)} />;
}