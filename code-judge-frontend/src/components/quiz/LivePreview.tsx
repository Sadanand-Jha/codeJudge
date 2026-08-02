"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Tablet,
  Smartphone,
  CheckCircle2,
  Circle,
  Clock,
  Hash,
  Lightbulb,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Code,
  ListChecks,
  Type,
  Image as ImageIcon,
  AlertCircle,
  Award,
  Star,
  SkipForward,
  CheckSquare,
} from "lucide-react";
import { StudioQuestion } from "@/types/quiz";

type DeviceMode = "desktop" | "tablet" | "mobile";

interface LivePreviewProps {
  question: StudioQuestion | null;
  deviceMode: DeviceMode;
  totalQuestions: number;
  questionNumber: number;
}

const deviceWidths = {
  desktop: "w-full",
  tablet: "w-80",
  mobile: "w-64",
};

const devicePadding = {
  desktop: "p-5",
  tablet: "p-4",
  mobile: "p-3",
};

export default function LivePreview({
  question,
  deviceMode,
  totalQuestions,
  questionNumber,
}: LivePreviewProps) {
  const [selectedOptions, setSelectedOptions] = useState<Set<number>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [showReferences, setShowReferences] = useState(false);

  const toggleOption = (index: number) => {
    if (!question) return;
    if (question.type === "multiple_choice") {
      setSelectedOptions((prev) => {
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    } else {
      setSelectedOptions(new Set([index]));
    }
  };

  if (!question) {
    return (
      <div className="flex-1 flex items-center justify-center text-[#9CA3AF]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <Monitor className="w-5 h-5 text-[#6B7280]" />
          </div>
          <p className="text-xs">Select a question to preview</p>
          <p className="text-[10px] text-[#6B7280] mt-1">Changes update instantly</p>
        </div>
      </div>
    );
  }

  const isChoiceType = ["single_choice", "multiple_choice", "true_false"].includes(question.type);
  const isTextType = question.type === "text";
  const isCodeType = ["code_output", "complexity", "debugging"].includes(question.type);
  const isMatchingType = question.type === "matching";
  const isOrderingType = question.type === "ordering";

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className={`mx-auto ${deviceWidths[deviceMode]} transition-all duration-300`}>
        {/* Preview Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-medium text-[#9CA3AF] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            Live Preview
          </span>
          <div className="flex items-center gap-1">
            {deviceMode === "desktop" && <Monitor className="w-3 h-3 text-[#EC4899]" />}
            {deviceMode === "tablet" && <Tablet className="w-3 h-3 text-[#EC4899]" />}
            {deviceMode === "mobile" && <Smartphone className="w-3 h-3 text-[#EC4899]" />}
          </div>
        </div>

        {/* Preview Card */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#111827] overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-white/[0.04]">
            <div
              className="h-full bg-gradient-to-r from-[#EC4899] to-[#EC4899] transition-all duration-500"
              style={{ width: `${(questionNumber / Math.max(totalQuestions, 1)) * 100}%` }}
            />
          </div>

          <div className={`${devicePadding[deviceMode]} space-y-5`}>
            {/* Question Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-[#9CA3AF]">
                  Question {questionNumber}
                </span>
                <span className="text-[9px] text-[#6B7280]">/ {totalQuestions}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {question.isBonus && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#FBBF24]/10 border border-[#FBBF24]/20 text-[8px] font-bold text-[#FBBF24]">
                      BONUS
                    </span>
                  )}
                  {question.isMandatory && (
                    <span className="px-1.5 py-0.5 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 text-[8px] font-bold text-[#EF4444]">
                      MANDATORY
                    </span>
                  )}
                </div>
              </div>

              {/* Question images */}
              {question.images.length > 0 && (
                <div className="mb-3 space-y-2">
                  {question.images.map((img) => (
                    <div key={img.id}>
                      <img
                        src={img.url}
                        alt={img.caption || "Question image"}
                        className="w-full rounded-xl border border-white/[0.08]"
                      />
                      {img.caption && (
                        <p className="text-[9px] text-[#6B7280] mt-1 text-center">{img.caption}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <h3 className="text-sm font-semibold text-white leading-relaxed">
                {question.title || "Enter your question..."}
              </h3>

              {/* Code snippet */}
              {isCodeType && question.codeSnippet && (
                <div className="mt-3 rounded-xl border border-white/[0.06] bg-[#0B0D12] overflow-hidden">
                  <div className="flex items-center gap-1 px-3 py-1.5 border-b border-white/[0.06] bg-[#111827]">
                    <span className="w-2 h-2 rounded-full bg-[#EF4444]/60" />
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]/60" />
                    <span className="w-2 h-2 rounded-full bg-[#22C55E]/60" />
                    <span className="ml-2 text-[8px] text-[#6B7280] font-mono">
                      {question.codeLanguage || "code"}
                    </span>
                  </div>
                  <pre className="p-3 text-[10px] font-mono text-[#E5E7EB] overflow-x-auto whitespace-pre-wrap">
                    {question.codeSnippet}
                  </pre>
                </div>
              )}
            </div>

            {/* Options */}
            {isChoiceType && (
              <div className="space-y-2.5">
                {question.options.map((option, index) => {
                  const isSelected = selectedOptions.has(index);
                  const isCorrect = option.isCorrect;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                        isSelected
                          ? isCorrect
                            ? "border-[#22C55E]/40 bg-[#22C55E]/10"
                            : "border-[#EC4899]/40 bg-[#EC4899]/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-[#EC4899]/30 hover:bg-[#EC4899]/5"
                      }`}
                      onClick={() => toggleOption(index)}
                    >
                      <div className="pt-0.5">
                        {question.type === "multiple_choice" ? (
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                              isSelected
                                ? "bg-[#EC4899] border-[#EC4899]"
                                : "border-white/20 group-hover:border-[#EC4899]"
                            }`}
                          >
                            {isSelected && <CheckSquare className="w-2.5 h-2.5 text-white" />}
                          </div>
                        ) : (
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                              isSelected
                                ? "border-[#EC4899]"
                                : "border-white/20 group-hover:border-[#EC4899]"
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-[#EC4899]" />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-[#9CA3AF] mt-0.5">
                            {option.label}.
                          </span>
                          <span className="text-xs text-white flex-1">{option.content || `Option ${option.label}`}</span>
                        </div>
                        {option.imageUrl && (
                          <img
                            src={option.imageUrl}
                            alt={option.caption || `Option ${option.label}`}
                            className="mt-2 rounded-lg border border-white/[0.08] max-h-24"
                          />
                        )}
                        {option.caption && (
                          <p className="text-[9px] text-[#6B7280] mt-1">{option.caption}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Text input for fill in the blank */}
            {isTextType && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full h-10 px-3 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs text-white placeholder-[#6B7280] focus:border-[#EC4899] focus:outline-none"
                />
                {question.caseSensitive && (
                  <p className="text-[9px] text-[#6B7280] flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    Case sensitive answer
                  </p>
                )}
              </div>
            )}

            {/* Matching preview */}
            {isMatchingType && (
              <div className="space-y-2">
                {(question.matchingPairs || []).map((pair, index) => (
                  <div key={pair.id} className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] text-white">
                      {pair.left || `Item ${index + 1}L`}
                    </div>
                    <span className="text-[#6B7280]">↔</span>
                    <div className="flex-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] text-white">
                      {pair.right || `Item ${index + 1}R`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Ordering preview */}
            {isOrderingType && (
              <div className="space-y-2">
                {(question.orderingItems || []).map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
                    <span className="text-[9px] font-bold text-[#6B7280] w-5">{index + 1}.</span>
                    <span className="text-[10px] text-white flex-1">{item || `Step ${index + 1}`}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Hint */}
            {question.hint && (
              <div>
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-[#F59E0B] hover:text-[#FBBF24] transition-colors"
                >
                  <Lightbulb className="w-3 h-3" />
                  {showHint ? "Hide Hint" : "Show Hint"}
                </button>
                <AnimatePresence>
                  {showHint && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3 text-[10px] text-[#FBBF24]">
                        {question.hint}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Explanation (after submission) */}
            {question.explanation && (
              <div>
                <button
                  onClick={() => setShowExplanation(!showExplanation)}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-[#22C55E] hover:text-[#4ADE80] transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  {showExplanation ? "Hide Explanation" : "View Explanation"}
                </button>
                <AnimatePresence>
                  {showExplanation && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 p-3 text-[10px] text-[#E5E7EB] leading-relaxed">
                        {question.explanation}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* References */}
            {question.references.length > 0 && (
              <div>
                <button
                  onClick={() => setShowReferences(!showReferences)}
                  className="flex items-center gap-1.5 text-[10px] font-medium text-[#EC4899] hover:text-[#DB2777] transition-colors"
                >
                  <BookOpen className="w-3 h-3" />
                  {showReferences ? "Hide References" : "View References"}
                </button>
                <AnimatePresence>
                  {showReferences && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 space-y-1.5">
                        {question.references.map((ref) => (
                          <a
                            key={ref.id}
                            href={ref.url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[10px] text-[#9CA3AF] hover:text-white hover:border-[#EC4899]/30 transition-colors"
                          >
                            <BookOpen className="w-3 h-3 text-[#EC4899]" />
                            <span className="flex-1 truncate">{ref.title || "Untitled reference"}</span>
                            <span className="text-[8px] text-[#6B7280] uppercase">{ref.type}</span>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                {question.allowSkipping && (
                  <button className="px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[10px] font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors flex items-center gap-1">
                    <SkipForward className="w-3 h-3" />
                    Skip
                  </button>
                )}
                <button className="px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[10px] font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <button className="px-3 py-2 rounded-lg border border-white/[0.06] bg-white/[0.02] text-[10px] font-medium text-[#9CA3AF] hover:text-white hover:border-white/[0.12] transition-colors">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#EC4899] to-[#EC4899] text-white text-[10px] font-bold hover:shadow-lg hover:shadow-[#EC4899]/20 transition-all">
                Submit Answer
              </button>
            </div>
          </div>
        </div>

        {/* Preview Footer */}
        <div className="mt-3 flex items-center justify-center gap-3 text-[9px] text-[#6B7280]">
          <span className="flex items-center gap-1">
            <Hash className="w-2.5 h-2.5" />
            {question.marks} pts
          </span>
          <span>•</span>
          <span>{question.difficulty}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {question.estimatedTime > 0 ? `${question.estimatedTime}m` : "No limit"}
          </span>
          {question.negativeMarks > 0 && (
            <>
              <span>•</span>
              <span className="text-[#EF4444]">-{question.negativeMarks} wrong</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}