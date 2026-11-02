import { cn } from "@/lib/helpers";

const INLINE_PATTERN = /(```[^`]+```|\*[^*\n]+\*|_[^_\n]+_|https?:\/\/[^\s]+)/g;

function renderInline(line: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_PATTERN.lastIndex = 0;

  while ((match = INLINE_PATTERN.exec(line))) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${match.index}`;

    if (token.startsWith("```")) {
      parts.push(
        <code key={key} className="rounded bg-black/10 px-1 py-px font-mono text-[12.5px] dark:bg-white/15">
          {token.slice(3, -3)}
        </code>
      );
    } else if (token.startsWith("*")) {
      parts.push(<strong key={key}>{token.slice(1, -1)}</strong>);
    } else if (token.startsWith("_")) {
      parts.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      parts.push(
        <span key={key} className="break-words text-[#027eb5] underline decoration-1 underline-offset-2 dark:text-[#53bdeb]">
          {token}
        </span>
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}

/** WhatsApp-style formatting for *bold*, _italic_, ```mono``` and links. */
export function WhatsAppText({ text }: { text: string }) {
  return (
    <span className="block">
      {text.split("\n").map((line, index) => {
        const quote = line.startsWith("> ");
        const content = quote ? line.slice(2) : line;
        return (
          <span
            key={index}
            className={cn("block", quote && "my-0.5 border-l-[3px] border-[#8696a0] pl-2")}
          >
            {content ? renderInline(content, String(index)) : "\u00A0"}
          </span>
        );
      })}
    </span>
  );
}
