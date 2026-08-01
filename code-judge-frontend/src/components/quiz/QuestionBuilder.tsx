"use client";

import { motion } from "framer-motion";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { QuizQuestion } from "@/types/quiz";

type QuizQuestionType = QuizQuestion["type"];

interface QuestionBuilderProps {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}

const questionTypes: { value: QuizQuestionType; label: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True/False" },
  { value: "code_output", label: "Code Output" },
  { value: "text", label: "Text Answer" },
];

export default function QuestionBuilder({ questions, onChange }: QuestionBuilderProps) {
  const addQuestion = () => {
    const newQuestion: QuizQuestion = {
      id: `q_${Date.now()}`,
      type: "multiple_choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      points: 10,
      difficulty: "Medium",
      tags: [],
    };
    onChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const removeQuestion = (id: string) => {
    onChange(questions.filter((q) => q.id !== id));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question || !question.options) return;
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    updateQuestion(questionId, { options: newOptions });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Questions</h3>
          <span className="text-xs text-[#9CA3AF]">({questions.length} added)</span>
        </div>
        <button type="button"
          onClick={addQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7C3AED]/30 bg-[#7C3AED]/10 text-xs font-semibold text-[#7C3AED] hover:bg-[#7C3AED]/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Question
        </button>
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <motion.div
            key={question.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-xl border border-white/[0.08] bg-[#111827] p-4 space-y-4"
          >
            {/* Question Header */}
            <div className="flex items-start gap-3">
              <div className="mt-1 cursor-move text-[#6B7280]">
                <GripVertical className="w-4 h-4" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#9CA3AF]">Q{index + 1}</span>
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestion(question.id, { type: e.target.value as QuizQuestionType })}
                    className="h-7 pl-2 pr-6 text-[11px] bg-[#0B0D12] border border-white/[0.08] rounded text-white focus:border-[#7C3AED] focus:outline-none"
                  >
                    {questionTypes.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={question.points}
                    onChange={(e) => updateQuestion(question.id, { points: Number(e.target.value) })}
                    className="w-16 h-7 pl-2 pr-1 text-[11px] bg-[#0B0D12] border border-white/[0.08] rounded text-white focus:border-[#7C3AED] focus:outline-none"
                    placeholder="Points"
                  />
                </div>

                <textarea
                  value={question.question}
                  onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                  placeholder="Enter your question here..."
                  className="w-full h-20 rounded-lg border border-white/[0.08] bg-[#0B0D12] p-3 text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED] focus:outline-none resize-none"
                />
              </div>

              <button type="button"
                onClick={() => removeQuestion(question.id)}
                className="p-1.5 rounded-lg border border-white/[0.08] text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Options for multiple choice / true false / coding */}
            {(question.type === "multiple_choice" || question.type === "true_false" || question.type === "code_output") && (
              <div className="space-y-2 pl-7">
                <label className="text-[10px] font-medium text-[#9CA3AF]">Options</label>
                {(question.options || []).map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={question.correctAnswer === optIndex}
                      onChange={() => updateQuestion(question.id, { correctAnswer: optIndex })}
                      className="h-3.5 w-3.5 accent-[#7C3AED]"
                    />
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                      placeholder={`Option ${optIndex + 1}`}
                      className="flex-1 h-8 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Text answer */}
            {question.type === "text" && (
              <div className="pl-7 space-y-2">
                <label className="text-[10px] font-medium text-[#9CA3AF]">Correct Answer</label>
                <input
                  type="text"
                  value={(question.correctAnswer as string) || ""}
                  onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                  placeholder="Enter the correct answer"
                  className="w-full h-8 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED] focus:outline-none"
                />
              </div>
            )}

            {/* Explanation */}
            <div className="pl-7 space-y-2">
              <label className="text-[10px] font-medium text-[#9CA3AF]">Explanation (optional)</label>
              <textarea
                value={question.explanation || ""}
                onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                placeholder="Explain why this is the correct answer..."
                className="w-full h-16 rounded-lg border border-white/[0.08] bg-[#0B0D12] p-3 text-xs text-white placeholder-[#6B7280] focus:border-[#7C3AED] focus:outline-none resize-none"
              />
            </div>
          </motion.div>
        ))}
      </div>

      {questions.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-dashed border-white/[0.08]">
          <p className="text-sm text-[#9CA3AF]">No questions added yet.</p>
          <button type="button"
            onClick={addQuestion}
            className="mt-3 text-xs font-semibold text-[#7C3AED] hover:text-[#8B5AF0] transition-colors"
          >
            + Add your first question
          </button>
        </div>
      )}
    </motion.div>
  );
}