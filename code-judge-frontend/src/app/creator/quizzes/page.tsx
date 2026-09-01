import { QuizzesPage } from "@/components/creator/manage/QuizzesPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function QuizzesRoute({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  return <QuizzesPage demoState={demoStateFromParams(state)} />;
}