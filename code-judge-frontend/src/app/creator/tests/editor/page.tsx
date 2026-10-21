import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Paper Studio · QuizSupport",
  description: "Edit an exam paper PDF with protected QuizSupport branding.",
  robots: { index: false, follow: false },
};

export default function PaperStudioPage() {
  redirect("/creator/tests");
}
