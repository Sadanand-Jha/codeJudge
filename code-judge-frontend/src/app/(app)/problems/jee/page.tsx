import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "JEE Problems — QuizSupport",
  description: "JEE practice problems — mix, subject-wise and chapter-wise drill-down.",
};

export default function JeeStreamPage() {
  return <StreamPractice streamId="jee" />;
}