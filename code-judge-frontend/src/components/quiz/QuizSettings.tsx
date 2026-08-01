"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  Info,
  Timer,
  RotateCcw,
  LifeBuoy,
  Navigation,
  Eye,
  CalendarClock,
  Award,
  FileBadge,
  Trophy,
  MessageSquare,
  Shield,
  Bell,
  Rocket,
  ChevronRight,
  Check,
  X,
  ArrowLeft,
  Search,
  Globe,
  Lock,
  Target,
  BookOpen,
  Users,
  Sparkles,
  Clock,
  Hash,
  FileText,
  Wand2,
} from "lucide-react";
import {
  QuizSettingsConfig,
  QuizVisibility,
  LifecycleSetting,
} from "@/types/quiz";

interface QuizSettingsProps {
  quizId: string;
  quizName: string;
  settings: QuizSettingsConfig;
  onChange: (settings: QuizSettingsConfig) => void;
  onBack?: () => void;
}

type SettingsCategory =
  | "general"
  | "assessment"
  | "attempts"
  | "lifelines"
  | "navigation"
  | "visibility"
  | "scheduling"
  | "scoring"
  | "certificates"
  | "leaderboard"
  | "discussion"
  | "security"
  | "notifications"
  | "advanced";

const CATEGORIES: { id: SettingsCategory; label: string; icon: any; description: string }[] = [
  { id: "general", label: "General", icon: Info, description: "Quiz name, description, thumbnail, tags" },
  { id: "assessment", label: "Assessment", icon: Timer, description: "Duration, passing marks, randomization" },
  { id: "attempts", label: "Attempts", icon: RotateCcw, description: "Attempt limits, cooldowns, retake rules" },
  { id: "lifelines", label: "Lifelines", icon: LifeBuoy, description: "Configure 50-50, hints, skips, extra time" },
  { id: "navigation", label: "Navigation", icon: Navigation, description: "Previous/next, jumping, review, lock" },
  { id: "visibility", label: "Visibility", icon: Eye, description: "Who can see and access the quiz" },
  { id: "scheduling", label: "Scheduling", icon: CalendarClock, description: "Registration and assessment windows" },
  { id: "scoring", label: "Scoring", icon: Award, description: "Positive, negative, partial marks" },
  { id: "certificates", label: "Certificates", icon: FileBadge, description: "Certificate templates and rules" },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy, description: "Rankings, anonymity, real-time" },
  { id: "discussion", label: "Discussion", icon: MessageSquare, description: "Comments, questions, moderation" },
  { id: "security", label: "Security", icon: Shield, description: "Fullscreen, copy protection, restrictions" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Reminders, results, certificates" },
  { id: "advanced", label: "Advanced", icon: Rocket, description: "APIs, webhooks, branding, plugins" },
];

const VISIBILITY_OPTIONS: { value: QuizVisibility; label: string; icon: any; description: string }[] = [
  { value: "global", label: "Global", icon: Globe, description: "Anyone can see and attempt" },
  { value: "college_only", label: "College", icon: Users, description: "Restricted to specific colleges" },
  { value: "company_only", label: "Company", icon: Users, description: "Restricted to specific companies" },
  { value: "organization", label: "Organization", icon: Users, description: "Restricted to organizations" },
  { value: "private", label: "Private", icon: Lock, description: "Only you can see" },
  { value: "invite_only", label: "Invite Only", icon: Lock, description: "Only invited users" },
  { value: "classroom", label: "Classroom", icon: BookOpen, description: "Restricted to a classroom" },
  { value: "contest_only", label: "Contest", icon: Trophy, description: "Only during a contest" },
];

const LIFELINE_LABELS: Record<string, { label: string; icon: any; description: string }> = {
  fifty_fifty: { label: "50-50", icon: Target, description: "Removes two incorrect options" },
  hint: { label: "Hint", icon: LightbulbIcon, description: "Shows a creator-provided hint" },
  skip: { label: "Skip Question", icon: Navigation, description: "Skip the question without penalty" },
  extra_time: { label: "Extra Time", icon: Clock, description: "Adds 30 seconds to the timer" },
  reveal_explanation: { label: "Reveal Explanation", icon: Eye, description: "Shows explanation immediately (Practice Mode only)" },
  formula_sheet: { label: "Formula Sheet", icon: FileText, description: "Opens reference notes" },
};

