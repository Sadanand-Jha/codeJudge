import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "UPSC Problems — QuizSupport",
  description: "UPSC practice problems — mix, subject-wise and chapter-wise drill-down.",
};

export default function UpscStreamPage() {
  return <StreamPractice streamId="upsc" />;
}