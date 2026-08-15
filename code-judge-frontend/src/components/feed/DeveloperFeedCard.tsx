import Link from "next/link";
import { Heart, MessageSquare, BookOpen, Share2 } from "lucide-react";
import type { FeedPost } from "@/data/developerFeed";

/**
 * Developer Feed post card. The entire card is a link to the full article —
 * clicking anywhere on it opens the reading view while preserving the post
 * via its id in the URL (browser back works naturally).
 */
export default function DeveloperFeedCard({ post }: { post: FeedPost }) {
  return (
    <Link
      href={`/feed/${post.id}`}
      className="group block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-border-hover"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold">
            {post.avatar}
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{post.author}</p>
            <p className="text-[11px] text-muted-foreground">{post.time}</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-border-hover text-[10px] text-muted-foreground capitalize">
          {post.type}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-white mb-2 transition-colors group-hover:text-[#7C3AED]">
        {post.title}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {post.preview}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-border-hover text-[10px] text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="flex items-center gap-1.5 text-[11px] transition-colors group-hover:text-[#EF4444]">
          <Heart className="w-3.5 h-3.5" />
          {post.likes}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] transition-colors group-hover:text-[#3B82F6]">
          <MessageSquare className="w-3.5 h-3.5" />
          {post.comments}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] transition-colors group-hover:text-[#7C3AED]">
          <BookOpen className="w-3.5 h-3.5" />
          Save
        </span>
        <span className="flex items-center gap-1.5 text-[11px] transition-colors group-hover:text-white ml-auto">
          <Share2 className="w-3.5 h-3.5" />
          Share
        </span>
      </div>
    </Link>
  );
}
