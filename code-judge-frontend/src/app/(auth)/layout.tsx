import type { Metadata } from "next";

// Sign-in flows are functional endpoints, not content — keep them out of the
// index but let crawlers follow links through them.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
