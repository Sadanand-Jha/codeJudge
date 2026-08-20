import { AIStudioPage } from "@/components/creator/questions/AIStudioPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function AIStudioRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <AIStudioPage demoState={demoStateFromParams(state)} />;
}