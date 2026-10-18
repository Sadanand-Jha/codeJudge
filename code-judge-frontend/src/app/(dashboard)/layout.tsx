import type { Metadata } from "next";

// Dashboard modules are private (also robots-disallowed, and proxy-blocked
// while focus mode is enabled). Keep them out of the index if they become
// reachable again.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
