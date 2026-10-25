import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Pricing",
  description:
    "Compare QuizSupport monthly plans for creating, hosting and organising online quizzes. Start with a 7-day quiz-only trial; Basic and Pro include monthly AI credits at the limited 2026 offer price.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
