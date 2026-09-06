"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ListChecks,
  Settings,
  Users,
  ClipboardList,
  Trophy,
  BarChart3,
  MessageSquare,
  FileBadge,
  Megaphone,
  UserPlus,
  Eye,
  Send,
  ArrowLeft,
  Check,
  AlertCircle,
  Clock,
  Globe,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Plus,
  Pencil,
  Sparkles,
  Target,
  Timer,
  Shield,
  BookOpen,
  TrendingUp,
  Activity,
  Calendar,
  MoreHorizontal,
  Search,
  RefreshCw,
  Loader2,
  User,
} from "lucide-react";
import {
  StudioQuestion,
  QuizSettingsConfig,
} from "@/types/quiz";
import QuizSettings from "@/components/quiz/QuizSettings";
import QuizStudio from "@/components/quiz/QuizStudio";
import { GenerateResultsButton } from "@/components/quiz/GenerateResultsButton";
import {
  getQuizParticipants,
  QuizParticipant,
  PARTICIPANT_SOURCE,
} from "@/services/quiz";

type DashboardTab =
  | "overview"
  | "questions"
  | "settings"
  | "participants"
  | "registrations"
  | "leaderboard"
  | "analytics"
  | "discussion"
  | "certificates"
  | "announcements"
  | "collaborators"
  | "preview"
  | "publish";

const NAV_ITEMS: { id: DashboardTab; label: string; icon: any; group: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Main" },
  { id: "questions", label: "Questions", icon: ListChecks, group: "Content" },
  { id: "settings", label: "Settings", icon: Settings, group: "Content" },
  { id: "participants", label: "Participants", icon: Users, group: "People" },
  { id: "registrations", label: "Registrations", icon: ClipboardList, group: "People" },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy, group: "Insights" },
  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Insights" },
  { id: "discussion", label: "Discussion", icon: MessageSquare, group: "Community" },
  { id: "certificates", label: "Certificates", icon: FileBadge, group: "Community" },
  { id: "announcements", label: "Announcements", icon: Megaphone, group: "Community" },
  { id: "collaborators", label: "Collaborators", icon: UserPlus, group: "People" },
  { id: "preview", label: "Preview", icon: Eye, group: "Launch" },
  { id: "publish", label: "Publish", icon: Send, group: "Launch" },
];

function defaultSettings(quizName: string): QuizSettingsConfig {
  return {
    general: { name: quizName, description: "", tags: [], language: "English" },
    assessment: { duration: 30, passingMarks: 40, negativeMarking: false, negativeMarkValue: 0, questionRandomization: false, optionRandomization: false, practiceMode: false, autoSubmit: true },
    attempts: { attemptsAllowed: 3, cooldownBetweenAttempts: 0, retakeRules: "limited", scoreMethod: "best", leaderboardMethod: "best" },
    lifelines: {
      fifty_fifty: { enabled: true, maxUses: 1, penalty: 0, description: "Removes two incorrect options" },
      hint: { enabled: true, maxUses: 2, penalty: 0, description: "Shows a creator-provided hint" },
      skip: { enabled: true, maxUses: 1, penalty: 0, description: "Skip the question without penalty" },
      extra_time: { enabled: true, maxUses: 1, penalty: 0, description: "Adds 30 seconds to the timer" },
      reveal_explanation: { enabled: false, maxUses: 0, penalty: 0, description: "Shows explanation immediately (Practice Mode only)" },
      formula_sheet: { enabled: false, maxUses: 0, penalty: 0, description: "Opens reference notes" },
    },
    navigation: { allowPrevious: true, allowNext: true, allowJumpToQuestion: true, allowReview: true, lockAfterAnswer: false, sequentialMode: false, freeNavigation: true },
    visibility: { type: "private", restrictions: { verifiedEmail: false, verifiedCollege: false, verifiedCompany: false, minXP: undefined } },
    scheduling: { timezone: "Asia/Kolkata", lateEntryPolicy: "allowed" },
    scoring: { positiveMarks: 10, negativeMarks: 0, negativeMarkValue: 0, partialMarking: false, bonusQuestions: false, mandatoryQuestions: false, weightage: false },
    certificates: { enabled: false, minimumPassingPercentage: 60, issueAutomatically: true },
    leaderboard: { enabled: true, showToParticipants: true, showTop10Only: false, showOnlyOwnRank: false, anonymousMode: false, hideUntilEnd: false, showAfterQuizEnds: true, showLiveDuringQuiz: false, showAfterAllSubmitted: false, realtimeRanking: false },
    discussion: { enableComments: true, allowQuestions: true, moderation: false, anonymousDiscussions: false },
    security: { fullscreenMode: false, tabSwitchingDetection: false, copyProtection: false, pasteRestriction: false, devToolsDetection: false, ipRestriction: false, oneDeviceOnly: false },
    notifications: { reminderBeforeQuiz: true, resultPublished: true, registrationConfirmation: true, certificateReady: true, leaderboardUpdates: false },
    advanced: { apiIntegrations: false, webhook: undefined, customBranding: false, customCss: false, plugins: false, enterpriseSettings: false },
  };
}

