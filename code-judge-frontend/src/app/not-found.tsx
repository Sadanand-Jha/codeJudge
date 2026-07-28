import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      {/* Illustration */}
      <div className="mb-8 text-6xl" aria-hidden="true">
        <span className="text-[#D1D5DB]">404</span>
      </div>

      <h1 className="mb-2 text-xl font-bold text-[#111827]">
        Page Not Found
      </h1>
      <p className="mb-8 text-sm text-[#6B7280]">
        This route doesn't exist on CodeJudge.
        <br />
        Choose an action below to get back on track.
      </p>

      {/* Action grid */}
      <div className="grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
        <Link
          href="/problems"
          className="group rounded border border-[#E6E7EB] bg-white p-4 hover:border-[#2563EB] hover:shadow-sm transition-all"
        >
          <div className="mb-1 text-lg">✓</div>
          <div className="text-[12px] font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors">
            Problemset
          </div>
          <div className="mt-0.5 text-[10px] text-[#6B7280]">
            Browse and solve programming challenges
          </div>
        </Link>

        <Link
          href="/contests"
          className="group rounded border border-[#E6E7EB] bg-white p-4 hover:border-[#2563EB] hover:shadow-sm transition-all"
        >
          <div className="mb-1 text-lg">🏆</div>
          <div className="text-[12px] font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors">
            Contests
          </div>
          <div className="mt-0.5 text-[10px] text-[#6B7280]">
            Join upcoming and past competitions
          </div>
        </Link>

        <Link
          href="/submissions"
          className="group rounded border border-[#E6E7EB] bg-white p-4 hover:border-[#2563EB] hover:shadow-sm transition-all"
        >
          <div className="mb-1 text-lg">📄</div>
          <div className="text-[12px] font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors">
            My Submissions
          </div>
          <div className="mt-0.5 text-[10px] text-[#6B7280]">
            Review your past submissions and verdicts
          </div>
        </Link>

        <Link
          href="/ai/chat"
          className="group relative col-span-2 overflow-hidden rounded border border-[#10A37F]/30 bg-gradient-to-br from-[#10A37F]/5 via-white to-[#10A37F]/5 p-4 hover:border-[#10A37F] hover:shadow-md transition-all sm:col-span-1"
        >
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-[#10A37F]/10 blur-xl" />
          <div className="relative flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10A37F] text-sm text-white shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="text-[12px] font-semibold text-[#111827] group-hover:text-[#10A37F] transition-colors">
                AI Chat
              </div>
              <div className="mt-0.5 text-[10px] text-[#6B7280]">
                ChatGPT-style assistant for code, algorithms & debugging
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/ai/hints"
          className="group rounded border border-[#E6E7EB] bg-white p-4 hover:border-[#2563EB] hover:shadow-sm transition-all"
        >
          <div className="mb-1 text-lg">💡</div>
          <div className="text-[12px] font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors">
            Hints
          </div>
          <div className="mt-0.5 text-[10px] text-[#6B7280]">
            Smart AI-powered hints for problems
          </div>
        </Link>

        <Link
          href="/editor"
          className="group rounded border border-[#E6E7EB] bg-white p-4 hover:border-[#2563EB] hover:shadow-sm transition-all"
        >
          <div className="mb-1 text-lg">⌨️</div>
          <div className="text-[12px] font-semibold text-[#111827] group-hover:text-[#2563EB] transition-colors">
            Code Editor
          </div>
          <div className="mt-0.5 text-[10px] text-[#6B7280]">
            Custom test and experiment with code
          </div>
        </Link>
      </div>

      {/* Quick home link */}
      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}