import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 border-b border-[#E6E7EB] pb-2">
        <h1 className="text-xl font-bold text-[#111827]">Documentation</h1>
      </div>
      <div className="space-y-3">
        <div className="border border-[#E6E7EB] bg-white">
          <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
            <span className="text-[11px] font-medium text-[#2563EB]">→ Getting Started</span>
          </div>
          <div className="p-3 text-[11px] text-[#6B7280] space-y-2">
            <p>Learn how to use CodeJudge effectively:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Browse problems in the <Link href="/problems" className="text-[#2563EB] hover:underline">Problemset</Link></li>
              <li>Submit solutions using the built-in editor</li>
              <li>Track your progress on your profile page</li>
              <li>Use AI hints when stuck on a problem</li>
            </ul>
          </div>
        </div>
        <div className="border border-[#E6E7EB] bg-white">
          <div className="border-b border-[#E6E7EB] bg-[#FAFAFB] px-3 py-1.5">
            <span className="text-[11px] font-medium text-[#2563EB]">→ API Reference</span>
          </div>
          <div className="p-3 text-[11px] text-[#6B7280]">
            <p>API documentation coming soon.</p>
          </div>
        </div>
      </div>
      <div className="mt-6 border-t border-[#E6E7EB] pt-4">
        <Link href="/" className="text-[11px] text-[#2563EB] hover:underline">← Back to Home</Link>
      </div>
    </div>
  );
}