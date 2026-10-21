import type { Metadata } from "next";
import { DocumentEditor } from "@/components/creator/documents/DocumentEditor";

export const metadata: Metadata = {
  title: "Paper Studio · QuizSupport",
  description: "Edit an exam paper PDF with protected QuizSupport branding.",
  robots: { index: false, follow: false },
};

export default function PaperStudioPage() {
  return <DocumentEditor />;
}
