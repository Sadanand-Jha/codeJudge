import { StreamPractice } from "../StreamPractice";

export const metadata = {
  title: "GATE Problems — ByteClash",
  description: "GATE practice problems — mix, subject-wise and chapter-wise drill-down.",
};

export default function GateStreamPage() {
  return <StreamPractice streamId="gate" />;
}