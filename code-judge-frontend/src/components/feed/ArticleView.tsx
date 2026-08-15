"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bookmark, Heart, MessageSquare, MoreHorizontal, Share2 } from "lucide-react";
import { cn } from "@/lib/helpers";
import { toast } from "@/lib/toast";
import type { FeedPost } from "@/data/developerFeed";
import { getArticleToc } from "./article";
import AdBanner from "./AdBanner";
import ArticleHero, { StatsStrip } from "./ArticleHero";
import ArticleToc from "./ArticleToc";
import ArticleLeftRail from "./ArticleLeftRail";
import ArticleSidebar from "./ArticleSidebar";
import RichArticleContent from "./RichArticleContent";
import AuthorCard from "./AuthorCard";
import CommentsSection from "./CommentsSection";
import ContinueReading from "./ContinueReading";

const EngagementButton = ({
  active,
  activeClass,
  icon,
  label,
  count,
  onClick,
  title,
}: {
  active?: boolean;
  activeClass?: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  onClick: () => void;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={cn(
      "flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary",
      active && activeClass
    )}
  >
    {icon}
    {label}
    {typeof count === "number" && <span className="tabular-nums">{count}</span>}
  </button>
);

export default function ArticleView({
  post,
  related,
}: {
  post: FeedPost;
  related: FeedPost[];
}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const likeCount = post.likes + (liked ? 1 : 0);
  const commentCount = post.comments;

  const toc = useMemo(() => getArticleToc(post), [post]);

  const share = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Link copied to clipboard"))
      .catch(() => toast.error("Could not copy the link"));
  }, []);

  const scrollToComments = useCallback(() => {
    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToHeading = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Scroll-spy: keep the active "In this article" item in sync with the
  // section currently near the top of the viewport.
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );
    toc.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [toc]);

  const engagementProps = {
    liked,
    saved,
    following,
    likeCount,
    commentCount,
    onLike: () => setLiked((v) => !v),
    onSave: () => setSaved((v) => !v),
    onFollow: () => setFollowing((v) => !v),
    onShare: share,
    onJumpToComments: scrollToComments,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 lg:pb-16">
        {/* ===== Compact article nav row ===== */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-[#7C3AED] dark:hover:text-[#A78BFA]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Developer Feed
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={share}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setSaved((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                saved
                  ? "border-[#8B5CF6]/30 bg-[#8B5CF6]/10 text-[#7C3AED] dark:text-[#A78BFA]"
                  : "border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary"
              )}
            >
              <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-[#7C3AED]")} />
              {saved ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border bg-card text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary"
              aria-label="More options"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* ===== Hero ===== */}
        <ArticleHero post={post} {...engagementProps} />

        {/* ===== Stats strip ===== */}
        <StatsStrip post={post} likeCount={likeCount} />

        {/* ===== Full-width editorial grid: left rail | article | right ad+context ===== */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[22%_minmax(0,1fr)] lg:grid-cols-[18%_minmax(0,1fr)_25%] xl:gap-7">
          {/* Left rail — navigation + progress + info (tablet & desktop) */}
          <div className="hidden md:block">
            <ArticleLeftRail post={post} toc={toc} activeId={activeId} onNavigate={scrollToHeading} />
          </div>

          {/* Center — article */}
          <article className="min-w-0">
            {/* Mobile / tablet TOC dropdown */}
            <div className="md:hidden">
              <ArticleToc toc={toc} activeId={activeId} onNavigate={scrollToHeading} variant="dropdown" />
            </div>

            <RichArticleContent post={post} />

            <div className="mt-10">
              <AuthorCard post={post} {...engagementProps} />
            </div>

            <div className="mt-10">
              <CommentsSection post={post} />
            </div>
          </article>

          {/* Right column — sticky ad + contextual cards (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-[4.5rem] max-h-[calc(100vh-6rem)] space-y-4 overflow-y-auto pb-4">
              <AdBanner />
              <ArticleSidebar post={post} following={following} onToggleFollow={() => setFollowing((v) => !v)} />
            </div>
          </aside>
        </div>

        {/* Advertisement + sidebar (tablet & mobile, below the article) */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
          <AdBanner />
          <ArticleSidebar post={post} following={following} onToggleFollow={() => setFollowing((v) => !v)} />
        </div>

        {/* ===== Continue reading ===== */}
        <ContinueReading related={related} />
      </div>

      {/* ===== Mobile bottom engagement bar ===== */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-2.5 backdrop-blur md:hidden">
        <div className="flex items-center justify-around">
          <EngagementButton
            active={liked}
            activeClass="text-[#EF4444]"
            icon={<Heart className={cn("h-4 w-4", liked && "fill-[#EF4444]")} />}
            label="Like"
            count={likeCount}
            onClick={() => setLiked((v) => !v)}
            title={liked ? "Unlike" : "Like"}
          />
          <EngagementButton
            icon={<MessageSquare className="h-4 w-4" />}
            label="Comment"
            count={commentCount}
            onClick={scrollToComments}
            title="Jump to comments"
          />
          <EngagementButton
            active={saved}
            activeClass="text-[#7C3AED]"
            icon={<Bookmark className={cn("h-4 w-4", saved && "fill-[#7C3AED]")} />}
            label="Save"
            onClick={() => setSaved((v) => !v)}
            title={saved ? "Remove from saved" : "Save"}
          />
          <EngagementButton
            icon={<Share2 className="h-4 w-4" />}
            label="Share"
            onClick={share}
            title="Copy link"
          />
        </div>
      </div>
    </div>
  );
}