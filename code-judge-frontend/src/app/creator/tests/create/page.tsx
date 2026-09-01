import { CreateTestWizard, type CreationType } from "@/components/creator/tests/CreateTestWizard";

export default async function CreateTestRoute({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const creationType: CreationType = type === "quiz" || type === "assessment" ? type : "test";
  return <CreateTestWizard creationType={creationType} />;
}