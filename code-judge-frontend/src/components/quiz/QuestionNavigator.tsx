"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Copy,
  Trash2,
  Plus,
  Search,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Clock,
  Type,
  Hash,
  ListChecks,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { StudioQuestion, StudioQuestionType } from "@/types/quiz";

interface QuestionNavigatorProps {
  questions: StudioQuestion[];
  activeId: string;
  selected: Set<string>;
  searchQuery: string;
  onSearch: (query: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDeleteMultiple: (ids: string[]) => void;
  onDuplicate: (id: string) => void;
  onDuplicateMultiple: (ids: string[]) => void;
  onReorder: (questions: StudioQuestion[]) => void;
  onSelectAll: () => void;
  onAdd: () => void;
  onToggleSelection: (id: string) => void;
}

const questionTypeMeta: Record<StudioQuestionType, { label: string; short: string; icon: any; color: string }> = {
  single_choice: { label: "Single Correct", short: "SC", icon: ListChecks, color: "#7C3AED" },
  multiple_choice: { label: "Multiple Correct", short: "MC", icon: ListChecks, color: "#3B82F6" },
  true_false: { label: "True / False", short: "TF", icon: CheckCircle2, color: "#22C55E" },
  text: { label: "Fill in the Blank", short: "Text", icon: Type, color: "#F59E0B" },
  code_output: { label: "Code Output", short: "Code", icon: Hash, color: "#06B6D4" },
  complexity: { label: "Complexity Analysis", short: "Complex", icon: Clock, color: "#EC4899" },
  debugging: { label: "Debugging", short: "Debug", icon: AlertCircle, color: "#EF4444" },
  matching: { label: "Matching", short: "Match", icon: ListChecks, color: "#8B5CF6" },
  ordering: { label: "Ordering", short: "Order", icon: ChevronDown, color: "#F97316" },
  image_based: { label: "Image Based", short: "Image", icon: Type, color: "#14B8A6" },
};

export default function QuestionNavigator({
  questions,
  activeId,
  selected,
  searchQuery,
  onSearch,
  onSelect,
  onDelete,
  onDeleteMultiple,
  onDuplicate,
  onDuplicateMultiple,
  onReorder,
  onSelectAll,
  onAdd,
  onToggleSelection,
}: QuestionNavigatorProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const dragItem = useRef<number | null>(null);

  const getQuestionStatus = (q: StudioQuestion): "complete" | "incomplete" => {
    const hasTitle = q.title.trim().length > 0;
    const hasOptions = q.options.length >= 2 && q.options.every((o) => o.content.trim() !== "");
    const hasCorrect = q.options.some((o) => o.isCorrect);
    return hasTitle && hasOptions && hasCorrect ? "complete" : "incomplete";
  };

  const filteredQuestions = questions.filter((q) => {
    const query = searchQuery.toLowerCase();
    return (
      q.title.toLowerCase().includes(query) ||
      q.tags.some((t) => t.toLowerCase().includes(query)) ||
      q.topic?.toLowerCase().includes(query) ||
      q.subtopic?.toLowerCase().includes(query)
    );
  });

  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const fromIndex = dragItem.current;
    if (fromIndex === null || fromIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    const reordered = [...questions];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onReorder(reordered);
    setDragIndex(null);
    setDragOverIndex(null);
    dragItem.current = null;
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    onDeleteMultiple(Array.from(selected));
    setShowBulkBar(false);
  };

  const handleBulkDuplicate = () => {
    if (selected.size === 0) return;
    onDuplicateMultiple(Array.from(selected));
    setShowBulkBar(false);
  };

  return (
    <div className="w-80 border-r border-white/[0.06] bg-[#09090B] flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-white flex items-center gap-2">
            Questions
            <span className="px-1.5 py-0.5 rounded-md bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[9px] font-bold text-[#7C3AED]">
              {questions.length}
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowBulkBar(!showBulkBar)}
              className={`p-1.5 rounded-lg transition-colors ${
                showBulkBar || selected.size > 0
                  ? "bg-[#7C3AED]/10 text-[#7C3AED]"
                  : "text-[#6B7280] hover:text-white hover:bg-white/[0.06]"
              }`}
              title="Bulk Actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#6B7280]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search questions, tags, topics..."
            className="w-full h-8 pl-8 pr-8 rounded-lg border border-white/[0.06] bg-[#111827] text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED]/40 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Bulk actions bar */}
        <AnimatePresence>
          {showBulkBar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onSelectAll}
                    className="flex-1 h-7 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[10px] font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors flex items-center justify-center gap-1"
                  >
                    {selected.size === questions.length && questions.length > 0 ? (
                      <>
                        <CheckSquare className="w-3 h-3" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Square className="w-3 h-3" />
                        Select All
                      </>
                    )}
                  </button>
                  <button
                    onClick={onAdd}
                    className="flex-1 h-7 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[10px] font-bold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Question
                  </button>
                </div>

                {selected.size > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-[#9CA3AF] flex-1">
                      {selected.size} selected
                    </span>
                    <button
                      onClick={handleBulkDuplicate}
                      className="h-6 px-2 rounded-md bg-white/[0.04] border border-white/[0.08] text-[9px] font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.15] transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-2.5 h-2.5" />
                      Duplicate
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="h-6 px-2 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 text-[9px] font-medium text-[#EF4444] hover:bg-[#EF4444]/20 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Question List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <AnimatePresence>
          {filteredQuestions.map((question, index) => {
            const isActive = question.id === activeId;
            const isSelected = selected.has(question.id);
            const status = getQuestionStatus(question);
            const meta = questionTypeMeta[question.type];
            const isDragging = dragIndex === index;
            const isDragOver = dragOverIndex === index;
            const isMenuOpen = expandedMenu === question.id;

            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: Math.min(index * 0.02, 0.3) }}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                  dragItem.current = null;
                }}
                className={`group relative rounded-xl border transition-all cursor-pointer ${
                  isDragging
                    ? "opacity-50 border-[#7C3AED]/50 bg-[#7C3AED]/10"
                    : isDragOver
                    ? "border-[#7C3AED]/60 bg-[#7C3AED]/10 shadow-[0_0_20px_rgba(124,58,237,0.2)]"
                    : isActive
                    ? "border-[#7C3AED]/40 bg-[#7C3AED]/10 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                    : isSelected
                    ? "border-[#7C3AED]/30 bg-[#7C3AED]/5"
                    : "border-white/[0.06] bg-transparent hover:border-white/[0.12] hover:bg-white/[0.02]"
                }`}
                onClick={() => onSelect(question.id)}
              >
                {/* Drag indicator line */}
                {isDragOver && (
                  <div className="absolute -top-0.5 left-2 right-2 h-0.5 bg-[#7C3AED] rounded-full" />
                )}

                <div className="p-2.5">
                  {/* Question Header */}
                  <div className="flex items-start gap-2">
                    {/* Drag handle + checkbox */}
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <div
                        className="cursor-move text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <GripVertical className="w-3 h-3" />
                      </div>
                      <div
                        className={`w-3.5 h-3.5 rounded border transition-colors flex items-center justify-center ${
                          isSelected
                            ? "bg-[#7C3AED] border-[#7C3AED]"
                            : "border-white/20 hover:border-[#7C3AED]/50"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelection(question.id);
                        }}
                      >
                        {isSelected && <CheckSquare className="w-2.5 h-2.5 text-white" />}
                      </div>
                    </div>

                    {/* Question Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold text-[#9CA3AF]">Q{index + 1}</span>
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[9px] font-medium"
                          style={{ color: meta.color }}
                        >
                          {meta.short}
                        </span>
                        <span className="text-[9px] text-[#9CA3AF] ml-auto flex items-center gap-0.5">
                          <Hash className="w-2.5 h-2.5" />
                          {question.marks} pts
                        </span>
                      </div>

                      <p className="text-[11px] text-white line-clamp-2 leading-relaxed">
                        {question.title || "Untitled question"}
                      </p>

                      {/* Status indicator */}
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {status === "complete" ? (
                          <span className="text-[9px] text-[#22C55E] flex items-center gap-0.5">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Complete
                          </span>
                        ) : (
                          <span className="text-[9px] text-[#F59E0B] flex items-center gap-0.5">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Incomplete
                          </span>
                        )}
                        {question.estimatedTime > 0 && (
                          <span className="text-[9px] text-[#6B7280] flex items-center gap-0.5 ml-auto">
                            <Clock className="w-2.5 h-2.5" />
                            {question.estimatedTime}m
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Menu button */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedMenu(isMenuOpen ? null : question.id);
                        }}
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
                            className="absolute right-0 top-full z-50 mt-1 w-40 rounded-xl border border-white/[0.08] bg-[#111827] shadow-2xl shadow-black/50 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                onDuplicate(question.id);
                                setExpandedMenu(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-[10px] text-[#9CA3AF] hover:text-white hover:bg-white/[0.04] transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Delete this question?")) {
                                  onDelete(question.id);
                                }
                                setExpandedMenu(null);
                              }}
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

        {filteredQuestions.length === 0 && (
          <div className="text-center py-8 text-[#9CA3AF]">
            {searchQuery ? (
              <>
                <Search className="w-6 h-6 mx-auto mb-2 text-[#6B7280]" />
                <p className="text-xs">No questions match "{searchQuery}"</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#7C3AED]" />
                </div>
                <p className="text-xs text-[#9CA3AF]">No questions yet</p>
                <p className="text-[10px] text-[#6B7280] mt-1">Click "Add Question" to get started</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Add Button */}
      <div className="p-3 border-t border-white/[0.06]">
        <button
          onClick={onAdd}
          className="w-full h-9 rounded-xl border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-xs font-bold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(124,58,237,0.15)]"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>
    </div>
  );
}