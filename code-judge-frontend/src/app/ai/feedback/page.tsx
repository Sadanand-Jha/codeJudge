export default function AIFeedbackPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">AI Feedback</h1>
      </div>
      <div className="border border-[#E6E7EB] bg-white">
        <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
          <span className="text-[11px] font-medium text-[#2563EB]">→ Code Reviews</span>
        </div>
        <div className="p-3 text-[11px] text-[#6B7280]">
          <p>Submit a solution to receive AI-powered feedback on your code.</p>
        </div>
      </div>
    </div>
  );
}