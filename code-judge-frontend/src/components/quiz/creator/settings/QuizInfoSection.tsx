"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, Check, Globe, GraduationCap, Lock, School, X } from "lucide-react";
import { SettingsCard, SettingsInput } from "@/components/ui/settings";
import { SearchableDropdown } from "@/components/ui";
import { getAllSubjects, getQuizVisibilityOptions } from "@/services/quiz";
import { VISIBILITY_OPTIONS, type QuizVisibility } from "@/components/quiz/creator/types";
import { useQuizSettings } from "./QuizSettingsContext";
import { updateQuiz } from "@/services/quiz";
import { FieldError } from "./settingsUi";
import { cn } from "@/lib/helpers";
import { saveQuizDetails } from "@/utils/quizStorage";

export default function QuizInfoSection() {
  const { details, updateDetails, quizId, code, refresh } = useQuizSettings();
  const [tagInput, setTagInput] = useState("");
  const [visibilityOptions, setVisibilityOptions] = useState<Array<{ id: number; heading: string; description: string }>>([]);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const quickSave = (patch: Partial<typeof details>) => {
    const next = { ...details, ...patch };
    saveQuizDetails(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!quizId) return;
      try {
        await updateQuiz(String(quizId), { name: next.name, code });
        await refresh();
      } catch (err) {
        console.error("Failed to quick-save quiz name:", err);
      }
    }, 700);
  };

  useEffect(() => {
    let cancelled = false;
    getQuizVisibilityOptions()
      .then((opts) => {
        if (!cancelled && Array.isArray(opts) && opts.length > 0) {
          setVisibilityOptions(opts.map((o) => ({ id: o.id, heading: o.heading, description: o.description || "" })));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<typeof details>) => updateDetails(patch);

  const addTag = () => {
    const val = tagInput.trim();
    if (val && !details.tags.includes(val)) {
      update({ tags: [...details.tags, val] });
    }
    setTagInput("");
  };

  const addTagInput = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const visibilitySource: Array<{ id: string | number; label: string; description: string; isDb: boolean }> =
    visibilityOptions.length > 0
      ? visibilityOptions.map((o) => ({ id: o.id, label: o.heading, description: o.description, isDb: true }))
      : VISIBILITY_OPTIONS.filter((o) => o.id !== "college").map((o) => ({
          id: o.id,
          label: o.label,
          description: o.description,
          isDb: false,
        }));

  const visibilityIcon = (label: string) => {
    const key = label.toLowerCase();
    if (key.includes("public")) return Globe;
    if (key.includes("private")) return Lock;
    if (key.includes("class")) return GraduationCap;
    if (key.includes("college")) return School;
    return Globe;
  };

  const errors: Partial<Record<string, string>> = {};
  if (!details.name.trim()) errors.name = "Quiz name is required.";
  if (!details.subject.trim()) errors.subject = "Subject is required.";

  return (
    <SettingsCard
      title="Quiz Info"
      description="Core details about your quiz"
      icon={<BookOpen className="h-5 w-5" />}
      iconClassName="bg-pink-500/10 text-pink-500"
    >
      <div className="space-y-6">
        <div>
          <SettingsInput
            label="Quiz Name"
            value={details.name}
            onChange={(v) => {
              update({ name: v });
              quickSave({ name: v });
            }}
            placeholder="e.g. Data Structures Midterm"
            required
          />
          {errors.name && <FieldError message={errors.name} />}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text-primary">Description</label>
          <textarea
            value={details.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Briefly describe what this quiz covers..."
            rows={3}
            className="w-full rounded-xl border border-input-border bg-input-bg px-4 py-3 text-sm text-text-primary placeholder-text-muted outline-none transition-all duration-200 focus:border-pink-500 focus:shadow-[0_0_0_3px_var(--input-focus-ring)] resize-none"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <SearchableDropdown
              label="Subject"
              placeholder="Search subjects..."
              required
              value={details.subject}
              selectedId={details.subjectId}
              onSelect={(option) => update({ subject: option.label, subjectId: option.id })}
              onClear={() => update({ subject: "", subjectId: "" })}
              searchFn={async (query, signal) => {
                const results = await getAllSubjects(query, signal);
                return results.map((s) => ({ id: s.id, label: s.subject_name }));
              }}
              minChars={1}
              debounceMs={300}
              maxVisible={8}
            />
            {errors.subject && <FieldError message={errors.subject} />}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-text-primary">Topics</label>
            <div className="rounded-xl border border-input-border bg-input-bg px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {details.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 text-xs font-medium text-pink-500"
                  >
                    {tag}
                    <button onClick={() => update({ tags: details.tags.filter((t) => t !== tag) })} className="hover:text-text-primary transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTagInput}
                  onBlur={addTag}
                  placeholder={details.tags.length === 0 ? "Add topics, press Enter..." : "Add more..."}
                  className="min-w-[140px] flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">Visibility</label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {visibilitySource.map((opt) => {
              const Icon = visibilityIcon(opt.label);
              const active = opt.isDb ? details.visibilityId === opt.id : details.visibility === opt.id;
              return (
                <button
                  key={String(opt.id)}
                  onClick={() =>
                    opt.isDb
                      ? update({ visibility: opt.label as QuizVisibility, visibilityId: opt.id as number })
                      : update({ visibility: opt.id as QuizVisibility, visibilityId: null })
                  }
                  className={cn(
                    "relative rounded-xl border p-4 text-left transition-all duration-200",
                    active
                      ? "border-pink-500 bg-pink-500/10 shadow-[0_0_0_3px_var(--input-focus-ring)]"
                      : "border-input-border bg-input-bg hover:border-border-hover"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <Icon className={cn("h-5 w-5", active ? "text-pink-500" : "text-text-muted")} />
                    {active && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#EC4899] to-[#7C3AED]">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </div>
                  <p className={cn("mt-2 text-sm font-semibold", active ? "text-pink-500" : "text-text-primary")}>
                    {opt.label}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </SettingsCard>
  );
}
