import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Classrooms — Creator Studio",
};

export default function CreatorRoomsLayout({ children }: { children: ReactNode }) {
  return children;
}
