import type { Metadata } from "next";
import CreatorStudioLayout from "@/components/creator/layout/CreatorStudioLayout";

// Creator Studio is an authenticated workspace — never index it. Also
// reinforced by X-Robots-Tag headers in proxy.ts.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return <CreatorStudioLayout>{children}</CreatorStudioLayout>;
}
