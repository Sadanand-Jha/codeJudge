import type { Metadata } from "next";

// Room joining is an account flow; keep it out of search results.
export const metadata: Metadata = {
  title: "Join a Room",
  description: "Join your teacher's classroom on QuizSupport with a room code and password.",
  robots: { index: false, follow: false },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <div className="qs-ui min-h-dvh">{children}</div>;
}