function LightbulbIcon({ className }: { className?: string }) {
  return <Sparkles className={className} />;
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-xs font-medium text-white">{label}</p>
        {description && <p className="text-[10px] text-[#6B7280] mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
          checked ? "bg-[#7C3AED]" : "bg-white/10"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function NumberField({ label, value, onChange, min = 0, suffix, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min?: number; suffix?: string; step?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-[#9CA3AF]">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          step={step}
          className="w-full h-9 px-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs text-white focus:border-[#7C3AED] focus:outline-none"
        />
        {suffix && <span className="text-[10px] text-[#6B7280] shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-[#9CA3AF]">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED] focus:outline-none"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-[#9CA3AF]">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full px-2 py-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED] focus:outline-none resize-none"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, suffix }: { label: string; value: string; onChange: (v: string) => void; options: string[]; suffix?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium text-[#9CA3AF]">{label}</label>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 px-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs text-white focus:border-[#7C3AED] focus:outline-none"
        >
          {options.map((opt) => (
            <option key={opt} value={opt.toLowerCase().replace(/\s+/g, "_")}>{opt}</option>
          ))}
        </select>
        {suffix && <span className="text-[10px] text-[#6B7280] shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111827] p-4 space-y-3">
      <div>
        <h3 className="text-xs font-bold text-white">{title}</h3>
        {description && <p className="text-[10px] text-[#6B7280] mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function LightbulbIcon2({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function defaultSettings(quizName: string): QuizSettingsConfig {
  return {
    general: {
      name: quizName,
      description: "",
      tags: [],
      language: "English",
    },
    assessment: {
      duration: 30,
      passingMarks: 40,
      negativeMarking: false,
      negativeMarkValue: 0,
      questionRandomization: false,
      optionRandomization: false,
      practiceMode: false,
      autoSubmit: true,
    },
    attempts: {
      attemptsAllowed: 3,
      cooldownBetweenAttempts: 0,
      retakeRules: "limited",
      scoreMethod: "best",
      leaderboardMethod: "best",
    },
    lifelines: {
      fifty_fifty: { enabled: true, maxUses: 1, penalty: 0, description: "Removes two incorrect options" },
      hint: { enabled: true, maxUses: 2, penalty: 0, description: "Shows a creator-provided hint" },
      skip: { enabled: true, maxUses: 1, penalty: 0, description: "Skip the question without penalty" },
      extra_time: { enabled: true, maxUses: 1, penalty: 0, description: "Adds 30 seconds to the timer" },
      reveal_explanation: { enabled: false, maxUses: 0, penalty: 0, description: "Shows explanation immediately (Practice Mode only)" },
      formula_sheet: { enabled: false, maxUses: 0, penalty: 0, description: "Opens reference notes" },
    },
    navigation: {
      allowPrevious: true,
      allowNext: true,
      allowJumpToQuestion: true,
      allowReview: true,
      lockAfterAnswer: false,
      sequentialMode: false,
      freeNavigation: true,
    },
    visibility: {
      type: "private",
      restrictions: {
        verifiedEmail: false,
        verifiedCollege: false,
        verifiedCompany: false,
        minXP: undefined,
      },
    },
    scheduling: {
      timezone: "Asia/Kolkata",
      lateEntryPolicy: "allowed",
    },
    scoring: {
      positiveMarks: 10,
      negativeMarks: 0,
      negativeMarkValue: 0,
      partialMarking: false,
      bonusQuestions: false,
      mandatoryQuestions: false,
      weightage: false,
    },
    certificates: {
      enabled: false,
      minimumPassingPercentage: 60,
      issueAutomatically: true,
    },
    leaderboard: {
      enabled: true,
      hideUntilEnd: false,
      anonymousMode: false,
      realtimeRanking: true,
    },
    discussion: {
      enableComments: true,
      allowQuestions: true,
      moderation: false,
      anonymousDiscussions: false,
    },
    security: {
      fullscreenMode: false,
      tabSwitchingDetection: false,
      copyProtection: false,
      pasteRestriction: false,
      devToolsDetection: false,
      ipRestriction: false,
      oneDeviceOnly: false,
    },
    notifications: {
      reminderBeforeQuiz: true,
      resultPublished: true,
      registrationConfirmation: true,
      certificateReady: true,
      leaderboardUpdates: false,
    },
    advanced: {
      apiIntegrations: false,
      customBranding: false,
      customCss: false,
      plugins: false,
      enterpriseSettings: false,
    },
  };
}

export default function QuizSettings({ quizId, quizName, settings: externalSettings, onChange, onBack }: QuizSettingsProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("general");
  const [searchQuery, setSearchQuery] = useState("");

  const settings = useMemo(() => {
    if (externalSettings && externalSettings.general) return externalSettings;
    return defaultSettings(quizName);
  }, [externalSettings, quizName]);

  const updateSection = (section: keyof QuizSettingsConfig, updates: Record<string, any>) => {
    onChange({
      ...settings,
      [section]: { ...settings[section], ...updates },
    });
  };

  const updateLifecycle = (key: string, updates: Partial<LifecycleSetting>) => {
    onChange({
      ...settings,
      lifelines: {
        ...settings.lifelines,
        [key]: { ...settings.lifelines[key], ...updates },
      },
    });
  };

  const filteredCategories = CATEGORIES.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
  });

  const renderContent = () => {
    switch (activeCategory) {
      case "general":
        return (
          <div className="space-y-4">
            <SectionCard title="General Information" description="Basic details about your quiz">
              <TextField
                label="Quiz Name"
                value={settings.general.name}
                onChange={(v) => updateSection("general", { name: v })}
                placeholder="Enter quiz name"
              />
              <TextAreaField
                label="Description"
                value={settings.general.description}
                onChange={(v) => updateSection("general", { description: v })}
                placeholder="Describe your quiz"
              />
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Category"
                  value={settings.general.category || ""}
                  onChange={(v) => updateSection("general", { category: v })}
                  placeholder="e.g. Computer Science"
                />
                <TextField
                  label="Language"
                  value={settings.general.language}
                  onChange={(v) => updateSection("general", { language: v })}
                  placeholder="e.g. English"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-[#9CA3AF]">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {settings.general.tags.map((tag, i) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[9px] font-medium text-[#7C3AED] flex items-center gap-1">
                      {tag}
                      <button onClick={() => updateSection("general", { tags: settings.general.tags.filter((_, j) => j !== i) })}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    className="h-6 px-2 rounded-lg bg-transparent text-[10px] text-white placeholder-[#6B7280] focus:outline-none border border-white/[0.06] w-24"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                        const val = (e.target as HTMLInputElement).value.trim();
                        updateSection("general", { tags: [...settings.general.tags, val] });
                        (e.target as HTMLInputElement).value = "";
                      }
                    }}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        );

      case "assessment":
        return (
          <div className="space-y-4">
            <SectionCard title="Assessment Configuration" description="Duration, passing criteria, and randomization rules">
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Duration (minutes)" value={settings.assessment.duration} onChange={(v) => updateSection("assessment", { duration: v })} min={1} />
                <NumberField label="Passing Marks (%)" value={settings.assessment.passingMarks} onChange={(v) => updateSection("assessment", { passingMarks: v })} min={0} suffix="%" />
                <NumberField label="Time Per Question (seconds)" value={settings.assessment.timePerQuestion || 0} onChange={(v) => updateSection("assessment", { timePerQuestion: v })} min={0} suffix="s" />
              </div>
              <div className="border-t border-white/[0.06] pt-2">
                <Toggle label="Negative Marking" description="Deduct marks for wrong answers" checked={settings.assessment.negativeMarking} onChange={(v) => updateSection("assessment", { negativeMarking: v })} />
                {settings.assessment.negativeMarking && (
                  <NumberField label="Negative Mark Value" value={settings.assessment.negativeMarkValue} onChange={(v) => updateSection("assessment", { negativeMarkValue: v })} min={0} />
                )}
              </div>
              <div className="border-t border-white/[0.06] pt-2 space-y-1">
                <Toggle label="Randomize Questions" checked={settings.assessment.questionRandomization} onChange={(v) => updateSection("assessment", { questionRandomization: v })} />
                <Toggle label="Randomize Options" checked={settings.assessment.optionRandomization} onChange={(v) => updateSection("assessment", { optionRandomization: v })} />
                <Toggle label="Practice Mode" description="Allow learners to practice without score" checked={settings.assessment.practiceMode} onChange={(v) => updateSection("assessment", { practiceMode: v })} />
                <Toggle label="Auto Submit" description="Automatically submit when time runs out" checked={settings.assessment.autoSubmit} onChange={(v) => updateSection("assessment", { autoSubmit: v })} />
              </div>
            </SectionCard>
          </div>
        );

      case "attempts":
        return (
          <div className="space-y-4">
            <SectionCard title="Attempt Configuration" description="How many attempts and retake rules">
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Attempts Allowed" value={settings.attempts.attemptsAllowed} onChange={(v) => updateSection("attempts", { attemptsAllowed: v })} min={1} />
                <NumberField label="Cooldown (minutes)" value={settings.attempts.cooldownBetweenAttempts} onChange={(v) => updateSection("attempts", { cooldownBetweenAttempts: v })} min={0} />
              </div>
              <SelectField label="Retake Rules" value={settings.attempts.retakeRules} onChange={(v) => updateSection("attempts", { retakeRules: v })} options={["Unlimited", "Limited", "Once"]} />
              <SelectField label="Score Method" value={settings.attempts.scoreMethod} onChange={(v) => updateSection("attempts", { scoreMethod: v })} options={["Best", "Latest", "Highest"]} />
              <SelectField label="Leaderboard Method" value={settings.attempts.leaderboardMethod} onChange={(v) => updateSection("attempts", { leaderboardMethod: v })} options={["Best", "Latest", "Highest"]} />
            </SectionCard>
          </div>
        );

      case "lifelines":
        return (
          <div className="space-y-4">
            <SectionCard title="Lifelines" description="Configure each lifeline independently. Backend enforces usage limits.">
              {Object.entries(LIFELINE_LABELS).map(([key, meta]) => {
                const config = settings.lifelines[key] || { enabled: false, maxUses: 0, penalty: 0, description: meta.description };
                return (
                  <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center shrink-0">
                        <meta.icon className="w-3.5 h-3.5 text-[#7C3AED]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white">{meta.label}</p>
                        <p className="text-[10px] text-[#6B7280]">{config.description || meta.description}</p>
                      </div>
                      <button
                        onClick={() => updateLifecycle(key, { enabled: !config.enabled })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                          config.enabled ? "bg-[#7C3AED]" : "bg-white/10"
                        }`}
                      >
                        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${config.enabled ? "translate-x-4" : "translate-x-1"}`} />
                      </button>
                    </div>
                    {config.enabled && (
                      <div className="grid grid-cols-2 gap-3 pl-10">
                        <NumberField label="Maximum Uses" value={config.maxUses} onChange={(v) => updateLifecycle(key, { maxUses: v })} min={0} />
                        <NumberField label="Penalty" value={config.penalty} onChange={(v) => updateLifecycle(key, { penalty: v })} min={0} suffix="XP" />
                      </div>
                    )}
                  </div>
                );
              })}
            </SectionCard>
          </div>
        );

      case "navigation":
        return (
          <div className="space-y-4">
            <SectionCard title="Navigation" description="How learners move between questions">
              <Toggle label="Allow Previous" checked={settings.navigation.allowPrevious} onChange={(v) => updateSection("navigation", { allowPrevious: v })} />
              <Toggle label="Allow Next" checked={settings.navigation.allowNext} onChange={(v) => updateSection("navigation", { allowNext: v })} />
              <Toggle label="Allow Jump to Question" checked={settings.navigation.allowJumpToQuestion} onChange={(v) => updateSection("navigation", { allowJumpToQuestion: v })} />
              <Toggle label="Allow Review" description="Go back and change answers" checked={settings.navigation.allowReview} onChange={(v) => updateSection("navigation", { allowReview: v })} />
              <Toggle label="Lock After Answer" checked={settings.navigation.lockAfterAnswer} onChange={(v) => updateSection("navigation", { lockAfterAnswer: v })} />
              <Toggle label="Sequential Mode" description="Must answer in order" checked={settings.navigation.sequentialMode} onChange={(v) => updateSection("navigation", { sequentialMode: v })} />
              <Toggle label="Free Navigation" checked={settings.navigation.freeNavigation} onChange={(v) => updateSection("navigation", { freeNavigation: v })} />
            </SectionCard>
          </div>
        );

      case "visibility":
        return (
          <div className="space-y-4">
            <SectionCard title="Visibility" description="Who can see and access your quiz">
              <div className="grid grid-cols-2 gap-2">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateSection("visibility", { type: opt.value })}
                    className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                      settings.visibility.type === opt.value
                        ? "border-[#7C3AED]/40 bg-[#7C3AED]/10"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                    }`}
                  >
                    <opt.icon className={`w-4 h-4 mt-0.5 shrink-0 ${settings.visibility.type === opt.value ? "text-[#7C3AED]" : "text-[#6B7280]"}`} />
                    <div>
                      <p className="text-[11px] font-medium text-white">{opt.label}</p>
                      <p className="text-[9px] text-[#6B7280]">{opt.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Restrictions" description="Additional access requirements">
              <Toggle label="Verified Email Required" checked={settings.visibility.restrictions.verifiedEmail} onChange={(v) => updateSection("visibility", { restrictions: { ...settings.visibility.restrictions, verifiedEmail: v } })} />
              <Toggle label="Verified College Required" checked={settings.visibility.restrictions.verifiedCollege} onChange={(v) => updateSection("visibility", { restrictions: { ...settings.visibility.restrictions, verifiedCollege: v } })} />
              <Toggle label="Verified Company Required" checked={settings.visibility.restrictions.verifiedCompany} onChange={(v) => updateSection("visibility", { restrictions: { ...settings.visibility.restrictions, verifiedCompany: v } })} />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <TextField label="Invite Code" value={settings.visibility.restrictions.inviteCode || ""} onChange={(v) => updateSection("visibility", { restrictions: { ...settings.visibility.restrictions, inviteCode: v } })} />
                <NumberField label="Minimum XP" value={settings.visibility.restrictions.minXP || 0} onChange={(v) => updateSection("visibility", { restrictions: { ...settings.visibility.restrictions, minXP: v } })} min={0} />
              </div>
            </SectionCard>
          </div>
        );

      case "scheduling":
        return (
          <div className="space-y-4">
            <SectionCard title="Scheduling" description="Registration and assessment windows">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-[#9CA3AF]">Registration Opens</label>
                  <input
                    type="datetime-local"
                    value={settings.scheduling.registrationOpens || ""}
                    onChange={(e) => updateSection("scheduling", { registrationOpens: e.target.value })}
                    className="w-full h-9 px-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs text-white focus:border-[#7C3AED] focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-[#9CA3AF]">Registration Closes</label>
                  <input
                    type="datetime-local"
                    value={settings.scheduling.registrationCloses || ""}
                    onChange={(e) => updateSection("scheduling", { registrationCloses: e.target.value })}
                    className="w-full h-9 px-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs text-white focus:border-[#7C3AED] focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-[#9CA3AF]">Assessment Starts</label>
                  <input
                    type="datetime-local"
                    value={settings.scheduling.assessmentStarts || ""}
                    onChange={(e) => updateSection("scheduling", { assessmentStarts: e.target.value })}
                    className="w-full h-9 px-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs text-white focus:border-[#7C3AED] focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-[#9CA3AF]">Assessment Ends</label>
                  <input
                    type="datetime-local"
                    value={settings.scheduling.assessmentEnds || ""}
                    onChange={(e) => updateSection("scheduling", { assessmentEnds: e.target.value })}
                    className="w-full h-9 px-2 rounded-lg border border-white/[0.08] bg-[#0B0D12] text-xs text-white focus:border-[#7C3AED] focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <SelectField label="Timezone" value={settings.scheduling.timezone} onChange={(v) => updateSection("scheduling", { timezone: v })} options={["Asia/Kolkata", "UTC", "America/New_York", "Europe/London", "Asia/Tokyo"]} />
                <SelectField label="Late Entry Policy" value={settings.scheduling.lateEntryPolicy} onChange={(v) => updateSection("scheduling", { lateEntryPolicy: v })} options={["Allowed", "Blocked", "Penalty"]} />
              </div>
            </SectionCard>
          </div>
        );

      case "scoring":
        return (
          <div className="space-y-4">
            <SectionCard title="Scoring" description="Marks configuration">
              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Positive Marks" value={settings.scoring.positiveMarks} onChange={(v) => updateSection("scoring", { positiveMarks: v })} min={0} />
                <NumberField label="Negative Marks" value={settings.scoring.negativeMarks} onChange={(v) => updateSection("scoring", { negativeMarks: v })} min={0} />
                {settings.scoring.negativeMarks > 0 && (
                  <NumberField label="Negative Mark Value" value={settings.scoring.negativeMarkValue} onChange={(v) => updateSection("scoring", { negativeMarkValue: v })} min={0} />
                )}
              </div>
              <div className="border-t border-white/[0.06] pt-2 space-y-1">
                <Toggle label="Partial Marking" description="Award partial marks for multiple correct" checked={settings.scoring.partialMarking} onChange={(v) => updateSection("scoring", { partialMarking: v })} />
                <Toggle label="Bonus Questions" checked={settings.scoring.bonusQuestions} onChange={(v) => updateSection("scoring", { bonusQuestions: v })} />
                <Toggle label="Mandatory Questions" checked={settings.scoring.mandatoryQuestions} onChange={(v) => updateSection("scoring", { mandatoryQuestions: v })} />
                <Toggle label="Weightage" description="Enable per-topic weightage" checked={settings.scoring.weightage} onChange={(v) => updateSection("scoring", { weightage: v })} />
              </div>
            </SectionCard>
          </div>
        );

      case "certificates":
        return (
          <div className="space-y-4">
            <SectionCard title="Certificates" description="Issue completion certificates">
              <Toggle label="Enable Certificates" checked={settings.certificates.enabled} onChange={(v) => updateSection("certificates", { enabled: v })} />
              {settings.certificates.enabled && (
                <>
                  <NumberField label="Minimum Passing %" value={settings.certificates.minimumPassingPercentage} onChange={(v) => updateSection("certificates", { minimumPassingPercentage: v })} min={0} suffix="%" />
                  <Toggle label="Issue Automatically" checked={settings.certificates.issueAutomatically} onChange={(v) => updateSection("certificates", { issueAutomatically: v })} />
                  <TextField label="Certificate Template" value={settings.certificates.template || ""} onChange={(v) => updateSection("certificates", { template: v })} placeholder="Template ID or name" />
                </>
              )}
            </SectionCard>
          </div>
        );

      case "leaderboard":
        return (
          <div className="space-y-4">
            <SectionCard title="Leaderboard" description="Ranking configuration">
              <Toggle label="Enable Leaderboard" checked={settings.leaderboard.enabled} onChange={(v) => updateSection("leaderboard", { enabled: v })} />
              {settings.leaderboard.enabled && (
                <>
                  <Toggle label="Hide Until End" checked={settings.leaderboard.hideUntilEnd} onChange={(v) => updateSection("leaderboard", { hideUntilEnd: v })} />
                  <Toggle label="Anonymous Mode" checked={settings.leaderboard.anonymousMode} onChange={(v) => updateSection("leaderboard", { anonymousMode: v })} />
                  <Toggle label="Real-time Ranking" checked={settings.leaderboard.realtimeRanking} onChange={(v) => updateSection("leaderboard", { realtimeRanking: v })} />
                </>
              )}
            </SectionCard>
          </div>
        );

      case "discussion":
        return (
          <div className="space-y-4">
            <SectionCard title="Discussion" description="Comments and questions">
              <Toggle label="Enable Comments" checked={settings.discussion.enableComments} onChange={(v) => updateSection("discussion", { enableComments: v })} />
              <Toggle label="Allow Questions" checked={settings.discussion.allowQuestions} onChange={(v) => updateSection("discussion", { allowQuestions: v })} />
              <Toggle label="Moderation" checked={settings.discussion.moderation} onChange={(v) => updateSection("discussion", { moderation: v })} />
              <Toggle label="Anonymous Discussions" checked={settings.discussion.anonymousDiscussions} onChange={(v) => updateSection("discussion", { anonymousDiscussions: v })} />
            </SectionCard>
          </div>
        );

      case "security":
        return (
          <div className="space-y-4">
            <SectionCard title="Security" description="Protect your quiz from cheating">
              <Toggle label="Fullscreen Mode" description="Require fullscreen during attempt" checked={settings.security.fullscreenMode} onChange={(v) => updateSection("security", { fullscreenMode: v })} />
              <Toggle label="Tab Switching Detection" checked={settings.security.tabSwitchingDetection} onChange={(v) => updateSection("security", { tabSwitchingDetection: v })} />
              <Toggle label="Copy Protection" checked={settings.security.copyProtection} onChange={(v) => updateSection("security", { copyProtection: v })} />
              <Toggle label="Paste Restriction" checked={settings.security.pasteRestriction} onChange={(v) => updateSection("security", { pasteRestriction: v })} />
              <Toggle label="Developer Tools Detection" description="Future feature" checked={settings.security.devToolsDetection} onChange={(v) => updateSection("security", { devToolsDetection: v })} />
              <Toggle label="IP Restriction" checked={settings.security.ipRestriction} onChange={(v) => updateSection("security", { ipRestriction: v })} />
              <Toggle label="One Device Only" checked={settings.security.oneDeviceOnly} onChange={(v) => updateSection("security", { oneDeviceOnly: v })} />
            </SectionCard>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4">
            <SectionCard title="Notifications" description="Email and in-app notifications">
              <Toggle label="Reminder Before Quiz" checked={settings.notifications.reminderBeforeQuiz} onChange={(v) => updateSection("notifications", { reminderBeforeQuiz: v })} />
              <Toggle label="Result Published" checked={settings.notifications.resultPublished} onChange={(v) => updateSection("notifications", { resultPublished: v })} />
              <Toggle label="Registration Confirmation" checked={settings.notifications.registrationConfirmation} onChange={(v) => updateSection("notifications", { registrationConfirmation: v })} />
              <Toggle label="Certificate Ready" checked={settings.notifications.certificateReady} onChange={(v) => updateSection("notifications", { certificateReady: v })} />
              <Toggle label="Leaderboard Updates" checked={settings.notifications.leaderboardUpdates} onChange={(v) => updateSection("notifications", { leaderboardUpdates: v })} />
            </SectionCard>
          </div>
        );

      case "advanced":
        return (
          <div className="space-y-4">
            <SectionCard title="Advanced" description="Developer and enterprise features">
              <Toggle label="API Integrations" checked={settings.advanced.apiIntegrations} onChange={(v) => updateSection("advanced", { apiIntegrations: v })} />
              <Toggle label="Custom Branding" checked={settings.advanced.customBranding} onChange={(v) => updateSection("advanced", { customBranding: v })} />
              <Toggle label="Custom CSS" description="Future feature" checked={settings.advanced.customCss} onChange={(v) => updateSection("advanced", { customCss: v })} />
              <Toggle label="Plugins" description="Future feature" checked={settings.advanced.plugins} onChange={(v) => updateSection("advanced", { plugins: v })} />
              <Toggle label="Enterprise Settings" checked={settings.advanced.enterpriseSettings} onChange={(v) => updateSection("advanced", { enterpriseSettings: v })} />
              <div className="pt-2">
                <TextField label="Webhook URL" value={settings.advanced.webhook || ""} onChange={(v) => updateSection("advanced", { webhook: v })} placeholder="https://..." />
              </div>
            </SectionCard>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-[#09090B] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-white/[0.08] bg-[#09090B]/80 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
        <button
          onClick={onBack}
          className="h-8 px-2.5 rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-medium text-[#9CA3AF] hover:text-white hover:bg-white/[0.06] transition-colors flex items-center gap-1.5"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-6 bg-white/[0.08]" />

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#3B82F6] flex items-center justify-center">
            <Settings2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-tight">{quizName}</p>
            <p className="text-[9px] text-[#6B7280]">Quiz Settings</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onBack}
            className="h-8 px-4 rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] text-xs font-bold text-white hover:shadow-lg hover:shadow-[#7C3AED]/20 transition-all flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" /> Done
          </button>
        </div>
      </div>

      {/* Body: Category Sidebar + Settings Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-64 border-r border-white/[0.06] bg-[#0B0D12] flex flex-col shrink-0">
          <div className="p-3 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className="w-full h-8 pl-8 pr-2 rounded-lg border border-white/[0.06] bg-[#111827] text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED]/40 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all ${
                    isActive
                      ? "bg-[#7C3AED]/10 text-white border border-[#7C3AED]/20"
                      : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <cat.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#7C3AED]" : "text-[#6B7280]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium">{cat.label}</p>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-[#7C3AED]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Panel */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-6">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">{CATEGORIES.find((c) => c.id === activeCategory)?.label}</h2>
              <p className="text-[11px] text-[#6B7280]">{CATEGORIES.find((c) => c.id === activeCategory)?.description}</p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}