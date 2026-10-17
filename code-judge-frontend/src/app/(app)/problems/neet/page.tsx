import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "NEET Problems",
  description: "Take the NEET quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/neet" },
};

export default function NeetStreamPage() {
  return <StreamPractice streamId="neet" />;
}