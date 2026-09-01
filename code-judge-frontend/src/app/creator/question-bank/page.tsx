import { QuestionBankPage } from "@/components/creator/questions/QuestionBankPage";
import { demoStateFromParams } from "@/lib/demoState";

export default async function QuestionBankRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <QuestionBankPage demoState={demoStateFromParams(state)} />;
}