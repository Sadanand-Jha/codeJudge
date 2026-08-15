"use client";

import { memo } from "react";
import type { LanguageOption } from "@/types/editor";
import LanguageSelector from "./LanguageSelector";
import RunButton from "./RunButton";
import SubmitButton from "./SubmitButton";
import AskAIButton from "./AskAIButton";

interface EditorHeaderProps {
  languageId: number;
  options: LanguageOption[];
  onLanguageChange: (id: number) => void;
  onRun: () => void;
  isCompiling: boolean;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  onAskAI?: () => void;
  isAskingAI?: boolean;
}

function EditorHeader({
  languageId,
  options,
  onLanguageChange,
  onRun,
  isCompiling,
  onSubmit,
  isSubmitting = false,
  onAskAI,
  isAskingAI = false,
}: EditorHeaderProps) {
  return (
    <header className="flex h-10 min-w-0 w-full shrink-0 items-center justify-between px-3 text-[13px] border-b border-[#222] bg-[#1a1a1a]">
      <div className="flex min-w-0 items-center gap-4 text-[12px]">
        <LanguageSelector
          languageId={languageId}
          options={options}
          onChange={onLanguageChange}
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {onSubmit && <SubmitButton onClick={onSubmit} isSubmitting={isSubmitting} />}
        {onAskAI && (
          <AskAIButton onClick={onAskAI} disabled={isAskingAI || isCompiling} />
        )}
        <RunButton onClick={onRun} isCompiling={isCompiling} />
      </div>
    </header>
  );
}

export default memo(EditorHeader);
