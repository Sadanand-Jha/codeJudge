import { CreatorProfilePage } from "@/components/creator/profile/CreatorProfilePage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Creator Profile — Creator Studio",
  description: "Manage your creator identity and studio preferences.",
};

export default function CreatorProfileRoute() {
  return <CreatorProfilePage />;
}
