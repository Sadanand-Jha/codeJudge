import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "Other Competitive Exams",
  description: "Take the Other Competitive Exams quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/other" },
};

export default function OtherStreamPage() {
  return <StreamPractice streamId="other" />;
}