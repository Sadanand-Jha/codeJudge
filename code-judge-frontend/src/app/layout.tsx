import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/context/ThemeContext";
import AuthHydrator from "@/components/providers/AuthHydrator";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/utils/storageKeys";

export const metadata: Metadata = {
  title: "ByteClash",
  description: "AI-powered competitive programming platform.",
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

    // Map legacy keys to new byteclash keys
    const keyMapping: Record<string, string> = {
      token: STORAGE_KEYS.AUTH_TOKEN,
      user: STORAGE_KEYS.AUTH_USER,
      byteclash_theme: STORAGE_KEYS.THEME,
      byteclash_quiz_creation: STORAGE_KEYS.QUIZ_CREATION,
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
    localStorage.removeItem("byteclash_rooms");
  } catch {
    // ignore
  }
}

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
            Reads from localStorage (byteclash_theme) or falls back to the
            OS prefers-color-scheme. This eliminates theme flash on initial
            load, refresh, and direct navigation to any route. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){try{var t;var s=localStorage.getItem('byteclash_theme')||localStorage.getItem('quizDibba_theme')||localStorage.getItem('quizdibba_theme');if(s==='light'||s==='dark'){t=s}else{t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Preload critical avatar images — avoids lazy-load waterfall on first paint */}
        <link rel="preload" as="image" href="/images/avatar-1.png" />
        <link rel="preload" as="image" href="/images/avatar-2.png" />
        <link rel="preload" as="image" href="/images/avatar-3.png" />
        <link rel="preload" as="image" href="/images/avatar-4.png" />
        <link rel="preload" as="image" href="/images/avatar-5.png" />
        <link rel="preload" as="image" href="/images/avatar-6.png" />
        <link rel="preload" as="image" href="/images/avatar-7.png" />
      </head>
      <body className="min-h-screen bg-[var(--background)]" suppressHydrationWarning>
        <ThemeProvider>
          <AuthHydrator />
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}