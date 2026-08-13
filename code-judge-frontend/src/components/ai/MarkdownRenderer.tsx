"use client";

import { memo, useState, type ReactNode, type Ref } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/helpers";

function flattenText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (typeof node === "object" && "props" in node) {
    return flattenText((node as { props: { children?: ReactNode } }).props?.children);
  }
  return "";
}

function CodeBlock({
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
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-card">
      <div data-copy-skip className="flex items-center justify-between border-b border-border bg-card-hover px-3 py-1.5">
        <span className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-text-muted" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {language || "code"}
          </span>
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-text-muted transition-colors hover:bg-card hover:text-text-primary"
          title="Copy code"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
          {copied ? <span className="text-[9px] font-medium">Copied</span> : null}
        </button>
      </div>
      <pre className="overflow-x-auto p-3">
        <code className="hljs block font-mono text-[12px] leading-relaxed text-text-primary">
          {children}
        </code>
      </pre>
    </div>
  );
}

function MarkdownRenderer({
  content,
  ref,
}: {
  content: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className="markdown-body text-[13px] leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-5 text-[18px] font-bold text-text-primary first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1.5 mt-4 text-[16px] font-bold text-text-primary first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-[15px] font-bold text-text-primary first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1.5 mt-3 text-[14px] font-semibold text-text-primary first:mt-0">{children}</h4>
          ),
          h5: ({ children }) => (
            <h5 className="mb-1.5 mt-3 text-[13px] font-semibold text-text-primary first:mt-0">{children}</h5>
          ),
          h6: ({ children }) => (
            <h6 className="mb-1.5 mt-3 text-[12px] font-semibold uppercase tracking-wide text-text-muted first:mt-0">{children}</h6>
          ),
          p: ({ children }) => <p className="my-1.5 leading-relaxed text-text-primary">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-1.5 ml-5 list-disc space-y-0.5 marker:text-text-muted">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-1.5 ml-5 list-decimal space-y-0.5 marker:text-text-muted">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="my-0.5 leading-relaxed text-text-primary [&>ul]:my-1 [&>ol]:my-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 rounded-r-lg border-l-[3px] border-accent bg-card-hover/40 py-1 pl-3 pr-2 text-text-secondary">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-border" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent-secondary"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          del: ({ children }) => <del className="text-text-muted line-through">{children}</del>,
          img: ({ src, alt }) => <img src={src} alt={alt} className="my-3 max-w-full rounded-lg" />,
          code: ({ className, children }) => {
            const match = /language-(\w+)/.exec(className || "");
            if (match) {
              return <CodeBlock language={match[1]}>{children}</CodeBlock>;
            }
            return (
              <code
                className={cn(
                  "rounded border border-border bg-card-hover px-1.5 py-0.5 font-mono text-[11px] text-accent"
                )}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[420px] border-collapse text-left text-[12px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-card-hover">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border last:border-b-0 hover:bg-card-hover/40">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 font-semibold text-text-primary">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border px-3 py-2 align-top text-text-secondary">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Memoised so unaffected messages aren't re-tokenised/re-highlighted whenever a
// new chunk lands on a different (still-streaming) message. Compared on content
// only: the inline `ref` callback it receives is recreated every render and
// would otherwise defeat a default shallow-compare memo.
export default memo(MarkdownRenderer, (prev, next) => prev.content === next.content);
