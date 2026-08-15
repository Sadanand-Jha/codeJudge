import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/helpers";
import type { FeedPost } from "@/data/developerFeed";

const TYPE_LABEL: Record<FeedPost["type"], string> = {
  tutorial: "Tutorial",
  editorial: "Editorial",
  experience: "Experience",
  tips: "Tips",
  ai: "AI Research",
};

const THUMB_TONES: Record<string, string> = {
  tutorial: "from-[#8B5CF6] to-[#3B82F6]",
  editorial: "from-[#3B82F6] to-[#22C55E]",
  experience: "from-[#EC4899] to-[#F59E0B]",
  tips: "from-[#F59E0B] to-[#8B5CF6]",
  ai: "from-[#22C55E] to-[#8B5CF6]",
};

/**
 * "Continue Reading" — three large, visually rich related-article cards at the
 * bottom of the article page.
 */
export default function ContinueReading({ related }: { related: FeedPost[] }) {
  return (
    <section className="mt-12 border-t border-border pt-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8B5CF6]">
            <span className="h-px w-5 bg-[#8B5CF6]/50" />
            Keep exploring
          </p>
          <h2 className="mt-1.5 text-[24px] font-bold tracking-tight text-text-primary sm:text-[26px]">
            Continue Reading
          </h2>
        </div>
        <Link
          href="/"
          className="hidden items-center gap-1 text-[13px] font-semibold text-text-secondary transition-colors hover:text-[#7C3AED] sm:flex"
        >
          Back to feed
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {related.map((p) => (
          <Link
            key={p.id}
            href={`/feed/${p.id}`}
            className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-[#8B5CF6]/40 hover:shadow-[0_16px_40px_-20px_rgba(139,92,246,0.4)]"
          >
            {/* Thumbnail */}
            <div
              className={cn(
                "relative h-28 overflow-hidden bg-gradient-to-br",
                THUMB_TONES[p.type] ?? THUMB_TONES.tutorial
              )}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
                <span className="rounded-md bg-black/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                  {TYPE_LABEL[p.type]}
                </span>
                <div className="flex items-end gap-0.5">
                  {[30, 55, 42, 70, 50, 85, 60].map((h, i) => (
                    <span
                      key={i}
                      className="w-1 rounded-sm bg-white/60"
                      style={{ height: `${h * 0.16}px` }}
                    />
                  ))}
                </div>
              </div>
              <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-white/70 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </div>

            <div className="p-4">
              <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-text-primary transition-colors group-hover:text-[#7C3AED] dark:group-hover:text-[#A78BFA]">
                {p.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-text-secondary">
                {p.subtitle}
              </p>
              <div className="mt-3 flex items-center gap-2.5 border-t border-border pt-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED]/60 to-[#3B82F6]/60 text-[10px] font-bold text-white">
                  {p.avatar}
                </div>
                <span className="text-[12px] font-semibold text-text-primary">{p.author}</span>
                <span className="ml-auto flex items-center gap-1 text-[11px] text-text-muted">
                  <Clock className="h-3 w-3" />
                  {p.readTime}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}