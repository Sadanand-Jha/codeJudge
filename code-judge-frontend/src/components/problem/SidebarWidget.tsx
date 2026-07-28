"use client";

import { ReactNode } from "react";

interface SidebarWidgetProps {
  title: string;
  children: ReactNode;
}

/**
 * Reusable Codeforces-style sidebar widget card.
 * - Header: very light gray background, blue text, arrow icon (→)
 * - Body: white background
 * - Thin gray border encompassing the whole widget
 */
export default function SidebarWidget({ title, children }: SidebarWidgetProps) {
  return (
    <div className="border border-[#E6E7EB] rounded-sm overflow-hidden">
      <div className="bg-[#F4F4F4] px-3 py-2 text-sm text-[#2563EB] font-medium">
        <span className="mr-1">→</span>
        {title}
      </div>
      <div className="bg-white px-3 py-3 text-sm text-[#333]">
        {children}
      </div>
    </div>
  );
}