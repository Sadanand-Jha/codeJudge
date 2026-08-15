import { ArrowRight, BadgeCheck } from "lucide-react";

const codeLines = [
  { text: "const fastest = dist.sort((a, b) => a - b)[0];", color: "text-[#7C6CD9]" },
  { text: "render(hero.slice(0, 12));", color: "text-[#5FA8E8]" },
  { text: "await deadline.now();", color: "text-[#E8A75F]" },
  { text: "export default MacBook Pro;", color: "text-[#5FBF8A]" },
];

/**
 * Frontend-only mock advertisement slot (no real ad network). Renders as a
 * vertical, sticky-friendly portrait creative for a MacBook Pro M5 Pro
 * placement — designed to fill the right-hand column of the article grid.
 */
export default function AdBanner() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#0B0D10] shadow-[0_20px_60px_-25px_rgba(0,0,0,0.7)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#86868B]">
          Advertisement
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-[#86868B]">
          <BadgeCheck className="h-2.5 w-2.5 text-[#8B5CF6]" />
          Sponsored
        </span>
      </div>

      <div className="relative flex flex-col items-center px-5 pb-5 pt-4">
        <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-[#8B5CF6]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-12 h-44 w-44 rounded-full bg-[#3B82F6]/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05),transparent_60%)]" />

        {/* MacBook product visual */}
        <div className="relative z-10 mt-1">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-32 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8B5CF6]/25 blur-3xl" />
          <div className="relative">
            <div className="w-[230px] rounded-t-[13px] border border-white/15 bg-gradient-to-b from-[#1A1B20] to-[#101115] p-1.5 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)]">
              <div className="relative overflow-hidden rounded-[8px] bg-[#0A0B0E] px-3 py-2.5">
                <div className="absolute left-2 top-2 flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FF5F57]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#FEBC2E]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#28C840]" />
                </div>
                <div className="mt-4 space-y-1 font-mono text-[8px] leading-relaxed">
                  {codeLines.map((line, i) => (
                    <p key={i} className={`whitespace-nowrap ${line.color}`}>
                      {line.text}
                    </p>
                  ))}
                </div>
                <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent" />
              </div>
            </div>
            <div className="mx-auto h-[6px] w-[244px] rounded-b-[9px] bg-gradient-to-b from-[#2C2E36] to-[#111318] shadow-[0_12px_30px_rgba(0,0,0,0.6)]" />
            <div className="relative mx-auto -mt-[1px] h-[2px] w-[100px] rounded-full bg-[#3A3D47]">
              <div className="absolute left-1/2 top-1/2 h-[2px] w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22242B]" />
            </div>
          </div>

          <span className="absolute -right-6 -top-2 rounded-lg border border-white/10 bg-black/70 px-2 py-1 text-[9px] font-semibold text-[#A78BFA] backdrop-blur">
            M5 Pro
          </span>
        </div>

        {/* Copy */}
        <div className="relative z-10 mt-4 text-center">
          <h2 className="text-lg font-bold tracking-tight text-[#F5F5F7]">MacBook Pro</h2>
          <p className="mt-0.5 text-[13px] font-medium text-[#A1A1A6]">MacBook Pro with M5 Pro</p>
          <p className="mt-2 text-[15px] font-semibold tracking-tight text-white">
            Power through your biggest ideas.
          </p>
          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold text-[#F5F5F7]">
              MacBook Pro
            </span>
            <span className="rounded-md border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-2 py-0.5 text-[9px] font-semibold text-[#A78BFA]">
              M5 Pro
            </span>
          </div>
        </div>

        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          className="relative z-10 mt-4 inline-flex items-center gap-1 rounded-full border border-[#8B5CF6]/50 bg-[#8B5CF6]/10 px-4 py-1.5 text-[12px] font-semibold text-[#A78BFA] transition-colors hover:bg-[#8B5CF6]/20"
        >
          Learn more
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}