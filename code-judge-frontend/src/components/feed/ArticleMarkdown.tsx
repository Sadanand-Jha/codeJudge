"use client";

import { memo, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/helpers";
import { slugifyHeading } from "./article";
import DijkstraDiagram from "./DijkstraDiagram";

function flattenText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (typeof node === "object" && "props" in node) {
    return flattenText((node as { props: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function ArticleCodeBlock({
  language,
  children,
}: {
  language?: string;
  children: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const code = flattenText(children);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — ignore.
    }
  };

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border bg-[#0B0D10] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
        <span className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-text-muted" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {language || "code"}
          </span>
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
          title="Copy code"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? <span className="text-[9px] font-medium">Copied</span> : null}
        </button>
      </div>
      <pre className="overflow-x-auto p-4">
        <code className="hljs block font-mono text-[12.5px] leading-relaxed text-[#E6E6E6]">
          {children}
        </code>
      </pre>
    </div>
  );
}

/**
 * Editorial markdown renderer for the article reading view: generous
 * typography, section ids for the scroll-spy table of contents, dark
 * syntax-highlighted code blocks, and an optional diagram slot for posts that
 * declare one (`![diagram:kind](#)` in the body).
 */
function ArticleMarkdown({ content }: { content: string }) {
  return (
    <div className="article-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h2: ({ children }) => (
            <h2
              id={slugifyHeading(flattenText(children))}
              className="scroll-mt-28 mb-4 mt-12 text-[22px] font-bold tracking-tight text-text-primary first:mt-0"
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={slugifyHeading(flattenText(children))}
              className="scroll-mt-28 mb-3 mt-8 text-[17px] font-semibold tracking-tight text-text-primary"
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-2 mt-6 text-[15px] font-semibold text-text-primary">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="my-5 text-[15px] leading-[1.85] text-text-secondary first:mt-0">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="my-5 space-y-2.5 pl-1 text-[15px] leading-relaxed marker:text-[#7C3AED]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-5 list-decimal space-y-2.5 pl-6 text-[15px] leading-relaxed marker:font-semibold marker:text-text-muted">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-[1.8] text-text-secondary [&>ul]:my-3 [&>ol]:my-3">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-6 rounded-xl border-l-[3px] border-[#8B5CF6] bg-[#8B5CF6]/[0.06] py-4 pl-5 pr-5 text-[15px] leading-[1.8] text-text-primary dark:bg-[#A78BFA]/[0.08]">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-10 border-border" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7C3AED] underline underline-offset-4 transition-colors hover:text-[#8B5CF6] dark:text-[#A78BFA]"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-text-secondary">{children}</em>,
          del: ({ children }) => <del className="text-text-muted line-through">{children}</del>,
          img: ({ src, alt }) => {
            if (alt === "diagram:dijkstra") return <DijkstraDiagram />;
            return (
              <img src={src} alt={alt} className="my-6 max-w-full rounded-xl border border-border" />
            );
          },
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || "");
            if (match) {
              return <ArticleCodeBlock language={match[1]}>{children}</ArticleCodeBlock>;
            }
            return (
              <code
                className={cn(
                  "rounded-md border border-border bg-card-hover px-1.5 py-0.5 font-mono text-[0.85em] text-[#7C3AED] dark:border-[#292235]/60 dark:bg-white/[0.05] dark:text-[#A78BFA]"
                )}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[420px] border-collapse text-left text-[13px]">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-card-hover">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border last:border-b-0">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-4 py-2.5 font-semibold text-text-primary">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 align-top text-text-secondary">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default memo(ArticleMarkdown, (prev, next) => prev.content === next.content);