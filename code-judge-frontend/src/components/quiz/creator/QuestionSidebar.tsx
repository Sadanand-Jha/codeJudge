"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  CircleDot,
  ListChecks,
  ToggleRight,
  Type,
  Hash,
  AlignLeft,
  Code2,
  Clock,
  Award,
  MoreHorizontal,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  ListChecks as ListChecksIcon,
} from "lucide-react";
import { CreatorQuestion, CreatorQuestionType, getQuestionStatus } from "./types";
import { QUESTION_TYPE_LABELS } from "./types";

interface QuestionSidebarProps {
  questions: CreatorQuestion[];
  activeQuestionId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

type LucideIcon = React.ComponentType<{ className?: string }>;

const TYPE_ICONS: Record<CreatorQuestionType, LucideIcon> = {
  single_choice: CircleDot,
  multiple_choice: ListChecks,
  true_false: ToggleRight,
  fill_blanks: FileText,
  integer: Hash,
  text: Type,
  paragraph: AlignLeft,
  code_output: Code2,
};

const TYPE_COLORS: Record<CreatorQuestionType, string> = {
  single_choice: "#3B82F6",
  multiple_choice: "#22C55E",
  true_false: "#F59E0B",
  fill_blanks: "#14B8A6",
  integer: "#8B5CF6",
  text: "#EC4899",
  paragraph: "#F97316",
  code_output: "#06B6D4",
};

export default function QuestionSidebar({
  questions,
  activeQuestionId,
  onSelect,
  onAdd,
  onReorder,
  onDuplicate,
  onDelete,
  searchQuery,
  onSearchChange,
}: QuestionSidebarProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  const filtered = questions.filter((q) => {
    if (!searchQuery.trim()) return true;
    const ql = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(ql) ||
      QUESTION_TYPE_LABELS[q.type].toLowerCase().includes(ql) ||
      q.tags.some((t) => t.toLowerCase().includes(ql))
    );
  });

  const completedCount = questions.filter((q) => getQuestionStatus(q) === "complete").length;
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const totalTime = questions.reduce((sum, q) => sum + q.expectedTime, 0);
  const progress = questions.length > 0 ? Math.round((completedCount / questions.length) * 100) : 0;

  return (
    <aside data-sidebar="true" className="w-[280px] shrink-0 border-r border-border bg-[#0B0D14] flex flex-col h-full">
      {/* Header stats */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <ListChecksIcon className="w-3.5 h-3.5 text-[#EC4899]" />
            Questions
            <span className="px-1.5 py-0.5 rounded-md bg-[#EC4899]/10 border border-[#EC4899]/20 text-[9px] font-bold text-[#EC4899]">
              {questions.length}
            </span>
          </h3>
          <span className="text-[9px] text-muted-foreground">{completedCount}/{questions.length} done</span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-[#EC4899] to-[#BE185D]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-border text-center">
            <p className="text-[10px] font-bold text-white">{questions.length}</p>
            <p className="text-[8px] text-muted-foreground">Total</p>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-border text-center">
            <p className="text-[10px] font-bold text-white flex items-center justify-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-[#F59E0B]" />
              {totalTime}m
            </p>
            <p className="text-[8px] text-muted-foreground">Duration</p>
          </div>
          <div className="px-2 py-1.5 rounded-lg bg-white/[0.03] border border-border text-center">
            <p className="text-[10px] font-bold text-white flex items-center justify-center gap-0.5">
              <Award className="w-2.5 h-2.5 text-[#22C55E]" />
              {totalMarks}
            </p>
            <p className="text-[8px] text-muted-foreground">Marks</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#6B7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search questions..."
            className="w-full h-8 rounded-lg border border-border bg-[#111217] pl-8 pr-3 text-[11px] text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/30 transition-colors"
          />
        </div>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence>
          {filtered.map((q, i) => {
            const isActive = q.id === activeQuestionId;
            const status = getQuestionStatus(q);
            const TypeIcon = TYPE_ICONS[q.type];
            const typeColor = TYPE_COLORS[q.type];
            const isMenuOpen = expandedMenu === q.id;

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className={`group relative rounded-xl border transition-all cursor-pointer ${
                  isActive
                    ? "border-[#EC4899]/40 bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.1)]"
                    : "border-border hover:border-border-hover hover:bg-white/[0.02]"
                }`}
                onClick={() => onSelect(q.id)}
              >
                <div className="p-2.5">
                  <div className="flex items-start gap-2">
                    {/* Type icon */}
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${typeColor}15`, border: `1px solid ${typeColor}25`, color: typeColor }}
                    >
                      <TypeIcon className="w-3 h-3" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-muted-foreground">Q{i + 1}</span>
                        <span className="text-[9px] text-muted-foreground truncate">{QUESTION_TYPE_LABELS[q.type]}</span>
                        <span className="text-[9px] text-[#6B7280] ml-auto flex items-center gap-0.5">
                          <Award className="w-2.5 h-2.5" />
                          {q.marks}
                        </span>
                      </div>
                      <p className="text-[11px] text-white line-clamp-2 leading-relaxed">
                        {q.title || "Untitled question"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {status === "complete" ? (
                          <span className="text-[9px] text-[#22C55E] flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Completed
                          </span>
                        ) : status === "missing_answer" ? (
                          <span className="text-[9px] text-[#F59E0B] flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Missing Answer
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#6B7280] flex items-center gap-0.5">
                            <FileText className="w-2.5 h-2.5" />
                            Draft
                          </span>
                        )}
                        {q.expectedTime > 0 && (
                          <span className="text-[9px] text-[#6B7280] flex items-center gap-0.5 ml-auto">
                            <Clock className="w-2.5 h-2.5" />
                            {q.expectedTime}m
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedMenu(isMenuOpen ? null : q.id); }}
                        className="p-1 rounded-md text-[#6B7280] hover:text-white hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <AnimatePresence>
                        {isMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-border-hover bg-[#111217] shadow-2xl shadow-black/50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { onReorder(i, i - 1); setExpandedMenu(null); }}
                              disabled={i === 0}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronUp className="w-3 h-3" />
                              Move up
                            </button>
                            <button
                              onClick={() => { onReorder(i, i + 1); setExpandedMenu(null); }}
                              disabled={i === questions.length - 1}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronDown className="w-3 h-3" />
                              Move down
                            </button>
                            <button
                              onClick={() => { onDuplicate(q.id); setExpandedMenu(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => { onDelete(q.id); setExpandedMenu(null); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">No questions found</p>
          </div>
        )}
      </div>

      {/* Add question */}
      <div className="p-3 border-t border-border">
        <button
          onClick={onAdd}
          className="w-full h-10 rounded-xl border border-dashed border-[#EC4899]/30 bg-[#EC4899]/5 text-xs font-semibold text-[#EC4899] hover:bg-[#EC4899]/10 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Question
        </button>
      </div>
    </aside>
  );
}