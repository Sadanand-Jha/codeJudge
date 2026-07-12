"use client";

import { memo } from "react";

interface EditorFooterProps {
  cursorPosition: string;
  languageLabel: string;
}

function EditorFooter({ cursorPosition, languageLabel }: EditorFooterProps) {
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between px-4 text-[12px] bg-[#1e1e1e] text-[#90908A] border-t border-[#111]">
      <div>{cursorPosition}</div>
      <div className="flex gap-6">
        <span>Spaces: 4</span>
        <span>{languageLabel}</span>
      </div>
    </footer>
  );
}

export default memo(EditorFooter);
