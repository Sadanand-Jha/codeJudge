import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/[0.06] bg-[#09090B]">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#9CA3AF]">
          <div className="flex items-center gap-3">
            <span className="font-medium text-white">CodeJudge</span>
            <span className="text-[#3F3F46]">|</span>
            <Link href="/" className="hover:text-[#7C3AED] transition-colors">Home</Link>
            <Link href="/problems" className="hover:text-[#7C3AED] transition-colors">Problemset</Link>
            <Link href="/contests" className="hover:text-[#7C3AED] transition-colors">Contests</Link>
            <Link href="/about" className="hover:text-[#7C3AED] transition-colors">About</Link>
          </div>
          <div className="text-[10px] text-[#6B7280]">
            &copy; {new Date().getFullYear()} CodeJudge. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}