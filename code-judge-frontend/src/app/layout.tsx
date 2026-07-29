import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { Toaster } from "sonner";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

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
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster
          position="top-right"
          closeButton
          toastOptions={{
            style: {
              background: "#ffffff",
              border: "1px solid #E6E7EB",
              color: "#111827",
              fontSize: "12px",
              fontFamily: "inherit",
              borderRadius: "4px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              padding: "10px 14px",
            },
            classNames: {
              title: "text-[12px] font-medium text-[#111827]",
              description: "text-[11px] text-[#6B7280]",
              closeButton:
                "text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]",
              success:
                "border-l-[3px] border-l-green-500",
              error:
                "border-l-[3px] border-l-red-500",
              info: "border-l-[3px] border-l-[#2563EB]",
            },
          }}
        />
      </body>
    </html>
  );
}
