"use client";

import { usePathname } from "next/navigation";
import { StudentRoomsProvider } from "./StudentRoomsProvider";
import StudentRoomsNavbar from "./StudentRoomsNavbar";

/**
 * Adds the rooms sub-navbar to the signed-in student room pages only.
 * The public join page (/rooms) keeps its full-screen layout.
 */
export default function StudentRoomsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isRoomWorkspace = pathname === "/rooms/my" || pathname.startsWith("/rooms/");

  if (!isRoomWorkspace) return <>{children}</>;

  return (
    <StudentRoomsProvider>
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[var(--qs-bg)]">
        <StudentRoomsNavbar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </StudentRoomsProvider>
  );
}
