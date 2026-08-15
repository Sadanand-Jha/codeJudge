"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Check,
  Clock,
  Layers,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { FeedPost } from "@/data/developerFeed";

const TOPICS = [
  "Algorithms",
  "Graph Theory",
  "C++",
  "Competitive Programming",
  "Shortest Path",
];

const SIDEBAR_ARTICLES = [
  { title: "Bellman-Ford Explained", time: "7 min read", tone: "from-[#3B82F6] to-[#22C55E]" },
  { title: "BFS vs Dijkstra", time: "5 min read", tone: "from-[#8B5CF6] to-[#3B82F6]" },
  { title: "Understanding Priority Queues", time: "6 min read", tone: "from-[#EC4899] to-[#8B5CF6]" },
];

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>{children}</div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
      {children}
    </p>
  );
}

/**
 * Dense right sidebar: article progress, about the author, related topics and
 * related article links. Rendered inline below the article on smaller screens.
 */
export default function ArticleSidebar({
  post,
  following,
  onToggleFollow,
}: {
  post: FeedPost;
  following: boolean;
  onToggleFollow: () => void;
}) {
return (
    <div className="space-y-4">
      {/* About the author */}
      <Card>
        <CardTitle>
          <UserPlus className="h-3 w-3 text-[#8B5CF6]" />
          About the author
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-sm font-bold text-white">
            {post.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-text-primary">{post.author}</p>
            <p className="text-xs text-text-muted">{post.handle}</p>
          </div>
        </div>
        <p className="mt-2.5 text-[12px] leading-relaxed text-text-secondary">
          Algorithm enthusiast &amp; competitive programmer.
        </p>
        <button
          type="button"
          onClick={onToggleFollow}
          className={cn(
            "mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-colors",
            following
              ? "border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]"
              : "border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
          )}
        >
          {following ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
          {following ? "Following" : "Follow"}
        </button>
      </Card>

      {/* Related topics */}
      <Card>
        <CardTitle>
          <Layers className="h-3 w-3 text-[#8B5CF6]" />
          Related topics
        </CardTitle>
        <div className="flex flex-wrap gap-1.5">
          {TOPICS.map((t) => (
            <a
              key={t}
              href="#"
              onClick={(e) => e.preventDefault()}
              className="rounded-full border border-[#8B5CF6]/25 bg-[#8B5CF6]/[0.07] px-2.5 py-1 text-[11px] font-semibold text-[#7C3AED] transition-colors hover:bg-[#8B5CF6]/[0.15] dark:text-[#A78BFA]"
            >
              {t}
            </a>
          ))}
        </div>
      </Card>

      {/* Related articles */}
      <Card>
        <CardTitle>
          <BookOpen className="h-3 w-3 text-[#8B5CF6]" />
          Related articles
        </CardTitle>
        <div className="space-y-3">
          {SIDEBAR_ARTICLES.map((a) => (
            <Link key={a.title} href="/feed/1" className="group flex items-center gap-3">
              <div className={cn("h-10 w-12 shrink-0 rounded-lg bg-gradient-to-br", a.tone, "opacity-80")}>
                <div className="flex h-full w-full items-end gap-0.5 p-1.5">
                  {[40, 70, 55, 90].map((h, i) => (
                    <span key={i} className="w-1.5 rounded-sm bg-white/50" style={{ height: `${h * 0.14}px` }} />
                  ))}
                </div>
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-text-primary transition-colors group-hover:text-[#7C3AED] dark:group-hover:text-[#A78BFA]">
                  {a.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-text-muted">
                  <Clock className="h-3 w-3" />
                  {a.time}
                </p>
              </div>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5 shrink-0 text-text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}