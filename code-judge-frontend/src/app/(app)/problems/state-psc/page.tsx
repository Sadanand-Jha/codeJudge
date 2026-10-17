import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "State PSC Problems",
  description: "Take the State PSC quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/state-psc" },
};

export default function StatePscStreamPage() {
  return <StreamPractice streamId="state-psc" />;
}