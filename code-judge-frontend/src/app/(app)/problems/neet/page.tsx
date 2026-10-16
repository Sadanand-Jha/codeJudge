import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "NEET Problems — QuizSupport",
  description: "NEET practice problems — mix, subject-wise and chapter-wise drill-down.",
};

export default function NeetStreamPage() {
  return <StreamPractice streamId="neet" />;
}