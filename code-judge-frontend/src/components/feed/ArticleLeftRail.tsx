"use client";

import {
  BarChart3,
  Clock,
  FileCode2,
  Gauge,
  Network,
} from "lucide-react";
import type { FeedPost } from "@/data/developerFeed";
import type { TocItem } from "./article";
import ArticleToc from "./ArticleToc";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

function ProgressCard() {
  return (
    <Card title="Article progress">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-card-hover" />
            <circle
              cx="32" cy="32" r="26" fill="none" stroke="#8B5CF6" strokeWidth="6"
              strokeLinecap="round" strokeDasharray="163.4" strokeDashoffset={163.4 * (1 - 0.67)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-[#7C3AED] dark:text-[#A78BFA]">
            67%
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-text-primary">You&apos;re almost there.</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-text-secondary">
            The heaviest machinery is just ahead.
          </p>
        </div>
      </div>
    </Card>
  );
}

function InfoCard({ post }: { post: FeedPost }) {
  const rows = [
    { icon: Clock, label: "Reading time", value: post.readTime },
    { icon: Gauge, label: "Difficulty", value: "Intermediate" },
    { icon: FileCode2, label: "Language", value: "C++" },
    { icon: Network, label: "Topic", value: "Graph Algorithms" },
    { icon: BarChart3, label: "Likes", value: String(post.likes) },
  ];
  return (
    <Card title="Article info">
      <dl className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]">
              <r.icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-wider text-text-muted">{r.label}</dt>
              <dd className="text-[12px] font-semibold text-text-primary">{r.value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/**
 * Dense left editorial rail: sticky article navigation, reading progress and
 * quick facts. Fills the 18% left column so it never reads as empty.
 */
export default function ArticleLeftRail({
  post,
  toc,
  activeId,
  onNavigate,
}: {
  post: FeedPost;
  toc: TocItem[];
  activeId: string | null;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="sticky top-[4.5rem] max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto pb-4">
      <ArticleToc toc={toc} activeId={activeId} onNavigate={onNavigate} variant="rail" />
      <ProgressCard />
      <InfoCard post={post} />
    </div>
  );
}