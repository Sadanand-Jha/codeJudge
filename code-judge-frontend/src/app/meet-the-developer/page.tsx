import type { Metadata } from "next";
import DeveloperPortfolio from "./DeveloperPortfolio";

export const metadata: Metadata = {
  title: "Sadanand Jha - Developer of QuizSupport",
  description: "Meet Sadanand Jha, the software developer behind QuizSupport.",
};

export default function MeetTheDeveloperPage() {
  return <DeveloperPortfolio />;
}
