"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { difficultyColors, optionColors, pinkGradient } from "@/config/quizTheme";

/* ===== Container / Card wrappers ===== */

export function Card({ children, className, hover = false, onClick }: {
  children: ReactNode; className?: string; hover?: boolean; onClick?: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      transition={{ duration: 0.2 }}
      className={`
        rounded-2xl border bg-card
        border-border
        ${hover ? "group hover:border-[#EC4899]/30 hover:shadow-[0_8px_32px_rgba(236,72,153,0.08)] hover:-translate-y-0.5 transition-all duration-300" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className || ""}
      `}
    >
      {children}
    </motion.div>
  );
}

/* ===== StatsCard ===== */

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: any;
  color?: string;
  sub?: string;
}

export function StatsCard({ label, value, icon: Icon, color = "#EC4899", sub }: StatsCardProps) {
  return (
    <Card className="p-4" hover>
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="w-8 h-8 rounded-xl bg-card-hover border border-border flex items-center justify-center">
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <span className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </Card>
  );
}

/* ===== Difficulty Badge ===== */

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const colors = difficultyColors[difficulty] || difficultyColors["Medium"];
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border, borderWidth: 1 }}
    >
      {difficulty}
    </span>
  );
}

/* ===== Visibility Badge ===== */

const VISIBILITY_LABELS: Record<string, { label: string; color: string }> = {
  global: { label: "Global", color: "#22C55E" },
  college_only: { label: "College", color: "#3B82F6" },
  company_only: { label: "Company", color: "#8B5CF6" },
  organization: { label: "Organization", color: "#EC4899" },
  classroom: { label: "Classroom", color: "#F59E0B" },
  unlisted: { label: "Unlisted", color: "#6366F1" },
  private: { label: "Private", color: "#FBBF24" },
  invite_only: { label: "Invite Only", color: "#F43F5E" },
  contest_only: { label: "Contest", color: "#14B8A6" },
};

export function VisibilityBadge({ visibility }: { visibility: string }) {
  const meta = VISIBILITY_LABELS[visibility] || { label: visibility, color: "#9CA3AF" };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[9px] font-medium"
      style={{ backgroundColor: `${meta.color}10`, color: meta.color, borderColor: `${meta.color}30`, borderWidth: 1 }}
    >
      {meta.label}
    </span>
  );
}

/* ===== QuizCard ===== */

export interface QuizCardData {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  creatorName: string;
  difficulty: string;
  tags: string[];
  visibility: string;
  status: "upcoming" | "active" | "completed" | "draft";
  questions: number;
  totalPoints: number;
  timeLimit?: number;
  registeredCount: number;
  attempts: number;
  averageScore: number;
  startTime?: string;
  endTime?: string;
  passingScore?: number;
}

interface QuizCardProps {
  quiz: QuizCardData;
  onClick?: () => void;
  onRegister?: () => void;
  onAttempt?: () => void;
  compact?: boolean;
  actions?: ReactNode;
}

