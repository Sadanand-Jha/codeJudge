import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">About CodeJudge</h1>
      </div>
      <div className="space-y-4 text-[13px] text-[#6B7280] leading-relaxed">
        <p>
          CodeJudge is an AI-powered competitive programming platform designed to help
          programmers practice, compete, and improve their algorithmic problem-solving skills.
        </p>
        <p>
          With a vast collection of problems spanning various difficulty levels and topics,
          CodeJudge provides a comprehensive learning environment for both beginners and
          experienced competitive programmers.
        </p>
        <p>
          Our platform features AI-powered hints, code reviews, and explanations to help you
          understand the underlying concepts behind each problem.
        </p>
      </div>
      <div className="mt-6 border-t border-[#E6E7EB] pt-4">
        <Link href="/" className="text-[11px] text-[#2563EB] hover:underline">← Back to Home</Link>
      </div>
    </div>
  );
}