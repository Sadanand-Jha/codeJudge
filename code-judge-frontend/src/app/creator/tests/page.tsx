import { TestsPage } from "@/components/creator/manage/TestsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function TestsRoute({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  return <TestsPage demoState={demoStateFromParams(state)} />;
}