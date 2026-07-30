import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "CodeJudge",
  description: "AI-powered competitive programming platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-[#09090B]" suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            style: {
              background: "#111827",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#FFFFFF",
              fontSize: "12px",
              fontFamily: "inherit",
              borderRadius: "12px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              padding: "10px 14px",
            },
            classNames: {
              title: "text-[12px] font-medium text-white",
              description: "text-[11px] text-[#9CA3AF]",
              closeButton: "text-[#9CA3AF] hover:text-white hover:bg-white/[0.05]",
              success: "border-l-[3px] border-l-[#22C55E]",
              error: "border-l-[3px] border-l-[#EF4444]",
              info: "border-l-[3px] border-l-[#7C3AED]",
            },
          }}
        />
      </body>
    </html>
  );
}