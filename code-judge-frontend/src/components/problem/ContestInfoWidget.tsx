"use client";

import SidebarWidget from "./SidebarWidget";

interface ContestInfoWidgetProps {
  contestName?: string | null;
  contestId?: string | null;
  status?: "finished" | "practice";
}

/**
 * Contest Info sidebar widget.
 * Displays contest name, status (Finished/Practice), and a star icon.
 */
export default function ContestInfoWidget({
  contestName,
  contestId,
  status = "practice",
}: ContestInfoWidgetProps) {
  const displayName = contestName || (contestId ? `Contest ${contestId}` : null);

  if (!displayName) return null;

  return (
    <SidebarWidget title="Contest">
      <div className="text-center">
        <div className="mb-1 text-sm font-medium text-[#333]">
          {displayName}
        </div>
        <div className="mb-1">
          {status === "finished" ? (
            <span className="text-xs font-semibold text-[#16A34A]">Finished</span>
          ) : (
            <span className="text-xs font-semibold text-[#2563EB]">Practice</span>
          )}
        </div>
        <div className="text-[#E6A817] text-sm">★</div>
      </div>
    </SidebarWidget>
  );
}