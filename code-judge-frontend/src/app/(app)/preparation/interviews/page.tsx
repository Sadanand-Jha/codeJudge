"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Briefcase,
  Building2,
  Check,
  Clock,
  Code2,
  FileText,
  Filter,
  MessagesSquare,
  Mic,
  Play,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { PREPARATION_BASE } from "@/config/preparation";
import { CompactMetric, PrepPageHeader, PrepSectionTitle } from "@/components/preparation";

/* ────────────────────────────── Mock data ────────────────────────────── */

const practiceModes = [
  {
    title: "Technical Interviews",
    desc: "DSA & coding rounds with timed problems",
    icon: Code2,
    color: "#7C3AED",
    href: "/problems?tag=Interview",
    meta: "240 curated questions",
  },
  {
    title: "HR & Behavioral",
    desc: "Common HR questions and strong answers",
    icon: Users,
    color: "#3B82F6",
    href: `${PREPARATION_BASE}/discussions`,
    meta: "85 question bank",
  },
  {
    title: "Mock Interviews",
    desc: "Full simulated interview loops",
    icon: Video,
    color: "#EC4899",
    href: "/tests",
    meta: "Schedule a session",
  },
  {
    title: "Company-specific",
    desc: "Prepare track per company",
    icon: Building2,
    color: "#F59E0B",
    href: `${PREPARATION_BASE}/companies`,
    meta: "18 companies",
  },
];

const organizeTabs = ["Company", "Role", "Difficulty", "Topic", "Experience"] as const;

interface QuestionEntry {
  id: number;
  company: string;
  role: string;
  round: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  askedCount: number;
}

// The same bank, grouped differently per tab.
const questionBank: QuestionEntry[] = [
  { id: 1, company: "Amazon", role: "Software Engineer", round: "Technical Interview", topic: "Arrays", difficulty: "Medium", askedCount: 312 },
  { id: 2, company: "Amazon", role: "Software Engineer", round: "Technical Interview", topic: "Graphs", difficulty: "Hard", askedCount: 187 },
  { id: 3, company: "Google", role: "SDE Intern", round: "DSA Round", topic: "Binary Search", difficulty: "Medium", askedCount: 164 },
  { id: 4, company: "Google", role: "Software Engineer", round: "Coding Round 2", topic: "Dynamic Programming", difficulty: "Hard", askedCount: 142 },
  { id: 5, company: "Microsoft", role: "SWE Intern", round: "Online Assessment", topic: "Strings", difficulty: "Easy", askedCount: 208 },
  { id: 6, company: "Adobe", role: "Software Engineer", round: "Technical Interview", topic: "Trees & BST", difficulty: "Medium", askedCount: 96 },
  { id: 7, company: "Meta", role: "SDE Intern", round: "Screening", topic: "Two Pointers", difficulty: "Medium", askedCount: 121 },
  { id: 8, company: "Flipkart", role: "SDE 1", round: "Hiring Drive", topic: "Sliding Window", difficulty: "Medium", askedCount: 74 },
  { id: 9, company: "Infosys", role: "Systems Engineer", round: "Online Test", topic: "Basic Programming", difficulty: "Easy", askedCount: 254 },
  { id: 10, company: "TCS", role: "Ninja", round: "Online Test", topic: "SQL", difficulty: "Easy", askedCount: 198 },
];

const experiences = [
  {
    id: 1,
    company: "Google",
    role: "SDE Intern",
    author: "Arjun Mehta",
    time: "5 hours ago",
    outcome: "Selected",
    rounds: ["Online Assessment", "DSA Round ×2", "Googlyness"],
    preview: "Just finished my Google interview loop. Here's my detailed breakdown of each round, the questions asked, and tips...",
    likes: 567,
    comments: 89,
  },
  {
    id: 2,
    company: "Amazon",
    role: "Software Engineer",
    author: "Sarah Chen",
    time: "2 days ago",
    outcome: "Waiting for results",
    rounds: ["OA", "Technical Round 1", "Technical Round 2", "Bar Raiser"],
    preview: "All four rounds revolved around LPs + DSA. Round 1 was arrays and hashing, the Bar Raiser pushed hard on ownership stories...",
    likes: 342,
    comments: 57,
  },
  {
    id: 3,
    company: "Microsoft",
    role: "SWE Intern",
    author: "Priya Nair",
    time: "4 days ago",
    outcome: "Selected",
    rounds: ["OA", "Technical Interview", "HR Interview"],
    preview: "The OA had 2 easy-medium questions. The technical round was mostly strings and a small system design discussion...",
    likes: 289,
    comments: 41,
  },
];

