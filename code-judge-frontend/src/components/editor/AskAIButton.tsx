"use client";

import { Sparkles } from "lucide-react";

interface AskAIButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function AskAIButton({ onClick, disabled }: AskAIButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:brightness-110 text-white px-3 py-1 rounded text-[12px] font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      title="Ask AI about the current file"
      aria-label="Ask AI about the current file"
    >
      <Sparkles size={14} />
      <span>Ask AI</span>
    </button>
  );
}
