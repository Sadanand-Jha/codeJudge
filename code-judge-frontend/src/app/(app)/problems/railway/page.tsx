import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "Railway Problems — QuizSupport",
  description: "Railway exams practice problems — mix, subject-wise and chapter-wise drill-down.",
};

export default function RailwayStreamPage() {
  return <StreamPractice streamId="railway" />;
}