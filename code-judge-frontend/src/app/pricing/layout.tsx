import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Pricing",
  description:
    "Compare QuizSupport plans and AI credit packs for creating, hosting and organising online quizzes.",
  path: "/pricing",
});

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
