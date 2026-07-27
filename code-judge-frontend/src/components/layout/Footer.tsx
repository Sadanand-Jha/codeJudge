import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-[#E6E7EB] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B7280]">
          <div className="flex items-center gap-3">
            <span>CodeJudge</span>
            <span className="text-[#D1D5DB]">|</span>
            <Link href="/" className="hover:text-[#2563EB]">Home</Link>
            <Link href="/problems" className="hover:text-[#2563EB]">Problemset</Link>
            <Link href="/contests" className="hover:text-[#2563EB]">Contests</Link>
            <Link href="/about" className="hover:text-[#2563EB]">About</Link>
          </div>
          <div className="text-[10px] text-[#9CA3AF]">
            &copy; {new Date().getFullYear()} CodeJudge. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}