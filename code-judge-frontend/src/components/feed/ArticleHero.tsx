"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Bookmark,
  Check,
  Clock,
  FileCode2,
  Gauge,
  Heart,
  MessageSquare,
  Network,
  Share2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { FeedPost } from "@/data/developerFeed";

const TYPE_LABEL: Record<FeedPost["type"], string> = {
  tutorial: "Tutorial",
  editorial: "Editorial",
  experience: "Experience",
  tips: "Tips",
  ai: "AI Research",
};

const TYPE_ACCENT: Record<FeedPost["type"], string> = {
  tutorial:
    "border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]",
  editorial: "border-[#3B82F6]/25 bg-[#3B82F6]/10 text-[#3B82F6] dark:text-[#60A5FA]",
  experience: "border-[#EC4899]/25 bg-[#EC4899]/10 text-[#EC4899]",
  tips: "border-[#F59E0B]/25 bg-[#F59E0B]/10 text-[#F59E0B]",
  ai: "border-[#22C55E]/25 bg-[#22C55E]/10 text-[#22C55E]",
};

interface Node {
  id: string;
  x: number;
  y: number;
  dist: number;
}

const NODES: Node[] = [
  { id: "A", x: 80, y: 64, dist: 0 },
  { id: "C", x: 320, y: 64, dist: 2 },
  { id: "B", x: 105, y: 186, dist: 3 },
  { id: "D", x: 300, y: 186, dist: 8 },
];

const EDGES: { from: string; to: string; weight: number; onPath?: boolean }[] = [
  { from: "A", to: "C", weight: 2, onPath: true },
  { from: "A", to: "B", weight: 4 },
  { from: "C", to: "B", weight: 1, onPath: true },
  { from: "B", to: "D", weight: 5, onPath: true },
  { from: "C", to: "D", weight: 8 },
];

const nodeById = (id: string) => NODES.find((n) => n.id === id)!;

function HeroVisual() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#8B5CF6]/20 bg-card shadow-[0_20px_60px_-25px_rgba(139,92,246,0.35)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.12),transparent_55%)]" />

      <div className="relative flex items-center justify-between border-b border-border bg-card-hover/60 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#7C3AED] dark:text-[#A78BFA]">
          <Network className="h-3 w-3" />
          Algorithm visualization
        </span>
        <span className="text-[10px] text-text-muted">Shortest path · non-negative weights</span>
      </div>

      <div className="relative p-3 sm:p-4">
        <svg viewBox="0 0 400 250" className="mx-auto w-full max-w-[360px]" role="img" aria-label="Shortest path graph visualization for the article cover">
          {EDGES.map((e) => {
            const f = nodeById(e.from);
            const t = nodeById(e.to);
            const mx = (f.x + t.x) / 2;
            const my = (f.y + t.y) / 2;
            return (
              <g key={`${e.from}${e.to}`}>
                <line
                  x1={f.x}
                  y1={f.y}
                  x2={t.x}
                  y2={t.y}
                  stroke={e.onPath ? "#8B5CF6" : "rgba(139,92,246,0.28)"}
                  strokeWidth={e.onPath ? 3 : 1.5}
                  strokeLinecap="round"
                />
                {e.onPath && (
                  <motion.line
                    x1={f.x}
                    y1={f.y}
                    x2={t.x}
                    y2={t.y}
                    stroke="#C4B5FD"
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeDasharray="6 10"
                    initial={{ opacity: 0.6 }}
                    animate={{ opacity: [0.15, 0.7, 0.15] }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <text
                  x={mx}
                  y={my}
                  textAnchor="middle"
                  className="fill-text-muted"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {e.weight}
                </text>
              </g>
            );
          })}

          {NODES.map((n) => (
            <g key={n.id}>
              {n.dist > 0 && (
                <motion.circle
                  cx={n.x}
                  cy={n.y}
                  r={21}
                  fill="none"
                  stroke="#8B5CF6"
                  strokeWidth={1.5}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.9, 0] }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    delay: n.dist * 0.35,
                    ease: "easeOut",
                  }}
                />
              )}
              <circle
                cx={n.x}
                cy={n.y}
                r={17}
                className="fill-[#1A1F2E] stroke-[#8B5CF6]"
                strokeWidth={2}
              />
              <text
                x={n.x}
                y={n.y + 4}
                textAnchor="middle"
                className="fill-white"
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {n.id}
              </text>
              <text
                x={n.x}
                y={n.y - 27}
                textAnchor="middle"
                className="fill-[#A78BFA]"
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {n.dist === 0 ? "0" : n.dist}
              </text>
            </g>
          ))}
        </svg>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
            Shortest path
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]/40" />
            Other edges
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ArticleHero({
  post,
  liked,
  saved,
  following,
  likeCount,
  commentCount,
  onLike,
  onSave,
  onFollow,
  onShare,
  onJumpToComments,
}: {
  post: FeedPost;
  liked: boolean;
  saved: boolean;
  following: boolean;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
  onSave: () => void;
  onFollow: () => void;
  onShare: () => void;
  onJumpToComments: () => void;
}) {
  return (
    <header className="mt-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[65%_35%]">
        {/* Left — editorial copy */}
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
              TYPE_ACCENT[post.type]
            )}
          >
            {TYPE_LABEL[post.type]}
          </span>

          <h1 className="mt-3 text-[26px] font-bold leading-[1.15] tracking-tight text-text-primary sm:text-[32px] lg:text-[34px]">
            {post.title}
          </h1>
          <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-text-secondary">
            {post.subtitle}
          </p>

          {/* Author row */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-sm font-bold text-white">
              {post.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">{post.author}</p>
              <p className="text-xs text-text-muted">
                {post.handle} · {post.time} · {post.readTime}
              </p>
            </div>
            <button
              type="button"
              onClick={onFollow}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors",
                following
                  ? "border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]"
                  : "border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
              )}
            >
              {following ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {following ? "Following" : "Follow"}
            </button>
          </div>

          {/* Engagement controls */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button
              type="button"
              onClick={onLike}
              className={cn(
                "flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                liked ? "text-[#EF4444]" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-[#EF4444]")} />
              <span className="tabular-nums">{likeCount}</span> Likes
            </button>
            <button
              type="button"
              onClick={onJumpToComments}
              className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="tabular-nums">{commentCount}</span> Comments
            </button>
            <button
              type="button"
              onClick={onSave}
              className={cn(
                "flex items-center gap-1.5 text-[13px] font-medium transition-colors",
                saved ? "text-[#7C3AED]" : "text-text-secondary hover:text-text-primary"
              )}
            >
              <Bookmark className={cn("h-4 w-4", saved && "fill-[#7C3AED]")} />
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={onShare}
              className="flex items-center gap-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          </div>
        </div>

        {/* Right — cover visualization */}
        <div className="min-w-0">
          <HeroVisual />
        </div>
      </div>
    </header>
  );
}

export function StatsStrip({
  post,
  likeCount,
}: {
  post: FeedPost;
  likeCount: number;
}) {
  const stats = [
    { icon: Clock, label: post.readTime },
    { icon: Gauge, label: "Intermediate" },
    { icon: FileCode2, label: "C++" },
    { icon: Network, label: "Graph Algorithms" },
    { icon: BarChart3, label: `${likeCount} likes` },
  ];
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-1 gap-y-2 rounded-xl border border-border bg-card px-4 py-3">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center">
          {i > 0 && <span className="mx-2 h-4 w-px bg-border" />}
          <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary">
            <s.icon className="h-3.5 w-3.5 text-[#8B5CF6]" />
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}