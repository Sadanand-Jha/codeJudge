import { CreateTestWizard, type CreationType } from "@/components/creator/tests/CreateTestWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Paper — Creator Studio",
  description: "Generate a print-ready question paper and save it to your account.",
};

export default async function CreateTestRoute({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const creationType: CreationType = type === "quiz" || type === "assessment" ? type : "test";
  return <CreateTestWizard creationType={creationType} />;
}