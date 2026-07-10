"use client";

import { Play } from "lucide-react";

interface RunButtonProps {
  onClick: () => void;
  isCompiling: boolean;
}

export default function RunButton({ onClick, isCompiling }: RunButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={isCompiling}
      className="flex items-center gap-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-[#A6E22E] hover:text-white px-3 py-1 rounded text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Play size={14} fill="currentColor" />
      <span>{isCompiling ? "Running..." : "Run"}</span>
    </button>
  );
}