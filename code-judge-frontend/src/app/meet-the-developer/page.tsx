import type { Metadata } from "next";
import DeveloperPortfolio from "./DeveloperPortfolio";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata: Metadata = buildPublicPageMetadata({
  title: "Sadanand Jha - Developer of QuizSupport",
  description: "Meet Sadanand Jha, the software developer behind QuizSupport.",
  path: "/meet-the-developer",
});

export default function MeetTheDeveloperPage() {
  return <DeveloperPortfolio />;
}
