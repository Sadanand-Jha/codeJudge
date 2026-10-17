import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "CAT Problems",
  description: "Take the CAT quiz online. Practice questions, instant results and score tracking.",
  alternates: { canonical: "https://www.quizsupport.com/problems/cat" },
};

export default function CatStreamPage() {
  return <StreamPractice streamId="cat" />;
}