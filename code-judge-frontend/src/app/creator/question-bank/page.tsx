import { QuestionBankPage } from "@/components/creator/questions/QuestionBankPage";
import { demoStateFromParams } from "@/lib/demoState";

export const metadata = {
  title: "Question Bank — Creator Studio",
};

export default async function QuestionBankRoute({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  return <QuestionBankPage demoState={demoStateFromParams(state)} />;
}