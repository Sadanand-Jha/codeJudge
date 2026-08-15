"use client";

import { memo } from "react";
import type { FeedPost } from "@/data/developerFeed";
import {
  slugifyHeading,
  splitMarkdownSections,
  stripDiagramLine,
} from "./article";
import ArticleMarkdown from "./ArticleMarkdown";
import StepByStepVisualizer from "./StepByStepVisualizer";
import {
  ComplexityCard,
  ConceptCards,
  IntuitionCallout,
  MentalModel,
  MistakeGrid,
  SectionHeading,
  StepExample,
  Takeaway,
  VisualIntuition,
  WhyLineMatters,
} from "./ContentBlocks";

const WHY_LINE_ID = slugifyHeading("Why if (d != dist[u]) continue;");

/**
 * Curated renderer for the featured Dijkstra article: the markdown body is
 * split into sections and each well-known section is decorated with a rich
 * visual component (concept cards, mental model, step example, complexity
 * panel, mistake grid, takeaway…). Prose that doesn't map to a visual block is
 * rendered through the standard editorial markdown renderer. All other posts
 * fall back to a plain editorial rendering of their body.
 */
function RichArticleContent({ post }: { post: FeedPost }) {
  if (post.id !== 1) {
    return <ArticleMarkdown content={post.body} />;
  }

  const { lead, sections } = splitMarkdownSections(post.body);

  const renderSection = (
    heading: string,
    render: () => React.ReactNode,
    id?: string
  ) => {
    const sid = id ?? slugifyHeading(heading);
    return (
      <div key={sid}>
        <SectionHeading id={sid} label={heading} />
        <div className="mt-4">{render()}</div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {/* Introduction */}
      <div id="introduction" className="scroll-mt-28">
        <ArticleMarkdown content={lead} />
        <IntuitionCallout />
      </div>

      {/* Section 7 — visual algorithm card (before The Core Idea) */}
      <StepByStepVisualizer />

      {/* Curated sections */}
      {sections.map((section) => {
        const h = section.heading.trim();

        if (h === "The Core Idea") {
          return renderSection(h, () => (
            <>
              <ArticleMarkdown content={section.content} />
              <ConceptCards />
            </>
          ));
        }

        if (h === "A mental model" || h === "Mental Model") {
          return renderSection("Mental Model", () => <MentalModel />, "a-mental-model");
        }

        if (h === "Step-by-Step Example") {
          return renderSection(h, () => (
            <>
              <ArticleMarkdown content={section.content} />
              <StepExample />
            </>
          ));
        }

        if (h === "Implementation") {
          return renderSection(h, () => (
            <>
              <ArticleMarkdown content={section.content} />
              <div id={WHY_LINE_ID} className="scroll-mt-28">
                <WhyLineMatters />
              </div>
            </>
          ));
        }

        if (h === "Complexity") {
          return renderSection(h, () => <ComplexityCard />);
        }

        if (h === "Visual Intuition") {
          return renderSection(h, () => (
            <>
              <ArticleMarkdown content={stripDiagramLine(section.content)} />
              <VisualIntuition />
            </>
          ));
        }

        if (h === "Common Mistakes") {
          return renderSection(h, () => <MistakeGrid />);
        }

        if (h === "Final Takeaway") {
          return renderSection(h, () => <Takeaway />);
        }

        // Fallback: plain editorial section.
        return renderSection(h, () => <ArticleMarkdown content={section.content} />);
      })}
    </div>
  );
}

export default memo(RichArticleContent, (prev, next) => prev.post === next.post);