"use client";

import type { LanguageOption } from "@/types/editor";
import { CP_LANGUAGE_OPTIONS } from "@/constants/languages";

interface LanguageSelectorProps {
  languageId: number;
  options?: LanguageOption[];
  onChange: (id: number) => void;
}

export default function LanguageSelector({ languageId, options, onChange }: LanguageSelectorProps) {
  // Use CP_LANGUAGE_OPTIONS if no custom options provided
  const languageOptions = options || CP_LANGUAGE_OPTIONS;

  return (
    <div className="relative">
      <select
        value={languageId}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none bg-[#252525] hover:bg-[#2d2d2d] text-gray-200 text-xs font-medium px-3 py-1.5 pr-8 rounded border border-[#333] hover:border-[#444] outline-none focus:border-blue-500 transition-all cursor-pointer min-w-[140px]"
      >
        {languageOptions.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1a1a1a] text-gray-200">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-3 h-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
