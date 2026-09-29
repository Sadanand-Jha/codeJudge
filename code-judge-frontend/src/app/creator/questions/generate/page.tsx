import { redirect } from "next/navigation";

export default function StandaloneQuestionGeneratorPage() {
  redirect("/creator/problems/create");
}
