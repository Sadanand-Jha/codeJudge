import AppLayout from "@/components/layout/AppLayout";
import { buildPublicPageMetadata } from "@/lib/seo/site";
import DocsContent from "./DocsContent";

export const metadata = buildPublicPageMetadata({
  title: "Documentation — Quiz Creation & Student Guides",
  description:
    "Step-by-step guides for teachers creating and sharing quizzes, and for students joining, attempting and reviewing them on QuizSupport.",
  path: "/docs",
});

export default function DocsPage() {
  return (
    <AppLayout>
      <DocsContent />
    </AppLayout>
  );
}
