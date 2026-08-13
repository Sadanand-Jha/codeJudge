"use client";

import ProfileWorkspace from "@/components/profile/ProfileWorkspace";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileWorkspace>{children}</ProfileWorkspace>;
}
