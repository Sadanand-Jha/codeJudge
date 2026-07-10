"use client";

import type { LanguageOption } from "@/types/editor";

interface LanguageSelectorProps {
  languageId: number;
  options: LanguageOption[];
  onChange: (id: number) => void;
}

export default function LanguageSelector({ languageId, options, onChange }: LanguageSelectorProps) {
  return (
    <select
      value={languageId}
      onChange={(e) => onChange(Number(e.target.value))}
      className="bg-transparent outline-none hover:text-white cursor-pointer"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">
          {opt.label}
        </option>
      ))}
    </select>
  );
}