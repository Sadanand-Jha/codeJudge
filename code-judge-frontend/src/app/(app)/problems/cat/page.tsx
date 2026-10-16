import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "CAT Problems — QuizSupport",
  description: "CAT practice problems — mix, subject-wise and chapter-wise drill-down.",
};

export default function CatStreamPage() {
  return <StreamPractice streamId="cat" />;
}