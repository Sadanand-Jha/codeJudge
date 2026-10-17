import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "UPSC Problems",
  description: "Take the UPSC quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/upsc" },
};

export default function UpscStreamPage() {
  return <StreamPractice streamId="upsc" />;
}