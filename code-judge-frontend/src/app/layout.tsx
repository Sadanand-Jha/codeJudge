import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/context/ThemeContext";
import AuthHydrator from "@/components/providers/AuthHydrator";
import ModalScrollLock from "@/components/providers/ModalScrollLock";
import { UpgradeModalHost } from "@/components/upgrade/UpgradeModal";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/utils/storageKeys";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  buildSiteJsonLd,
  serializeJsonLd,
} from "@/lib/seo/site";

// No site-wide `alternates.canonical` here: a canonical set on the root layout
// is inherited by every route, which would point all pages at the homepage.
// Public pages set their own canonical via buildPublicPageMetadata().
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} – Online Quizzes for Students & Teachers`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} – Online Quizzes for Students & Teachers`,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} – Online Quizzes for Students & Teachers`,
    description: DEFAULT_DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: { icon: "/icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#070912" },
  ],
};

function migrateLegacyStorageKeys() {
  if (typeof window === "undefined") return;

  try {
    const legacyKeys: Record<string, string> = {};

    // Collect known legacy keys
    for (const key of LEGACY_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        legacyKeys[key] = value;
      }
    }

    // Also scan for any old quizDibba-prefixed keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("quizDibba_") || key.startsWith("quizdibba_"))) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          legacyKeys[key] = value;
        }
      }
    }

    if (Object.keys(legacyKeys).length === 0) return;

    // Map legacy keys to new quizsupport keys
    const keyMapping: Record<string, string> = {
      token: STORAGE_KEYS.AUTH_TOKEN,
      user: STORAGE_KEYS.AUTH_USER,
      quizsupport_theme: STORAGE_KEYS.THEME,
      quizsupport_quiz_creation: STORAGE_KEYS.QUIZ_CREATION,
      waiting_room_theme_state: STORAGE_KEYS.WAITING_ROOM_THEME_STATE,
      "split-pane-left-width": STORAGE_KEYS.SPLIT_PANE_LEFT_WIDTH,
      "split-pane-console-height": STORAGE_KEYS.SPLIT_PANE_CONSOLE_HEIGHT,
      "ai-left-panel": STORAGE_KEYS.AI_LEFT_PANEL,
      quizDibba_theme: STORAGE_KEYS.THEME,
      quizDibba_quiz_creation: STORAGE_KEYS.QUIZ_CREATION,
      quizdibba_theme: STORAGE_KEYS.THEME,
      quizdibba_quiz_creation: STORAGE_KEYS.QUIZ_CREATION,
    };

    // Handle prefixed keys (quiz_progress_*, live_quiz_started_*)
    for (const [legacyKey, value] of Object.entries(legacyKeys)) {
      if (keyMapping[legacyKey]) {
        localStorage.setItem(keyMapping[legacyKey], value);
        localStorage.removeItem(legacyKey);
      } else if (legacyKey.startsWith("quiz_progress_")) {
        const newKey = legacyKey.replace("quiz_progress_", STORAGE_KEYS.QUIZ_PROGRESS_PREFIX);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(legacyKey);
      } else if (legacyKey.startsWith("live_quiz_started_")) {
        const newKey = legacyKey.replace("live_quiz_started_", STORAGE_KEYS.LIVE_QUIZ_STARTED_PREFIX);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(legacyKey);
      } else if (legacyKey.startsWith("quizDibba_quiz_progress_")) {
        const newKey = legacyKey.replace("quizDibba_quiz_progress_", STORAGE_KEYS.QUIZ_PROGRESS_PREFIX);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(legacyKey);
      } else if (legacyKey.startsWith("quizDibba_live_quiz_started_")) {
        const newKey = legacyKey.replace("quizDibba_live_quiz_started_", STORAGE_KEYS.LIVE_QUIZ_STARTED_PREFIX);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(legacyKey);
      } else if (legacyKey.startsWith("quizdibba_quiz_progress_")) {
        const newKey = legacyKey.replace("quizdibba_quiz_progress_", STORAGE_KEYS.QUIZ_PROGRESS_PREFIX);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(legacyKey);
      } else if (legacyKey.startsWith("quizdibba_live_quiz_started_")) {
        const newKey = legacyKey.replace("quizdibba_live_quiz_started_", STORAGE_KEYS.LIVE_QUIZ_STARTED_PREFIX);
        localStorage.setItem(newKey, value);
        localStorage.removeItem(legacyKey);
      }
    }
  } catch {
    // ignore migration errors
  }

  // Clean up removed localStorage keys
  try {
    localStorage.removeItem("quizsupport_rooms");
  } catch {
    // ignore
  }
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/* QuizSupport marketing/quiz design typefaces (scoped via .qs-ui) */
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Run migration once on app startup
  if (typeof window !== "undefined") {
    migrateLegacyStorageKeys();
  }

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Critical theme script — runs synchronously before first paint so the
            correct data-theme attribute is present before CSS is evaluated.
            Reads from localStorage (quizsupport_theme) or falls back to the
            OS prefers-color-scheme. This eliminates theme flash on initial
            load, refresh, and direct navigation to any route. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){try{var t;var s=localStorage.getItem('quizsupport_theme')||localStorage.getItem('quizDibba_theme')||localStorage.getItem('quizdibba_theme');if(s==='light'||s==='dark'){t=s}else{t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();
            `,
          }}
        />
        {/* Structured data: WebSite + Organization (see src/lib/seo/site.ts). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildSiteJsonLd()) }}
        />
      </head>
      <body className={`${inter.variable} ${inter.className} ${bricolage.variable} min-h-screen bg-[var(--background)]`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthHydrator />
          <ModalScrollLock />
          {children}
        </ThemeProvider>
        <UpgradeModalHost />
        <Toaster />
      </body>
    </html>
  );
}
