import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "GATE Problems",
  description: "Take the GATE quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/gate" },
};

export default function GateStreamPage() {
  return <StreamPractice streamId="gate" />;
}