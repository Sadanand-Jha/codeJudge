import type { Metadata } from "next";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/seo/site";

const title = "You're invited to a quiz on QuizSupport";
const description = "Tap the link to join instantly, or enter the quiz code. Instant results and score tracking.";

// Joining a quiz requires an account — noindex (inherited by all of /quiz too).
export const metadata: Metadata = {
  title: "Join Quiz – Test Your Knowledge",
  description:
    "Join a QuizSupport quiz online with your access code. Instant results and score tracking.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title,
    description,
    url: `${SITE_URL}/quiz/join`,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [DEFAULT_OG_IMAGE],
  },
};

export default function QuizJoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
