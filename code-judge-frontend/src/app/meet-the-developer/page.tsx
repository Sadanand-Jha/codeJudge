import type { Metadata } from "next";
import DeveloperPortfolio from "./DeveloperPortfolio";

export const metadata: Metadata = {
  title: "Sadanand Jha - Developer of ByteClash",
  description: "Meet Sadanand Jha, the software developer behind ByteClash.",
};

export default function MeetTheDeveloperPage() {
  return <DeveloperPortfolio />;
}
