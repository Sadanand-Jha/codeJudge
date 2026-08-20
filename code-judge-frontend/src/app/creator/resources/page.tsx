import { ComingSoon } from "@/components/creator/layout/ComingSoon";
import { FolderKanban } from "lucide-react";

export default function CreatorResourcesRoute() {
  return (
    <ComingSoon
      title="Resources"
      description="Share study notes, formula sheets and other learning material with the students enrolled in your tests."
      icon={FolderKanban}
      accent="#3B82F6"
      features={[
        "Upload PDFs & notes",
        "Organize by test and topic",
        "Share resources with enrolled students",
        "Track downloads",
      ]}
    />
  );
}