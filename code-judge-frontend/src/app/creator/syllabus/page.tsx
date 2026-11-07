import type { Metadata } from "next";
import { MySyllabusPage } from "@/components/creator/syllabus/MySyllabusPage";

export const metadata: Metadata = {
  title: "My Syllabus — Creator Studio",
  description: "Import, review, and manage your own syllabus chapters and topics.",
};

export default async function MySyllabusRoute({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const params = await searchParams;
  return <MySyllabusPage onboarding={params.onboarding === "1"} />;
}
