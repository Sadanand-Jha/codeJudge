import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "UGC NET Problems",
  description: "Take the UGC NET quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/ugc-net" },
};

export default function UgcNetStreamPage() {
  return <StreamPractice streamId="ugc-net" />;
}