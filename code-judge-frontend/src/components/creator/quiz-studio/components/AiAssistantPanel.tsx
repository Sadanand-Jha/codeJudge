"use client";

import { useState } from "react";
import {
  Sparkles,
  Check,
  X,
  Loader2,
  Lightbulb,
  HelpCircle,
  Smile,
  Send,
} from "lucide-react";
import { cn } from "@/lib/helpers";
import { useStudio } from "../StudioProvider";
import type { CreatorQuestion } from "../types";

const AI_ACTIONS = [
  { id: "explain", icon: BookIcon, label: "Generate Explanation", desc: "AI explains the correct answer." },
  { id: "distractors", icon: SparkleIcon, label: "Generate Distractors", desc: "Suggest stronger wrong options." },
  { id: "improve", icon: PenIcon, label: "Improve Question", desc: "Rewrite for clarity." },
  { id: "hint", icon: Lightbulb, label: "Generate Hint", desc: "A scaffolded hint." },
  { id: "solution", icon: SolutionIcon, label: "Generate Solution", desc: "Step-by-step solution." },
  { id: "translate", icon: TranslateIcon, label: "Translate", desc: "Translate to another language." },
] as const;

const SAMPLE_SUGGESTIONS: Record<string, string> = {
  explain:
    "The correct option is B because the derivative of the composite function follows the chain rule, yielding 3·(2x+1)². Option A misses the inner derivative, while C and D apply power rule incorrectly.",
  distractors:
    "Strong distractors: (A) 2(2x+1) — drops the outer derivative; (C) 6x — only the linear term; (D) 3(2x+1)² + 1 — adds a spurious constant.",
  improve:
    "Rewritten: 'If f(x) = (2x+1)³, which expression gives f'(x)?' — clearer, single-sentence stem.",
  hint:
    "Hint: Apply the chain rule. Identify the outer function (cubing) and the inner function (linear).",
  solution:
    "Step 1: Let u = 2x+1, so f = u³. Step 2: df/dx = 3u²·du/dx = 3(2x+1)²·2 = 6(2x+1)². Hence B.",
  translate:
    "Translated: '[...]' — let me know the target language.",
};

function BookIcon({ className }: { className?: string }) {
  return <Lightbulb className={className} />;
}
function SparkleIcon({ className }: { className?: string }) {
  return <Sparkles className={className} />;
}
function PenIcon({ className }: { className?: string }) {
  return <HelpCircle className={className} />;
}
function SolutionIcon({ className }: { className?: string }) {
  return <Send className={className} />;
}
function TranslateIcon({ className }: { className?: string }) {
  return <Smile className={className} />;
}

export interface Suggestion {
  field: "explanation" | "hint" | "solution";
  text: string;
}

export function AiAssistantPanel({
  question,
  onApplySuggestion,
}: {
  question: CreatorQuestion;
  onApplySuggestion?: (s: Suggestion) => void;
}) {
  const { state } = useStudio();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const run = (id: string) => {
    setWorking(id);
    setSuggestion(null);
    setTimeout(() => {
      const text =
        SAMPLE_SUGGESTIONS[id] ?? "No suggestion generated.";
      const field =
        id === "explain"
          ? "explanation"
          : id === "hint"
          ? "hint"
          : id === "solution"
          ? "solution"
          : "explanation";
      setSuggestion({ field, text });
      setWorking(null);
    }, 700);
  };

  const apply = () => {
    if (suggestion) {
      onApplySuggestion?.(suggestion);
      setSuggestion(null);
    }
  };

  return (
    <div data-sidebar="true" className="flex shrink-0 flex-col border-l border-border bg-card/50">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            AI Assistant
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-border p-1 text-xs text-text-secondary hover:text-text-primary"
        >
          {open ? <X className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        </button>
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="mb-2 text-[10px] font-medium text-text-secondary">
            Credits: {state.branding.certificateEnabled ? 842 : 842} / 1000
          </div>
          {AI_ACTIONS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => run(a.id)}
              disabled={!!working}
              className="w-full text-left rounded-xl border border-border p-2.5 text-left transition-colors hover:border-indigo-500/30 hover:bg-card-hover"
            >
              <div className="flex items-start gap-2">
                <a.icon className="mt-0.5 h-4 w-4 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold text-text-primary">{a.label}</p>
                  <p className="text-[10px] text-text-secondary">{a.desc}</p>
                </div>
              </div>
            </button>
          ))}

          {working && (
            <div className="flex items-center gap-2 rounded-xl border border-border p-3 text-xs text-text-secondary">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
              Generating…
            </div>
          )}

          {suggestion && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3">
              <p className="text-[10px] font-bold uppercase text-indigo-500">
                Suggested {suggestion.field}
              </p>
              <p className="mt-1 text-xs text-text-primary line-clamp-4">
                {suggestion.text}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={apply}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-500"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  className="rounded-lg border border-border px-2.5 py-1 text-[10px] font-semibold text-text-secondary"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
