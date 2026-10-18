import Link from "next/link";
import { ArrowLeft, Code2, Trophy, Users, Sparkles } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { buildPublicPageMetadata } from "@/lib/seo/site";

export const metadata = buildPublicPageMetadata({
  title: "About QuizSupport",
  description:
    "QuizSupport is an online quiz platform for creating quizzes, sharing them with an access code, and getting instant results on any device.",
  path: "/about",
});

const features = [
  { icon: Code2, title: "Create a quiz in minutes", desc: "Write questions, mark the right answers, and publish", color: "#7C3AED" },
  { icon: Users, title: "Share with an access code", desc: "Every quiz gets its own code to send anywhere", color: "#3B82F6" },
  { icon: Trophy, title: "Instant results", desc: "Players see their score the moment they submit", color: "#FBBF24" },
  { icon: Sparkles, title: "Track progress", desc: "Review attempts and scores across devices", color: "#22C55E" },
];

export default function AboutPage() {
  return (
    <AppLayout>
      <div className="px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">About QuizSupport</h1>
            <p className="text-sm text-muted-foreground mt-1">Online quiz platform for taking quizzes and practice tests.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              QuizSupport is an online quiz platform for taking quizzes and practice tests.
              Join live quizzes with an access code, get instant results, and track your
              scores across devices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-border bg-card p-5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${f.color}15`, border: `1px solid ${f.color}30` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">{f.desc}</p>
                </div>
              );
            })}
          </div>

          <Link
            href="/quiz"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#7C3AED] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
