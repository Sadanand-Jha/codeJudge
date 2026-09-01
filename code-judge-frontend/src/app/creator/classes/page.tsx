import { ClassesPage } from "@/components/creator/audience/ClassesPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function ClassesRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <ClassesPage demoState={demoStateFromParams(state)} />;
}