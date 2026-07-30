import Link from "next/link";
import { Code2, Trophy, FileText, Lightbulb, MessageSquare, Home } from "lucide-react";

export default function NotFound() {
  const links = [
    { icon: Code2, label: "Problemset", href: "/problems" },
    { icon: Trophy, label: "Contests", href: "/contests" },
    { icon: FileText, label: "My Submissions", href: "/submissions" },
    { icon: MessageSquare, label: "AI Chat", href: "/ai/chat" },
    { icon: Lightbulb, label: "Hints", href: "/ai/hints" },
  ];

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">404</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Page Not Found</h1>
        <p className="text-sm text-[#9CA3AF] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                href={link.href}
                className="group rounded-xl border border-white/[0.06] bg-[#111827] p-4 hover:border-[#7C3AED]/30 transition-all"
              >
                <Icon className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#7C3AED] transition-colors mx-auto mb-2" />
                <div className="text-[11px] font-medium text-[#9CA3AF] group-hover:text-white transition-colors">
                  {link.label}
                </div>
              </Link>
            );
          })}
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#7C3AED] hover:shadow-[0_0_12px_rgba(124,58,237,0.3)] transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
