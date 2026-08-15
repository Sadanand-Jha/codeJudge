import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AppLayout from "@/components/layout/AppLayout";
import ArticleView from "@/components/feed/ArticleView";
import { feedPosts, getFeedPostById, getRelatedPosts } from "@/data/developerFeed";

export function generateStaticParams() {
  return feedPosts.map((p) => ({ postId: String(p.id) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ postId: string }>;
}): Promise<Metadata> {
  const { postId } = await params;
  const post = getFeedPostById(postId);
  if (!post) return { title: "Article not found" };
  return {
    title: `${post.title} — ByteClash`,
    description: post.subtitle,
  };
}

export default async function FeedArticlePage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const post = getFeedPostById(postId);
  if (!post) notFound();

  return (
    <AppLayout>
      <ArticleView post={post} related={getRelatedPosts(post)} />
    </AppLayout>
  );
}