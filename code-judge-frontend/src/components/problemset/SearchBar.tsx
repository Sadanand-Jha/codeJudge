"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative group mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/5 via-transparent to-[#3B82F6]/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
      <div className="relative flex items-center bg-[#111827] border border-white/[0.06] rounded-2xl px-4 py-3 group-focus-within:border-[#7C3AED]/40 group-focus-within:shadow-[0_0_20px_rgba(124,58,237,0.08)] transition-all">
        <Search className="w-5 h-5 text-[#6B7280] shrink-0" />
        <input
          type="text"
          placeholder="Search problems by title, tags or ID..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-[#6B7280] ml-3"
        />
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-[#9CA3AF] bg-white/[0.04] border border-white/[0.06] rounded-lg">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </div>
    </div>
  );
}