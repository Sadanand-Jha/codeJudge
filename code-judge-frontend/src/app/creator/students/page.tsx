import { StudentsPage } from "@/components/creator/audience/StudentsPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function StudentsRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <StudentsPage demoState={demoStateFromParams(state)} />;
}