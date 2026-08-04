"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Image,
  Code,
  Link,
  Table,
  Quote,
  Eraser,
  Sigma,
  Paperclip,
  FileText,
  Mic,
  Video,
  X,
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Check,
  Hash,
  Type,
  AlignLeft,
  Code2,
  ToggleRight,
  ListChecks,
  CircleDot,
  FileText as FileTextIcon,
} from "lucide-react";
import { CreatorQuestion, CreatorQuestionType } from "./types";

type LucideIcon = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

interface QuestionCanvasProps {
  question: CreatorQuestion;
  index: number;
  total: number;
  onChange: (updates: Partial<CreatorQuestion>) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const QUESTION_TYPES: Array<{ id: CreatorQuestionType; label: string; icon: LucideIcon }> = [
  { id: "single_choice", label: "Multiple Choice", icon: CircleDot },
  { id: "multiple_choice", label: "Multiple Select", icon: ListChecks },
  { id: "true_false", label: "True False", icon: ToggleRight },
  { id: "fill_blanks", label: "Fill Blank", icon: FileTextIcon },
  { id: "integer", label: "Integer", icon: Hash },
  { id: "text", label: "Short Answer", icon: Type },
  { id: "paragraph", label: "Long Answer", icon: AlignLeft },
  { id: "code_output", label: "Coding", icon: Code2 },
];

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

const OPTION_COLORS = [
  { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", text: "#3B82F6" },
  { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", text: "#22C55E" },
  { bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", text: "#F97316" },
  { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.25)", text: "#EC4899" },
  { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)", text: "#8B5CF6" },
  { bg: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.25)", text: "#0EA5E9" },
  { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)", text: "#EAB308" },
  { bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.25)", text: "#14B8A6" },
];

function ToolbarButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#9CA3AF] hover:text-white transition-colors"
      title={label}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default function QuestionCanvas({
  question,
  index,
  total,
  onChange,
  onPrevious,
  onNext,
}: QuestionCanvasProps) {
  const [draggedOption, setDraggedOption] = useState<number | null>(null);
  const [dragOverOption, setDragOverOption] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isChoiceType = question.type === "single_choice" || question.type === "multiple_choice" || question.type === "true_false";
  const isTextType = question.type === "fill_blanks" || question.type === "integer" || question.type === "text" || question.type === "paragraph";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      onChange({ images: [...question.images, { id: `img_${Date.now()}`, url }] });
    };
    reader.readAsDataURL(file);
  };

  const handleAttachmentUpload = (type: "image" | "pdf" | "audio" | "video") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "image" ? "image/*" : type === "pdf" ? "application/pdf" : type === "audio" ? "audio/*" : "video/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const url = event.target?.result as string;
          onChange({
            attachments: [...question.attachments, { id: `att_${Date.now()}`, type, url, name: file.name }],
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const updateOption = (optIndex: number, updates: Partial<CreatorQuestion["options"][0]>) => {
    const newOpts = [...question.options];
    newOpts[optIndex] = { ...newOpts[optIndex], ...updates };
    onChange({ options: newOpts });
  };

  const toggleCorrect = (optIndex: number) => {
    const newOpts = question.options.map((o, i) => ({
      ...o,
      isCorrect: question.type === "multiple_choice" ? (i === optIndex ? !o.isCorrect : o.isCorrect) : i === optIndex,
    }));
    onChange({ options: newOpts });
  };

  const addOption = () => {
    if (question.options.length >= 8) return;
    const newOpts = [...question.options];
    newOpts.push({
      id: `opt_${Date.now()}`,
      label: String.fromCharCode(65 + newOpts.length),
      content: "",
      isCorrect: false,
    });
    onChange({ options: newOpts });
  };

  const duplicateOption = (optIndex: number) => {
    const newOpts = [...question.options];
    const dup = { ...newOpts[optIndex], id: `opt_${Date.now()}`, label: String.fromCharCode(65 + newOpts.length), isCorrect: false };
    newOpts.splice(optIndex + 1, 0, dup);
    onChange({ options: newOpts.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })) });
  };

  const deleteOption = (optIndex: number) => {
    if (question.options.length <= 2) return;
    const newOpts = question.options.filter((_, i) => i !== optIndex);
    onChange({ options: newOpts.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })) });
  };

  const reorderOptions = (from: number, to: number) => {
    if (to < 0 || to >= question.options.length) return;
    const reordered = [...question.options];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    onChange({ options: reordered.map((o, i) => ({ ...o, label: String.fromCharCode(65 + i) })) });
  };

  const handleOptionImageUpload = (optIndex: number) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          updateOption(optIndex, { imageUrl: event.target?.result as string });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#09090B]">
      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        {/* ===== Question Header ===== */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-[#EC4899]">Question {index + 1}</span>
            <span className="text-xs text-[#71717A]">of {total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              disabled={index === 0}
              className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={onNext}
              disabled={index === total - 1}
              className="px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* ===== Question Editor (Notion-like) ===== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Question</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
              >
                <Image className="w-3 h-3" />
                Add Image
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
          </div>

          {/* Rich text toolbar */}
          <div className="flex items-center gap-0.5 p-1.5 rounded-xl border border-white/[0.06] bg-[#111217] flex-wrap">
            <ToolbarButton icon={Bold} label="Bold (Ctrl+B)" />
            <ToolbarButton icon={Italic} label="Italic (Ctrl+I)" />
            <div className="w-px h-4 bg-white/[0.08] mx-1" />
            <ToolbarButton icon={List} label="Bullet List" />
            <ToolbarButton icon={ListOrdered} label="Numbered List" />
            <div className="w-px h-4 bg-white/[0.08] mx-1" />
            <ToolbarButton icon={Image} label="Insert Image" />
            <ToolbarButton icon={Code} label="Code Block" />
            <ToolbarButton icon={Link} label="Link" />
            <ToolbarButton icon={Table} label="Table" />
            <ToolbarButton icon={Quote} label="Quote" />
            <div className="w-px h-4 bg-white/[0.08] mx-1" />
            <ToolbarButton icon={Sigma} label="Math (LaTeX)" />
            <div className="w-px h-4 bg-white/[0.08] mx-1" />
            <ToolbarButton icon={Eraser} label="Clear Formatting" />
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[9px] text-[#6B7280]">Markdown supported</span>
            </div>
          </div>

          {/* Question images */}
          {question.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {question.images.map((img) => (
                <div key={img.id} className="relative group">
                  <img src={img.url} alt={img.caption || "Question image"} className="h-20 w-32 object-cover rounded-lg border border-white/[0.08]" />
                  <button
                    onClick={() => onChange({ images: question.images.filter((i) => i.id !== img.id) })}
                    className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#EF4444] text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Large question editor */}
          <div className="rounded-xl border border-white/[0.06] bg-[#111217] overflow-hidden focus-within:border-[#EC4899]/30 transition-colors">
            <textarea
              value={question.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Write your question here... "
              className="w-full min-h-[250px] p-5 bg-transparent text-lg text-white placeholder-[#6B7280] resize-y focus:outline-none leading-relaxed"
            />
          </div>
        </div>

        {/* ===== Attachments ===== */}
        <div className="space-y-3">
          <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Attachments</label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAttachmentUpload("image")}
              className="h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1.5"
            >
              <Image className="w-3.5 h-3.5" />
              Upload Image
            </button>
            <button
              onClick={() => handleAttachmentUpload("pdf")}
              className="h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Upload PDF
            </button>
            <button
              onClick={() => handleAttachmentUpload("audio")}
              className="h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5" />
              Upload Audio
            </button>
            <button
              onClick={() => handleAttachmentUpload("video")}
              className="h-9 px-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-xs font-medium text-[#A1A1AA] hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              Upload Video
            </button>
          </div>

          {question.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {question.attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/[0.06] bg-[#111217]">
                  <Paperclip className="w-3 h-3 text-[#9CA3AF]" />
                  <span className="text-xs text-white">{att.name}</span>
                  <button
                    onClick={() => onChange({ attachments: question.attachments.filter((a) => a.id !== att.id) })}
                    className="text-[#6B7280] hover:text-[#EF4444] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ===== Question Type ===== */}
        <div className="space-y-3">
          <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Question Type</label>
          <div className="relative">
            <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.06] bg-[#111217] overflow-x-auto">
              {QUESTION_TYPES.map((type) => {
                const active = question.type === type.id;
                const color = TYPE_COLORS[type.id];
                return (
                  <button
                    key={type.id}
                    onClick={() => onChange({ type: type.id })}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                      active ? "text-white shadow-lg" : "text-[#9CA3AF] hover:text-white hover:bg-white/[0.04]"
                    }`}
                    style={active ? { backgroundColor: `${color}20`, boxShadow: `0 0 12px ${color}15` } : undefined}
                  >
                    <type.icon className="w-3.5 h-3.5" style={active ? { color } : undefined} />
                    <span style={active ? { color } : undefined}>{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ===== Answer Options ===== */}
        {isChoiceType && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">
                {question.type === "multiple_choice" ? "Select all correct answers" : "Select the correct answer"}
              </label>
              {question.type !== "true_false" && question.options.length < 8 && (
                <button
                  onClick={addOption}
                  className="text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add Option
                </button>
              )}
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {question.options.map((option, optIndex) => {
                  const colorSet = OPTION_COLORS[optIndex % OPTION_COLORS.length];
                  const isDragging = draggedOption === optIndex;
                  const isDragOver = dragOverOption === optIndex;

                  return (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      draggable
                      onDragStart={() => setDraggedOption(optIndex)}
                      onDragOver={(e) => { e.preventDefault(); setDragOverOption(optIndex); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedOption !== null) reorderOptions(draggedOption, optIndex);
                        setDraggedOption(null);
                        setDragOverOption(null);
                      }}
                      onDragEnd={() => { setDraggedOption(null); setDragOverOption(null); }}
                      className={`group flex items-start gap-3 rounded-xl border p-4 transition-all ${
                        isDragging
                          ? "opacity-40 border-[#EC4899]/50 bg-[#EC4899]/10"
                          : isDragOver
                          ? "border-[#EC4899]/60 bg-[#EC4899]/10 shadow-[0_0_20px_rgba(236,72,153,0.15)]"
                          : option.isCorrect
                          ? "border-[#22C55E]/40 bg-[#22C55E]/5 shadow-[0_0_16px_rgba(34,197,94,0.1)]"
                          : "border-white/[0.06] bg-[#111217] hover:border-white/[0.12] hover:bg-[#171923]"
                      }`}
                    >
                      {/* Drag handle */}
                      <div className="pt-1 cursor-move text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity" onMouseDown={(e) => e.stopPropagation()}>
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Selection */}
                      <div className="pt-0.5">
                        <button
                          onClick={() => toggleCorrect(optIndex)}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            option.isCorrect
                              ? "border-[#22C55E] bg-[#22C55E]"
                              : "border-white/20 hover:border-[#22C55E]/50"
                          }`}
                        >
                          {option.isCorrect && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </div>

                      {/* Option label */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ backgroundColor: colorSet.bg, color: colorSet.text, border: `1px solid ${colorSet.border}` }}
                      >
                        {option.label}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          value={option.content}
                          onChange={(e) => updateOption(optIndex, { content: e.target.value })}
                          placeholder={`Enter option ${option.label}...`}
                          className="w-full bg-transparent text-sm text-white placeholder-[#6B7280] focus:outline-none"
                        />
                        {option.imageUrl && (
                          <div className="relative inline-block">
                            <img src={option.imageUrl} alt={option.caption || `Option ${option.label}`} className="h-20 rounded-lg border border-white/[0.08]" />
                            <button
                              onClick={() => updateOption(optIndex, { imageUrl: undefined })}
                              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-[#EF4444] text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {question.type !== "true_false" && (
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOptionImageUpload(optIndex)}
                            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#6B7280] hover:text-white transition-colors"
                            title="Add image"
                          >
                            <Image className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => duplicateOption(optIndex)}
                            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#6B7280] hover:text-white transition-colors"
                            title="Duplicate option"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {question.options.length > 2 && (
                            <button
                              onClick={() => deleteOption(optIndex)}
                              className="p-1.5 rounded-lg hover:bg-[#EF4444]/10 text-[#6B7280] hover:text-[#EF4444] transition-colors"
                              title="Delete option"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Correct answer summary */}
            <div className="flex items-center gap-2 text-[10px] text-[#6B7280] pt-1">
              <Check className="w-3 h-3 text-[#22C55E]" />
              {question.type === "multiple_choice" ? (
                <span>{question.options.filter((o) => o.isCorrect).length} correct answer(s) selected</span>
              ) : (
                <span>
                  {question.options.some((o) => o.isCorrect)
                    ? `Correct answer: ${question.options.find((o) => o.isCorrect)?.label}`
                    : "No correct answer selected"}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ===== Text Answer ===== */}
        {isTextType && (
          <div className="space-y-3">
            <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">
              {question.type === "paragraph" ? "Model Answer" : "Correct Answer"}
            </label>
            {question.type === "paragraph" ? (
              <textarea
                value={String(question.correctAnswer)}
                onChange={(e) => onChange({ correctAnswer: e.target.value })}
                placeholder="Enter the model answer..."
                rows={4}
                className="w-full rounded-xl border border-white/[0.06] bg-[#111217] px-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/30 transition-colors resize-none"
              />
            ) : (
              <input
                type={question.type === "integer" ? "number" : "text"}
                value={String(question.correctAnswer)}
                onChange={(e) => onChange({ correctAnswer: e.target.value })}
                placeholder={question.type === "integer" ? "Enter the integer answer..." : "Enter the correct answer..."}
                className="w-full h-11 rounded-xl border border-white/[0.06] bg-[#111217] px-4 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/30 transition-colors"
              />
            )}
          </div>
        )}

        {/* ===== Explanation ===== */}
        <div className="space-y-3">
          <label className="text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider">Explanation</label>
          <textarea
            value={question.explanation}
            onChange={(e) => onChange({ explanation: e.target.value })}
            placeholder="Explain the correct answer..."
            rows={3}
            className="w-full rounded-xl border border-white/[0.06] bg-[#111217] px-4 py-3 text-sm text-white placeholder-[#6B7280] focus:outline-none focus:border-[#EC4899]/30 transition-colors resize-none"
          />
        </div>
      </div>
    </main>
  );
}