interface QuizDashboardProps {
  quizId: string;
  quizName: string;
  initialQuestions?: StudioQuestion[];
  onExit?: () => void;
}

export default function QuizDashboard({ quizId, quizName, initialQuestions, onExit }: QuizDashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [questions, setQuestions] = useState<StudioQuestion[]>(initialQuestions || []);
  const [settings, setSettings] = useState<QuizSettingsConfig>(() => defaultSettings(quizName));
  const [showQuestionBuilder, setShowQuestionBuilder] = useState(false);
  const [showSettingsView, setShowSettingsView] = useState(false);

  // Validation
  const validationSummary = useMemo(() => {
    const valid = questions.filter((q) =>
      q.title.trim() &&
      q.options.length >= 2 &&
      q.options.every((o) => o.content.trim()) &&
      q.options.some((o) => o.isCorrect) &&
      q.marks > 0
    ).length;
    return { valid, total: questions.length };
  }, [questions]);

  const totalMarks = useMemo(() => questions.reduce((s, q) => s + (q.marks || 0), 0), [questions]);

  // Checklist
  const checklist = useMemo(() => {
    return [
      { id: "info", label: "Quiz Information Complete", passed: settings.general.name.trim().length > 0 && settings.general.description.trim().length > 0 },
      { id: "questions", label: "Questions Valid", passed: validationSummary.total > 0 && validationSummary.valid === validationSummary.total },
      { id: "answers", label: "Answers Configured", passed: questions.every((q) => q.options.some((o) => o.isCorrect)) },
      { id: "marks", label: "Marks Assigned", passed: questions.every((q) => q.marks > 0) },
      { id: "visibility", label: "Visibility Configured", passed: true },
      { id: "rules", label: "Assessment Rules Configured", passed: true },
      { id: "lifelines", label: "Lifelines Configured", passed: true },
      { id: "preview", label: "Preview Completed", passed: false },
    ];
  }, [settings.general, questions, validationSummary]);

  const readinessCount = checklist.filter((c) => c.passed).length;

  const recentActivity = [
    { icon: Pencil, text: "You edited question 1", time: "2 minutes ago", type: "edit" },
    { icon: Sparkles, text: "AI suggested difficulty: Easy", time: "15 minutes ago", type: "ai" },
    { icon: Users, text: "Prof. Smith joined as collaborator", time: "1 hour ago", type: "collab" },
    { icon: Settings, text: "Assessment settings updated", time: "3 hours ago", type: "settings" },
  ];

  // If in question builder fullscreen — redirect to Studio (canonical builder)
  if (showQuestionBuilder) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md text-center">
          <h2 className="text-lg font-semibold text-white">Question Builder moved</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The legacy builder was removed. Use the Studio at <span className="font-mono text-white">/creator/quizzes/{quizId}/edit → Questions</span>.
          </p>
          <button
            onClick={() => setShowQuestionBuilder(false)}
            className="mt-4 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // If in settings fullscreen
  if (showSettingsView) {
    return (
      <QuizSettings
        quizId={quizId}
        quizName={settings.general.name || quizName}
        settings={settings}
        onChange={setSettings}
        onBack={() => setShowSettingsView(false)}
      />
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ===== TOP BAR ===== */}
      <div className="h-14 border-b border-border-hover bg-background/80 backdrop-blur-xl flex items-center px-3 sm:px-4 gap-2 sm:gap-3 shrink-0">
        <button
          onClick={onExit}
          className="h-8 px-2 sm:px-2.5 rounded-lg border border-border bg-white/[0.04] text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
          title="Back to Quizzes"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="w-px h-6 bg-white/[0.08]" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#EC4899] flex items-center justify-center">
            <LayoutDashboard className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white leading-tight truncate">{settings.general.name || quizName}</p>
            <p className="text-[9px] text-[#6B7280]">Quiz Dashboard</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowQuestionBuilder(true)}
            className="h-8 px-2 sm:px-3 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors flex items-center gap-1"
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Questions</span>
          </button>
          <button
            onClick={() => setShowSettingsView(true)}
            className="h-8 px-2 sm:px-3 rounded-lg border border-border bg-white/[0.04] text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* ===== BODY: Sidebar + Main ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - hidden on mobile, shown as bottom sheet or drawer */}
        <div className="hidden md:flex w-60 border-r border-border bg-[#0B0D12] flex-col shrink-0">
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
            {["Main", "Content", "People", "Insights", "Community", "Launch"].map((group) => {
              const items = NAV_ITEMS.filter((i) => i.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <p className="px-2 mb-1 text-[9px] font-bold uppercase tracking-wider text-[#6B7280]">{group}</p>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = activeTab === item.id;
                      const itemCount = item.id === "questions" ? (questions.length > 0 ? questions.length : "") : "";
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (item.id === "questions") {
                              setShowQuestionBuilder(true);
                              return;
                            }
                            if (item.id === "settings") {
                              setShowSettingsView(true);
                              return;
                            }
                            setActiveTab(item.id);
                          }}
                          className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-all ${
                            isActive
                              ? "bg-[#EC4899]/10 text-white border border-[#EC4899]/20"
                              : "text-muted-foreground hover:text-white hover:bg-white/[0.04] border border-transparent"
                          }`}
                        >
                          <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#EC4899]" : "text-[#6B7280]"}`} />
                          <span className="text-[11px] font-medium flex-1">{item.label}</span>
                          {itemCount && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[#EC4899]/10 border border-[#EC4899]/20 text-[8px] font-bold text-[#EC4899]">
                              {itemCount}
                            </span>
                          )}
                          {item.id === "publish" && (
                            <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${readinessCount === checklist.length ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#F59E0B]/10 text-[#F59E0B]"}`}>
                              {readinessCount}/{checklist.length}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === "overview" && (
                <OverviewTab
                  quizId={quizId}
                  quizName={settings.general.name || quizName}
                  quizDescription={settings.general.description}
                  questionsCount={questions.length}
                  totalMarks={totalMarks}
                  validationSummary={validationSummary}
                  checklist={checklist}
                  readinessCount={readinessCount}
                  recentActivity={recentActivity}
                  onOpenBuilder={() => setShowQuestionBuilder(true)}
                  onOpenSettings={() => setShowSettingsView(true)}
                  onPreview={() => setActiveTab("preview")}
                  onPublish={() => setActiveTab("publish")}
                />
              )}

              {activeTab === "participants" && <ParticipantsTab quizId={quizId} />}
              {activeTab === "registrations" && <PlaceholderTab title="Registrations" description="View and manage quiz registrations." icon={ClipboardList} />}
              {activeTab === "leaderboard" && <PlaceholderTab title="Leaderboard" description="See top performers and rankings." icon={Trophy} />}
              {activeTab === "analytics" && <PlaceholderTab title="Analytics" description="Track quiz performance and insights." icon={BarChart3} />}
              {activeTab === "discussion" && <PlaceholderTab title="Discussion" description="Monitor comments and questions." icon={MessageSquare} />}
              {activeTab === "certificates" && <PlaceholderTab title="Certificates" description="Issue and manage certificates." icon={FileBadge} />}
              {activeTab === "announcements" && <PlaceholderTab title="Announcements" description="Send announcements to participants." icon={Megaphone} />}
              {activeTab === "collaborators" && <PlaceholderTab title="Collaborators" description="Manage editors and reviewers." icon={UserPlus} />}

              {activeTab === "preview" && (
                <PreviewTab
                  quizName={settings.general.name || quizName}
                  questions={questions}
                  onEditQuestions={() => setShowQuestionBuilder(true)}
                />
              )}

              {activeTab === "publish" && (
                <PublishTab
                  checklist={checklist}
                  readinessCount={readinessCount}
                  onPreview={() => setActiveTab("preview")}
                  onOpenBuilder={() => setShowQuestionBuilder(true)}
                  onOpenSettings={() => setShowSettingsView(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ===== Overview Tab =====
function OverviewTab({
  quizId,
  quizName,
  quizDescription,
  questionsCount,
  totalMarks,
  validationSummary,
  checklist,
  readinessCount,
  recentActivity,
  onOpenBuilder,
  onOpenSettings,
  onPreview,
  onPublish,
}: {
  quizId: string;
  quizName: string;
  quizDescription: string;
  questionsCount: number;
  totalMarks: number;
  validationSummary: { valid: number; total: number };
  checklist: Array<{ id: string; label: string; passed: boolean }>;
  readinessCount: number;
  recentActivity: Array<{ icon: any; text: string; time: string; type: string }>;
  onOpenBuilder: () => void;
  onOpenSettings: () => void;
  onPreview: () => void;
  onPublish: () => void;
}) {
  const stats = [
    { label: "Quiz Status", value: "Draft", icon: Clock, color: "#F59E0B" },
    { label: "Questions", value: String(questionsCount), icon: ListChecks, color: "#EC4899" },
    { label: "Total Marks", value: String(totalMarks), icon: Target, color: "#EC4899" },
    { label: "Registered", value: "0", icon: Users, color: "#22C55E" },
    { label: "Attempts", value: "0", icon: Activity, color: "#EC4899" },
    { label: "Visibility", value: "Private", icon: Shield, color: "#F97316" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{quizName}</h1>
          <p className="text-xs text-[#6B7280] mt-1">{quizDescription || "No description yet"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onPreview} className="h-8 px-3 rounded-lg border border-border bg-white/[0.04] text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" /> Preview Quiz
          </button>
          <button onClick={onPublish} className="h-8 px-3 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#EC4899] text-xs font-bold text-white hover:shadow-lg hover:shadow-[#EC4899]/20 transition-all flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5" /> Publish Quiz
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <stat.icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
              <p className="text-[9px] font-medium text-[#6B7280]">{stat.label}</p>
            </div>
            <p className="text-lg font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickActionButton icon={Pencil} label="Edit Information" onClick={onOpenSettings} color="#EC4899" />
        <QuickActionButton icon={ListChecks} label="Open Question Builder" onClick={onOpenBuilder} color="#EC4899" />
        <QuickActionButton icon={Eye} label="Preview Quiz" onClick={onPreview} color="#22C55E" />
        <QuickActionButton icon={Send} label="Publish Quiz" onClick={onPublish} color="#F59E0B" />
      </div>

      {/* Generate Results */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Results & Reports</h3>
        <div className="max-w-xs">
          <GenerateResultsButton quizId={quizId} quizName={quizName} />
        </div>
      </div>

      {/* Completion Checklist + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Checklist */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Completion Checklist</h3>
            <span className="text-xs text-muted-foreground">{readinessCount}/{checklist.length}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-4">
            <motion.div
              className="h-full bg-gradient-to-r from-[#22C55E] to-[#EC4899]"
              initial={{ width: 0 }}
              animate={{ width: `${(readinessCount / checklist.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="space-y-2">
            {checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-2.5">
                {item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-[#6B7280] shrink-0" />
                )}
                <span className={`text-xs ${item.passed ? "text-[#22C55E]" : "text-muted-foreground"}`}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-border-hover flex items-center justify-center shrink-0">
                  <activity.icon className="w-3.5 h-3.5 text-[#EC4899]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white">{activity.text}</p>
                  <p className="text-[9px] text-[#6B7280] mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question Status */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Questions Status</h3>
          <button onClick={onOpenBuilder} className="text-xs font-semibold text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1">
            Open Builder <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white/[0.03] border-4 border-[#EC4899]/20 flex items-center justify-center relative">
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent"
              style={{
                borderTopColor: validationSummary.total > 0 ? "#EC4899" : "transparent",
                borderRightColor: validationSummary.total > 0 ? "#EC4899" : "transparent",
                transform: `rotate(${Math.min((validationSummary.valid / Math.max(validationSummary.total, 1)) * 360, 360)}deg)`,
              }}
            />
            <span className="text-sm font-bold text-white">{validationSummary.valid}/{validationSummary.total}</span>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              <span className="text-[#22C55E] font-bold">{validationSummary.valid}</span> valid questions
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-[#F59E0B] font-bold">{validationSummary.total - validationSummary.valid}</span> need attention
            </p>
            <p className="text-xs text-muted-foreground">
              <span className="text-white font-bold">{totalMarks}</span> total marks
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Quick Action Button =====
function QuickActionButton({ icon: Icon, label, onClick, color }: { icon: any; label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-border bg-card p-3.5 hover:border-white/[0.15] hover:bg-white/[0.04] transition-all group"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <span className="text-xs font-medium text-white group-hover:text-white">{label}</span>
      <ChevronRight className="w-3.5 h-3.5 text-[#6B7280] ml-auto group-hover:text-muted-foreground transition-colors" />
    </button>
  );
}

// ===== Participants Tab =====
function ParticipantsTab({ quizId }: { quizId: string }) {
  const [participants, setParticipants] = useState<QuizParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState<number | null>(null);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQuizParticipants(quizId);
      setParticipants(data);
    } catch (err) {
      setError("Failed to load participants");
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const filtered = useMemo(() => {
    let list = participants;
    if (filterSource !== null) {
      list = list.filter((p) => p.source === filterSource);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.username?.toLowerCase().includes(q) ||
          p.first_name?.toLowerCase().includes(q) ||
          p.last_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [participants, searchQuery, filterSource]);

  const sourceCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const p of participants) {
      counts[p.source] = (counts[p.source] || 0) + 1;
    }
    return counts;
  }, [participants]);

  const getSourceInfo = (source: number) =>
    PARTICIPANT_SOURCE[source] ?? { label: `Source ${source}`, color: "bg-gray-500/15 text-gray-400 border-gray-500/20" };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Participants</h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {participants.length} participant{participants.length !== 1 ? "s" : ""} in this quiz
          </p>
        </div>
        <button
          onClick={fetchParticipants}
          disabled={loading}
          className="h-8 px-3 rounded-lg border border-border bg-white/[0.04] text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Source filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterSource(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            filterSource === null
              ? "bg-white/10 text-white border-white/20"
              : "bg-white/[0.03] text-[#6B7280] border-border hover:text-white"
          }`}
        >
          All ({participants.length})
        </button>
        {[1, 2, 4].map((src) => {
          const info = getSourceInfo(src);
          const count = sourceCounts[src] || 0;
          return (
            <button
              key={src}
              onClick={() => setFilterSource(filterSource === src ? null : src)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                filterSource === src
                  ? info.color + " border-current"
                  : "bg-white/[0.03] text-[#6B7280] border-border hover:text-white"
              }`}
            >
              {info.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-white/[0.04] text-xs text-white placeholder-[#6B7280] outline-none focus:border-[#EC4899]/40 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-[#EC4899] animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetchParticipants} className="mt-3 text-xs text-[#EC4899] hover:underline">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Users className="w-10 h-10 text-[#6B7280] mb-3" />
          <h3 className="text-sm font-semibold text-white mb-1">
            {participants.length === 0 ? "No participants yet" : "No matches"}
          </h3>
          <p className="text-xs text-[#6B7280]">
            {participants.length === 0
              ? "Participants will appear here once they are added via rooms or invited."
              : "Try a different search or filter."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">User</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Source</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Status</th>
                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Added</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const srcInfo = getSourceInfo(p.source);
                const displayName = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.username || `User #${p.user_id}`;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EC4899]/20 to-[#3B82F6]/20 border border-white/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-[#EC4899]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{displayName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${srcInfo.color}`}>
                        {srcInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${p.status === 1 ? "text-emerald-400" : "text-red-400"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.status === 1 ? "bg-emerald-400" : "bg-red-400"}`} />
                        {p.status === 1 ? "Allowed" : "Not allowed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-[#6B7280]">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== Placeholder Tab =====
function PlaceholderTab({ title, description, icon: Icon }: { title: string; description: string; icon: any }) {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#EC4899]/10 border border-[#EC4899]/20 flex items-center justify-center">
          <Icon className="w-8 h-8 text-[#EC4899]" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
        <p className="text-xs text-[#6B7280]">{description}</p>
        <p className="text-[10px] text-[#6B7280] mt-2">This module will be available after publishing.</p>
      </div>
    </div>
  );
}

// ===== Preview Tab =====
function PreviewTab({ quizName, questions, onEditQuestions }: { quizName: string; questions: StudioQuestion[]; onEditQuestions: () => void }) {
  if (questions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ListChecks className="w-10 h-10 mx-auto text-[#6B7280] mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">No questions to preview</h2>
          <p className="text-xs text-[#6B7280] mb-4">Add questions first, then preview how learners will see them.</p>
          <button onClick={onEditQuestions} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#EC4899] text-xs font-bold text-white hover:shadow-lg hover:shadow-[#EC4899]/20 transition-all">
            <Plus className="w-4 h-4" /> Open Question Builder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-6 py-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">{quizName} — Preview</h2>
        <button onClick={onEditQuestions} className="text-xs font-semibold text-[#EC4899] hover:text-[#DB2777] transition-colors">
          Edit Questions
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        <QuizStudio />
      </div>
    </div>
  );
}

// ===== Publish Tab =====
function PublishTab({
  checklist,
  readinessCount,
  onPreview,
  onOpenBuilder,
  onOpenSettings,
}: {
  checklist: Array<{ id: string; label: string; passed: boolean }>;
  readinessCount: number;
  onPreview: () => void;
  onOpenBuilder: () => void;
  onOpenSettings: () => void;
}) {
  const allReady = readinessCount === checklist.length;

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto mb-4 rounded-3xl flex items-center justify-center border ${allReady ? "bg-[#22C55E]/10 border-[#22C55E]/30" : "bg-[#F59E0B]/10 border-[#F59E0B]/30"}`}>
            {allReady ? <Check className="w-9 h-9 text-[#22C55E]" /> : <AlertCircle className="w-9 h-9 text-[#F59E0B]" />}
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {allReady ? "Ready to Publish!" : "Almost There"}
          </h2>
          <p className="text-xs text-[#6B7280]">
            {allReady
              ? "Your quiz meets all requirements. You can now publish it."
              : `${checklist.length - readinessCount} items remaining before you can publish.`}
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                item.passed ? "border-[#22C55E]/20 bg-[#22C55E]/5" : "border-border bg-white/[0.02]"
              }`}
            >
              {item.passed ? (
                <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-[#6B7280] shrink-0" />
              )}
              <span className={`text-xs flex-1 ${item.passed ? "text-[#22C55E]" : "text-muted-foreground"}`}>{item.label}</span>
              {!item.passed && item.id === "info" && (
                <button onClick={onOpenSettings} className="text-[10px] font-semibold text-[#EC4899] hover:text-[#DB2777]">Fix</button>
              )}
              {!item.passed && (item.id === "questions" || item.id === "answers" || item.id === "marks") && (
                <button onClick={onOpenBuilder} className="text-[10px] font-semibold text-[#EC4899] hover:text-[#DB2777]">Fix</button>
              )}
              {!item.passed && item.id === "preview" && (
                <button onClick={onPreview} className="text-[10px] font-semibold text-[#EC4899] hover:text-[#DB2777]">Preview</button>
              )}
            </div>
          ))}
        </div>

        <button
          disabled={!allReady}
          className={`w-full h-11 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            allReady
              ? "bg-gradient-to-r from-[#22C55E] to-[#EC4899] text-white hover:shadow-lg hover:shadow-[#22C55E]/20"
              : "bg-white/[0.05] text-[#6B7280] cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
          {allReady ? "Publish Quiz" : "Complete Checklist to Publish"}
        </button>
      </div>
    </div>
  );
}