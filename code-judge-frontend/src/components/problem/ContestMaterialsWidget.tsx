"use client";

import SidebarWidget from "./SidebarWidget";

interface ContestMaterialsWidgetProps {
  announcementUrl?: string;
  tutorialUrl?: string;
}

/**
 * Contest Materials sidebar widget.
 * Simple bulleted list with links like "Announcement (en)" and "Tutorial (en)".
 */
export default function ContestMaterialsWidget({
  announcementUrl,
  tutorialUrl,
}: ContestMaterialsWidgetProps) {
  if (!announcementUrl && !tutorialUrl) return null;

  return (
    <SidebarWidget title="Contest materials">
      <ul className="list-disc list-inside space-y-1 text-sm">
        {announcementUrl && (
          <li>
            <a
              href={announcementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:underline"
            >
              Announcement (en)
            </a>
          </li>
        )}
        {tutorialUrl && (
          <li>
            <a
              href={tutorialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#2563EB] hover:underline"
            >
              Tutorial (en)
            </a>
          </li>
        )}
      </ul>
    </SidebarWidget>
  );
}