import type { Metadata } from "next";
import { CreateProblemGenerator } from "@/components/creator/problems/CreateProblemGenerator";

export const metadata: Metadata = {
  title: "AI Question Generator — Creator Studio",
  description: "Generate subjective questions from your syllabus, then review and save them to your Question Bank.",
};

export default function CreateProblemRoute() {
  return <CreateProblemGenerator />;
}
