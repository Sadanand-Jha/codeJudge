import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { FeedPost } from "@/data/developerFeed";

/**
 * Compact related-post card used in the "You might also like" section,
 * matching the Developer Feed card language.
 */
export default function RelatedPostCard({ post }: { post: FeedPost }) {
  return (
    <Link
      href={`/feed/${post.id}`}
      className="group rounded-2xl border border-border bg-card p-4 transition-colors hover:border-border-hover"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="px-2 py-0.5 rounded-md bg-[#7C3AED]/10 border border-[#7C3AED]/25 text-[10px] text-[#7C3AED] capitalize">
          {post.type}
        </span>
        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground transition-all group-hover:text-[#7C3AED] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <h4 className="text-sm font-semibold text-white leading-snug mb-1.5 line-clamp-2 transition-colors group-hover:text-[#7C3AED]">
        {post.title}
      </h4>
      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3">
        {post.preview}
      </p>
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED]/60 to-[#3B82F6]/60 flex items-center justify-center text-white text-[10px] font-bold">
          {post.avatar}
        </div>
        <span className="text-[11px] text-muted-foreground">
          {post.author}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {post.readTime}
        </span>
      </div>
    </Link>
  );
}