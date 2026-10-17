import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "SSC Problems",
  description: "Take the SSC quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/ssc" },
};

export default function SscStreamPage() {
  return <StreamPractice streamId="ssc" />;
}