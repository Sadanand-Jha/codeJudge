import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "CUET Problems",
  description: "Take the CUET quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/cuet" },
};

export default function CuetStreamPage() {
  return <StreamPractice streamId="cuet" />;
}