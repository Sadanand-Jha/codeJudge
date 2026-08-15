"use client";

import { useCallback, useRef, useState } from "react";
import { Heart, MessageSquare, Send } from "lucide-react";
import { cn } from "@/lib/helpers";
import {
  defaultComments,
  type ArticleComment,
  type FeedPost,
} from "@/data/developerFeed";

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center text-white font-bold",
        size === "sm" && "w-6 h-6 text-[10px]",
        size === "md" && "w-9 h-9 text-xs",
        size === "lg" && "w-10 h-10 text-sm"
      )}
    >
      {initials}
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  onToggleReply,
  replyOpen,
}: {
  comment: ArticleComment;
  onReply: (commentId: string, text: string) => void;
  onToggleReply: (commentId: string) => void;
  replyOpen: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [replyText, setReplyText] = useState("");

  const submit = () => {
    const text = replyText.trim();
    if (!text) return;
    onReply(comment.id, text);
    setReplyText("");
    onToggleReply(comment.id);
  };

  return (
    <div>
      <div className="flex gap-3">
        <Avatar initials={comment.avatar} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[13px] font-semibold text-text-primary">{comment.author}</span>
            <span className="text-[11px] text-text-muted">{comment.handle}</span>
            <span className="text-[11px] text-text-muted">· {comment.time}</span>
          </div>
          <p className="mt-1 text-[13.5px] leading-relaxed text-text-secondary">{comment.text}</p>
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setLiked((v) => !v)}
              className={cn(
                "flex items-center gap-1 text-[11px] text-text-muted transition-colors hover:text-[#EF4444]",
                liked && "text-[#EF4444]"
              )}
            >
              <Heart className={cn("h-3 w-3", liked && "fill-[#EF4444]")} />
              {comment.likes + (liked ? 1 : 0)}
            </button>
            <button
              type="button"
              onClick={() => onToggleReply(comment.id)}
              className="flex items-center gap-1 text-[11px] text-text-muted transition-colors hover:text-text-primary"
            >
              <MessageSquare className="h-3 w-3" />
              Reply
            </button>
          </div>

          {replyOpen && (
            <div className="mt-3 flex items-center gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={`Reply to ${comment.author.split(" ")[0]}…`}
                className="min-w-0 flex-1 rounded-lg border border-input-border bg-input-bg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-[#7C3AED] focus:outline-none"
              />
              <button
                type="button"
                onClick={submit}
                disabled={!replyText.trim()}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7C3AED] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Post reply"
              >
                <Send className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-4 space-y-4 border-l border-border pl-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="flex gap-3">
              <Avatar initials={reply.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13px] font-semibold text-text-primary">{reply.author}</span>
                  <span className="text-[11px] text-text-muted">{reply.handle}</span>
                  <span className="text-[11px] text-text-muted">· {reply.time}</span>
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-text-secondary">{reply.text}</p>
                <div className="mt-2 flex items-center gap-4">
                  <span className="flex items-center gap-1 text-[11px] text-text-muted">
                    <Heart className="h-3 w-3" />
                    {reply.likes}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-text-muted">
                    <MessageSquare className="h-3 w-3" />
                    Reply
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Substantial discussion section: header, large comment input, nested replies.
 */
export default function CommentsSection({ post }: { post: FeedPost }) {
  const [comments, setComments] = useState<ArticleComment[]>(defaultComments);
  const [commentText, setCommentText] = useState("");
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  const addComment = useCallback(() => {
    const text = commentText.trim();
    if (!text) return;
    setComments((prev) => [
      {
        id: `local-${Date.now()}`,
        author: "You",
        handle: "@you",
        avatar: "YU",
        time: "just now",
        text,
        likes: 0,
      },
      ...prev,
    ]);
    setCommentText("");
  }, [commentText]);

  const addReply = useCallback((commentId: string, text: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              replies: [
                ...(c.replies ?? []),
                {
                  id: `local-${Date.now()}`,
                  author: "You",
                  handle: "@you",
                  avatar: "YU",
                  time: "just now",
                  text,
                  likes: 0,
                },
              ],
            }
          : c
      )
    );
  }, []);

  const liveCount = post.comments + Math.max(0, comments.length - defaultComments.length);

  return (
    <section
      id="comments"
      ref={sectionRef}
      className="scroll-mt-28"
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-lg font-bold tracking-tight text-text-primary">Discussion</h2>
        <span className="rounded-full border border-[#8B5CF6]/25 bg-[#8B5CF6]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#7C3AED] dark:text-[#A78BFA]">
          {liveCount} comments
        </span>
      </div>

      {/* Comment input */}
      <div className="mt-5 flex gap-3">
        <Avatar initials="YU" size="md" />
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[13px] font-semibold text-text-primary">
            What did you think about this explanation?
          </p>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={3}
            placeholder="Write a comment…"
            className="w-full resize-none rounded-xl border border-input-border bg-input-bg px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-[#7C3AED] focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={addComment}
              disabled={!commentText.trim()}
              className="rounded-lg bg-[#7C3AED] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Post Comment
            </button>
          </div>
        </div>
      </div>

      {/* Comment list */}
      <div className="mt-8 space-y-6">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            replyOpen={replyOpenId === comment.id}
            onReply={addReply}
            onToggleReply={(id) => setReplyOpenId((cur) => (cur === id ? null : id))}
          />
        ))}
      </div>
    </section>
  );
}