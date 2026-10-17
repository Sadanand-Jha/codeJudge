import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "Banking Problems",
  description: "Take the Banking quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/banking" },
};

export default function BankingStreamPage() {
  return <StreamPractice streamId="banking" />;
}