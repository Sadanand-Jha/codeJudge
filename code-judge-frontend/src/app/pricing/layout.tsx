import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Pricing",
  description:
    "Compare QuizSupport monthly plans for creating, hosting and organising online quizzes. Start free with five quizzes a month; Basic and Pro include monthly AI credits.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
