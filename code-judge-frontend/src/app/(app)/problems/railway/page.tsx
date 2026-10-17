import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "Railway Problems",
  description: "Take the Railway quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/railway" },
};

export default function RailwayStreamPage() {
  return <StreamPractice streamId="railway" />;
}