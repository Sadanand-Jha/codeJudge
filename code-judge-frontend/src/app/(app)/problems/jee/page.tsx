import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "JEE Problems",
  description: "Take the JEE quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/jee" },
};

export default function JeeStreamPage() {
  return <StreamPractice streamId="jee" />;
}