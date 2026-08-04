"use client";

import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="relative group mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-accent-secondary/5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
      <div className="relative flex items-center bg-card border border-border rounded-2xl px-4 py-3 group-focus-within:border-accent/40 group-focus-within:shadow-[0_0_20px_rgba(37,99,235,0.08)] transition-all">
        <Search className="w-5 h-5 text-text-secondary shrink-0" />
        <input
          type="text"
          placeholder="Search problems by title, tags or ID..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder-text-secondary ml-3"
        />
        <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-text-secondary bg-card-hover border border-border rounded-lg">
          <span className="text-[9px]">⌘</span>K
        </kbd>
      </div>
    </div>
  );
}