export function QuizCard({ quiz, onClick, onRegister, onAttempt, compact = false, actions }: QuizCardProps) {
  const isUpcoming = quiz.status === "upcoming";
  const isActive = quiz.status === "active";
  const isCompleted = quiz.status === "completed";

  const primaryAction = () => {
    if (onAttempt) return onAttempt();
    if (onRegister) return onRegister();
    onClick?.();
  };

  return (
    <Card className="overflow-hidden" hover onClick={onClick}>
      {/* Cover / Thumbnail */}
      <div className="relative h-28 sm:h-32">
        {quiz.coverImage ? (
          <img src={quiz.coverImage} alt={quiz.title} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${pinkGradient} flex items-center justify-center`}>
            <span className="text-3xl font-bold text-white">{quiz.title.charAt(0)}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute top-2 right-2">
          <DifficultyBadge difficulty={quiz.difficulty} />
        </div>
        <div className="absolute top-2 left-2">
          <span
            className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase
              ${isUpcoming ? "bg-[#F59E0B]/15 text-[#F59E0B]" : ""}
              ${isActive ? "bg-[#22C55E]/15 text-[#22C55E]" : ""}
              ${isCompleted || quiz.status === "draft" ? "bg-[#6B7280]/15 text-[#A1A1AA]" : ""}
            `}
          >
            {quiz.status}
          </span>
        </div>
      </div>

      <div className={`p-${compact ? "3" : "4"} space-y-${compact ? "2" : "3"}`}>
        <div>
          <h3 className={`font-bold text-text-primary line-clamp-1 ${compact ? "text-sm" : "text-base"}`}>{quiz.title}</h3>
          <p className={`text-text-secondary line-clamp-2 ${compact ? "text-xs" : "text-sm"} mt-1`}>{quiz.description}</p>
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-1">
            {quiz.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-[#EC4899]/10 border border-[#EC4899]/20 text-[9px] font-medium text-[#EC4899]">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-text-secondary">
          <span>by {quiz.creatorName}</span>
          <VisibilityBadge visibility={quiz.visibility} />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-text-secondary">
          <div>
            <span className="font-bold text-text-primary text-xs">{quiz.questions}</span>
            <p>Questions</p>
          </div>
          <div>
            <span className="font-bold text-text-primary text-xs">{quiz.totalPoints}</span>
            <p>Points</p>
          </div>
          <div>
            <span className="font-bold text-text-primary text-xs">{quiz.timeLimit || 0}m</span>
            <p>Duration</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3 text-[9px] text-text-secondary">
            <span className="flex items-center gap-1">
              👤 {quiz.registeredCount}
            </span>
            {quiz.averageScore > 0 && (
              <span>📊 {quiz.averageScore}% avg</span>
            )}
          </div>
          {actions ? actions : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={primaryAction}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all
                ${isActive
                  ? `bg-gradient-to-r ${pinkGradient} text-white hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]`
                  : isUpcoming
                  ? "border border-[#EC4899]/30 bg-[#EC4899]/10 text-[#EC4899] hover:bg-[#EC4899]/20"
                  : "border border-border bg-card-hover text-text-secondary hover:text-text-primary"}`}
            >
              {isActive ? "Start" : isUpcoming ? "Register" : "View"}
            </motion.button>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ===== AssessmentCard (compact row card) ===== */

interface AssessmentCardProps {
  quiz: QuizCardData;
  onClick?: () => void;
}

export function AssessmentCard({ quiz, onClick }: AssessmentCardProps) {
  const status = quiz.status;
  const statusColor = {
    upcoming: "#F59E0B",
    active: "#22C55E",
    completed: "#A1A1AA",
    draft: "#6B7280",
  }[status] || "#A1A1AA";

  return (
    <Card className="p-4 flex items-center gap-4" hover onClick={onClick}>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#EC4899]/20 to-[#BE185D]/20 flex items-center justify-center shrink-0 border border-[#EC4899]/20">
        <span className="text-lg font-bold text-[#EC4899]">{quiz.title.charAt(0)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-text-primary text-sm">{quiz.title}</h3>
          <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold" style={{ backgroundColor: `${statusColor}15`, color: statusColor }}>
            {status.toUpperCase()}
          </span>
        </div>
        <p className="text-xs text-text-secondary mt-0.5 line-clamp-1">{quiz.description}</p>
      </div>
      <div className="flex items-center gap-4 text-right text-xs text-text-secondary">
        <div>
          <span className="font-bold text-text-primary">{quiz.registeredCount}</span>
          <p className="text-[9px]">Registered</p>
        </div>
        <div>
          <span className="font-bold text-text-primary">{quiz.timeLimit || 0}m</span>
          <p className="text-[9px]">Duration</p>
        </div>
        <div>
          <span className="font-bold text-text-primary">{quiz.attempts}</span>
          <p className="text-[9px]">Attempts</p>
        </div>
      </div>
    </Card>
  );
}

/* ===== QuestionTypeCard ===== */

export interface QuestionTypeDef {
  id: string;
  label: string;
  description: string;
  icon: any;
  category: string;
}

interface QuestionTypeCardProps {
  type: QuestionTypeDef;
  selected?: boolean;
  onClick?: () => void;
  index?: number;
}

export function QuestionTypeCard({ type, selected, onClick, index }: QuestionTypeCardProps) {
  const Icon = type.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index || 0) * 0.03 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className={`
        relative group cursor-pointer rounded-2xl border p-4 text-center transition-all
        ${selected
          ? "border-[#EC4899] bg-[#EC4899]/10 shadow-[0_0_24px_rgba(236,72,153,0.15)]"
          : "border-border bg-card hover:border-[#EC4899]/30 hover:bg-[#EC4899]/5"}
      `}
    >
      {selected && (
        <motion.div
          layoutId="selectedType"
          className="absolute inset-0 rounded-2xl border-2 border-[#EC4899] pointer-events-none"
          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
        />
      )}
      <div className="relative z-10 flex flex-col items-center gap-2.5">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all
            ${selected
              ? "border-[#EC4899]/30 bg-[#EC4899]/20 text-[#EC4899]"
              : "border-white/[0.08] bg-white/[0.03] text-[#EC4899] group-hover:border-[#EC4899]/30 group-hover:bg-[#EC4899]/10"}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h3 className={`text-sm font-semibold ${selected ? "text-text-primary" : "text-text-primary group-hover:text-text-primary"}`}>
          {type.label}
        </h3>
        <p className="text-[9px] text-text-secondary group-hover:text-text-secondary">{type.description}</p>
      </div>
    </motion.div>
  );
}

/* ===== OptionCard ===== */

interface OptionCardProps {
  option: {
    id: string;
    label: string;
    content: string;
    isCorrect: boolean;
    imageUrl?: string;
    caption?: string;
  };
  index: number;
  multiple?: boolean;
  onChange: (field: keyof OptionCardProps["option"], value: any) => void;
  onCorrect: (index: number) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  showMultiple?: boolean;
}

export function OptionCard({ option, index, onChange, onCorrect, onDelete, onDuplicate }: OptionCardProps) {
  const colorSet = optionColors[index % optionColors.length];
  const isCorrect = option.isCorrect;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.03 }}
      className={`relative rounded-xl border p-2.5 transition-all
        ${isCorrect
          ? "border-[#EC4899]/40 bg-[#EC4899]/5 shadow-[0_0_16px_rgba(236,72,153,0.1)]"
          : "border-border bg-card hover:border-border-hover hover:bg-card-hover"}`}
    >
      <div className="flex items-start gap-2.5">
        {/* Correct toggle */}
        <div className="flex items-center pt-0.5">
          <button
            type="button"
            onClick={() => onCorrect(index)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
              ${isCorrect
                ? "border-[#EC4899] bg-[#EC4899] text-white"
                : "border-white/20 hover:border-[#EC4899] text-transparent"}`}
          >
            {isCorrect && <span className="w-2 h-2 rounded-full bg-white" />}
          </button>
        </div>

        {/* Color accent + label */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold"
              style={{ backgroundColor: colorSet.bg, color: colorSet.text, borderColor: colorSet.border, borderWidth: 1 }}
            >
              {option.label}
            </span>
            <span className="text-[9px] text-[#9CA3AF] font-medium">Option</span>
          </div>

          {option.imageUrl ? (
            <div className="space-y-1.5">
              <img src={option.imageUrl} alt={option.caption || `Option ${option.label}`} className="w-full h-16 object-cover rounded-lg border border-white/[0.06]" />
              <textarea
                value={option.content}
                onChange={(e) => onChange("content", e.target.value)}
                placeholder="Option text (optional)..."
                className="w-full bg-transparent text-sm text-white placeholder-[#A1A1BB] focus:outline-none resize-none"
                rows={1}
              />
            </div>
          ) : (
            <textarea
              value={option.content}
              onChange={(e) => onChange("content", e.target.value)}
              placeholder={`Enter option ${option.label}...`}
              className="w-full bg-transparent text-sm text-white placeholder-[#A1A1AA] focus:outline-none resize-none"
              rows={option.content ? Math.max(1, option.content.split("\n").length) : 1}
            />
          )}

          {option.caption && (
            <input
              type="text"
              value={option.caption}
              onChange={(e) => onChange("caption", e.target.value)}
              placeholder="Caption..."
              className="w-full bg-transparent text-[9px] text-[#9CA3AF] placeholder-[#71717A] focus:outline-none"
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    onChange("imageUrl", event.target?.result as string);
                  };
                  reader.readAsDataURL(file);
                }
              };
              input.click();
            }}
            className="p-1 rounded hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors"
            title="Add image"
          >
            ⤴
          </button>
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="p-1 rounded hover:bg-white/[0.06] text-[#9CA3Af] hover:text-white transition-colors"
              title="Duplicate"
            >
              ⤡
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded hover:bg-[#EF4444]/10 text-[#9CA3Af] hover:text-[#EF4444] transition-colors"
              title="Delete option"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ===== Toolbar ===== */

interface ToolbarProps {
  quizTitle: string;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onExit: () => void;
  saveStatus?: "idle" | "saving" | "saved";
  canPublish?: boolean;
  rightActions?: ReactNode;
}

const pinkGradientStr = "from-[#EC4899] to-[#BE185D]";

export function Toolbar({
  quizTitle,
  onSaveDraft,
  onPublish,
  onPreview,
  onExit,
  saveStatus = "idle",
  canPublish = false,
  rightActions,
}: ToolbarProps) {
  return (
    <div className="h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-4 gap-3 shrink-0">
      <button
        onClick={onExit}
        className="h-8 px-2.5 rounded-lg border border-border bg-card-hover text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors flex items-center gap-1.5"
      >
        ← Exit
      </button>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#EC4899] to-[#BE185D] flex items-center justify-center">
          <span className="text-xs font-bold text-white">📝</span>
        </div>
        <div>
          <p className="text-xs font-bold text-text-primary leading-tight">{quizTitle || "Untitled Quiz"}</p>
          <p className="text-[9px] text-text-muted">Quiz Studio</p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          {saveStatus === "saving" && (
            <>
              <span className="w-3 h-3 rounded-full bg-[#EC4899] animate-pulse" />
              Saving...
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <span className="w-3 h-3 rounded-full bg-[#22C55E]" />
              <span className="text-[#22C55E]">Saved</span>
            </>
          )}
          {saveStatus === "idle" && (
            <>
              <span className="w-3 h-3 rounded-full bg-[#71717A]" />
              All changes saved
            </>
          )}
        </div>

        <button
          onClick={onPreview}
          className="h-8 px-3 rounded-lg border border-border bg-card-hover text-xs font-medium text-text-secondary hover:text-text-primary hover:border-border-hover transition-colors flex items-center gap-1.5"
        >
          👁️ Preview
        </button>

        <button
          onClick={onSaveDraft}
          className="h-8 px-3 rounded-lg border border-[#EC4899]/30 bg-[#EC4899]/10 text-xs font-bold text-[#EC4899] hover:bg-[#EC4899]/20 transition-colors"
        >
          Save Draft
        </button>

        <button
          onClick={onPublish}
          disabled={!canPublish}
          className={`h-8 px-4 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5
            ${canPublish
              ? `bg-gradient-to-r ${pinkGradientStr} hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]`
              : "bg-[#3F3F46] text-[#71717A] cursor-not-allowed"}`}
        >
          Publish
        </button>

        {rightActions}
      </div>
    </div>
  );
}