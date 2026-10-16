import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "CUET Problems — QuizSupport",
  description: "CUET practice problems — mix, subject-wise and chapter-wise drill-down.",
};

export default function CuetStreamPage() {
  return <StreamPractice streamId="cuet" />;
}