const hrTopics = [
  "Tell me about yourself",
  "Why this company?",
  "Strengths & weaknesses",
  "Conflict in a team",
  "Where do you see yourself in 5 years?",
  "Why should we hire you?",
];

const difficultyFilters = ["Easy", "Medium", "Hard"];

/* ─────────────────────────────── Page ─────────────────────────────── */

export default function InterviewsPage() {
  const [tab, setTab] = useState<(typeof organizeTabs)[number]>("Company");
  const [difficulty, setDifficulty] = useState<string | null>(null);

  const filteredQuestions = questionBank.filter(
    (q) => !difficulty || q.difficulty === difficulty
  );

  // Group entries by the active organizing dimension.
  const grouped = (() => {
    const keyOf = (q: QuestionEntry) =>
      tab === "Experience" ? q.round : q[tab.toLowerCase() as keyof QuestionEntry] as string;
    const map = new Map<string, QuestionEntry[]>();
    for (const q of filteredQuestions) {
      const k = String(keyOf(q));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(q);
    }
    return [...map.entries()].sort(
      (a, b) =>
        b[1].reduce((sum, q) => sum + q.askedCount, 0) -
        a[1].reduce((sum, q) => sum + q.askedCount, 0)
    );
  })();

  return (
    <div className="px-6 py-6">
      <div className="max-w-7xl mx-auto">
        <PrepPageHeader
          section="Interviews"
          title="Interviews"
          subtitle="Practice questions, run mock loops and learn from real interview experiences — organized by company, role, difficulty and topic."
          actions={
            <Link
              href="/tests"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-4 text-xs font-semibold text-white transition-all hover:shadow-[0_0_16px_rgba(124,58,237,0.35)]"
            >
              <Mic className="w-3.5 h-3.5" />
              Start Mock Interview
            </Link>
          }
        />

        {/* Compact metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          <CompactMetric label="Sessions practiced" value={8} icon={Mic} iconClassName="text-accent bg-accent/10" />
          <CompactMetric label="Questions covered" value="64 / 240" icon={FileText} iconClassName="text-[#3B82F6] bg-[#3B82F6]/10" />
          <CompactMetric label="Experiences read" value={23} icon={BookOpen} iconClassName="text-warning bg-warning/10" />
          <CompactMetric label="Companies tracked" value={5} icon={Building2} iconClassName="text-success bg-success/10" />
        </div>

        {/* Practice modes */}
        <section className="mb-6">
          <PrepSectionTitle icon={Sparkles} title="Practice modes" />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
            {practiceModes.map((mode, idx) => {
              const Icon = mode.icon;
              return (
                <motion.div
                  key={mode.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                >
                  <Link
                    href={mode.href}
                    className="group flex h-full items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-accent/40 hover:bg-card-hover"
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${mode.color}15`, border: `1px solid ${mode.color}30` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: mode.color }} />
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="flex items-center gap-1 text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
                        {mode.title}
                        <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-text-muted">{mode.desc}</span>
                      <span className="mt-1 block text-[10px] font-medium text-text-secondary">{mode.meta}</span>
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Main column */}
          <div className="flex-1 min-w-0">
            {/* Organize-by tabs + difficulty filter */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {organizeTabs.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] font-medium border transition-all ${
                      tab === t
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card text-text-secondary hover:border-border-hover hover:text-text-primary"
                    }`}
                  >
                    Organize by {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-text-muted" />
                {difficultyFilters.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(difficulty === d ? null : d)}
                    className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                      difficulty === d
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-card text-text-secondary hover:border-border-hover"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Grouped question bank */}
            <div className="space-y-4">
              {grouped.map(([groupKey, questions]) => (
                <div key={groupKey} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <h3 className="flex items-center gap-2 text-xs font-bold text-text-primary">
                      {tab === "Company" && <Building2 className="w-3.5 h-3.5 text-accent" />}
                      {tab === "Role" && <Briefcase className="w-3.5 h-3.5 text-accent" />}
                      {tab === "Topic" && <Brain className="w-3.5 h-3.5 text-accent" />}
                      {tab === "Experience" && <MessagesSquare className="w-3.5 h-3.5 text-accent" />}
                      {tab === "Difficulty" && <Check className="w-3.5 h-3.5 text-accent" />}
                      {groupKey}
                    </h3>
                    <span className="text-[10px] text-text-muted">{questions.length} questions</span>
                  </div>
                  <div className="divide-y divide-border">
                    {questions.map((q) => (
                      <Link
                        key={`${q.id}-${q.company}`}
                        href="/problems"
                        className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-card-hover"
                      >
                        <Play className="w-3 h-3 shrink-0 text-text-muted group-hover:text-accent" />
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate text-xs font-medium text-text-primary group-hover:text-accent transition-colors">
                            {tab === "Company" ? `${q.topic} · ${q.round}` : q.company}
                          </span>
                          <span className="block truncate text-[10px] text-text-muted">
                            {tab === "Company" ? `Asked in ${q.role} loops` : `${q.role} · ${q.round}`}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-medium ${
                            q.difficulty === "Easy"
                              ? "border-success/30 bg-success/10 text-success"
                              : q.difficulty === "Medium"
                              ? "border-warning/30 bg-warning/10 text-warning"
                              : "border-danger/30 bg-danger/10 text-danger"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="hidden sm:block w-16 shrink-0 text-right text-[10px] text-text-muted">
                          {q.askedCount}× asked
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Previous experiences */}
            <section className="mt-6">
              <PrepSectionTitle
                icon={BookOpen}
                title="Previous interview experiences"
                action={
                  <Link
                    href={`${PREPARATION_BASE}/discussions`}
                    className="text-[11px] font-semibold text-accent hover:text-accent-secondary transition-colors"
                  >
                    Share yours →
                  </Link>
                }
              />
              <div className="space-y-3">
                {experiences.map((exp, idx) => (
                  <motion.div
                    key={exp.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                  >
                    <Link
                      href={`${PREPARATION_BASE}/discussions`}
                      className="block rounded-2xl border border-border bg-card p-4 transition-all hover:border-accent/30 hover:bg-card-hover"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 text-[10px] font-bold text-accent">
                          {exp.company.charAt(0)}
                        </span>
                        <span className="text-xs font-semibold text-text-primary">
                          {exp.company} · {exp.role}
                        </span>
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-medium ${
                            exp.outcome === "Selected"
                              ? "border-success/30 bg-success/10 text-success"
                              : "border-warning/30 bg-warning/10 text-warning"
                          }`}
                        >
                          {exp.outcome}
                        </span>
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-text-muted">
                          <Clock className="w-3 h-3" /> {exp.time}
                        </span>
                      </div>

                      {/* Round timeline */}
                      <div className="mb-2 flex flex-wrap items-center gap-x-1 gap-y-1">
                        {exp.rounds.map((round, i) => (
                          <span key={round} className="flex items-center gap-1">
                            <span className="rounded-md border border-border bg-card-hover px-1.5 py-0.5 text-[9px] font-medium text-text-secondary">
                              {round}
                            </span>
                            {i < exp.rounds.length - 1 && (
                              <ArrowRight className="h-2.5 w-2.5 text-text-muted" />
                            )}
                          </span>
                        ))}
                      </div>

                      <p className="line-clamp-2 text-xs leading-relaxed text-text-secondary">{exp.preview}</p>

                      <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
                        <span>by {exp.author}</span>
                        <span>♥ {exp.likes}</span>
                        <span>💬 {exp.comments}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Side column */}
          <div className="w-full xl:w-72 shrink-0 space-y-4">
            {/* HR question warm-up */}
            <section className="rounded-2xl border border-border bg-card p-4">
              <PrepSectionTitle icon={Users} title="HR warm-up" />
              <div className="space-y-1">
                {hrTopics.map((topic) => (
                  <Link
                    key={topic}
                    href={`${PREPARATION_BASE}/discussions`}
                    className="block rounded-lg px-2.5 py-1.5 text-[11px] text-text-secondary transition-colors hover:bg-card-hover hover:text-text-primary"
                  >
                    “{topic}”
                  </Link>
                ))}
              </div>
            </section>

            {/* Company shortcuts */}
            <section className="rounded-2xl border border-border bg-card p-4">
              <PrepSectionTitle
                icon={Building2}
                title="Company prep"
                action={
                  <Link href={`${PREPARATION_BASE}/companies`} className="text-[11px] font-semibold text-accent">
                    All →
                  </Link>
                }
              />
              <div className="flex flex-wrap gap-1.5">
                {["Amazon", "Google", "Microsoft", "Adobe", "Meta"].map((c) => (
                  <Link
                    key={c}
                    href={`${PREPARATION_BASE}/companies/${c.toLowerCase()}`}
                    className="rounded-lg border border-border bg-card-hover px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent/40 hover:text-text-primary"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </section>

            {/* Tip */}
            <div className="rounded-2xl border border-accent/20 bg-gradient-to-r from-accent/[0.07] to-transparent p-4">
              <p className="text-xs font-semibold text-text-primary">Interview tip</p>
              <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                Narrate your thought process out loud while solving — interviewers grade communication as much as code.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
