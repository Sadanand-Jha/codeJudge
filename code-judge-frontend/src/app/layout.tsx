import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/context/ThemeContext";

export const metadata: Metadata = {
  title: "ByteClash",
  description: "AI-powered competitive programming platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[var(--background)]" suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}