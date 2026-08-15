"use client";

import Link from "next/link";
import {
  Bookmark,
  Check,
  Heart,
  MessageSquare,
  Share2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import type { FeedPost } from "@/data/developerFeed";

/**
 * Large author + engagement card at the end of the article.
 */
export default function AuthorCard({
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
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="h-1.5 bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#3B82F6]" />
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] text-xl font-black text-white">
          {post.avatar}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-text-primary">{post.author}</p>
          <p className="text-xs text-text-muted">{post.handle} · Algorithm enthusiast &amp; competitive programmer</p>
          <p className="mt-1.5 max-w-[520px] text-[13px] leading-relaxed text-text-secondary">
            I write visual deep-dives on algorithms and data structures. When I&apos;m
            not teaching shortest paths, I&apos;m on the leaderboard grinding.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:w-40">
          <button
            type="button"
            onClick={onFollow}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-colors",
              following
                ? "border-[#8B5CF6]/25 bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]"
                : "border-[#7C3AED] bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            )}
          >
            {following ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            {following ? "Following" : "Follow"}
          </button>
          <Link
            href="/profile"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-bold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
          >
            View Profile
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-card-hover/40 px-5 py-3">
        <button
          type="button"
          onClick={onLike}
          className={cn(
            "flex items-center gap-1.5 text-[13px] font-semibold transition-colors",
            liked ? "text-[#EF4444]" : "text-text-secondary hover:text-text-primary"
          )}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-[#EF4444]")} />
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={onJumpToComments}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="tabular-nums">{commentCount}</span>
        </button>
        <button
          type="button"
          onClick={onSave}
          className={cn(
            "flex items-center gap-1.5 text-[13px] font-semibold transition-colors",
            saved ? "text-[#7C3AED]" : "text-text-secondary hover:text-text-primary"
          )}
        >
          <Bookmark className={cn("h-4 w-4", saved && "fill-[#7C3AED]")} />
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={onShare}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-text-secondary transition-colors hover:text-text-primary"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </div>
  );
}