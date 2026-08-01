"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Plus } from "lucide-react";
import { useQuizVisibility } from "@/mocks/useQuizVisibility";
import VisibilitySelector from "@/components/quiz/VisibilitySelector";
import CollegeFilterPanel from "@/components/quiz/CollegeFilterPanel";
import SchedulingPanel from "@/components/quiz/SchedulingPanel";
import AccessRestrictionsPanel from "@/components/quiz/AccessRestrictions";
import PermissionToggle from "@/components/quiz/PermissionToggle";
import CollaboratorManager from "@/components/quiz/CollaboratorManager";
import QuestionBuilder from "@/components/quiz/QuestionBuilder";
import AssessmentSettingsPanel from "@/components/quiz/AssessmentSettingsPanel";
import { QuizQuestion, AssessmentSettings, DEFAULT_ASSESSMENT_SETTINGS } from "@/types/quiz";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";

export default function CreateQuizPage() {
  const {
    visibility,
    setVisibility,
    config,
    collegeFilter,
    setCollegeFilter,
    companyFilter,
    setCompanyFilter,
    organizationFilter,
    setOrganizationFilter,
    classroomFilter,
    setClassroomFilter,
    inviteInfo,
    setInviteInfo,
    contestFilter,
    setContestFilter,
    discoveryPermissions,
    setDiscoveryPermissions,
    collaborators,
    setCollaborators,
    restrictions,
    setRestrictions,
    schedule,
    setSchedule,
    reset,
  } = useQuizVisibility("global");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: "q_1",
      type: "multiple_choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      points: 10,
      difficulty: "Medium",
      tags: [],
    },
  ]);
  const [assessmentSettings, setAssessmentSettings] = useState<AssessmentSettings>(DEFAULT_ASSESSMENT_SETTINGS);

  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const quizId = `quiz_${Date.now()}`;
    console.log("Quiz data:", { id: quizId, title, description, visibility: config.visibility, questions, assessmentSettings });
    toast.success("Quiz created successfully! Redirecting to dashboard...");
    router.push(`/quiz/${quizId}/dashboard`);
  };

  return (
    <div className="min-h-screen bg-[#09090B] p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
          <h1 className="text-2xl font-bold text-white">Create New Quiz</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-white">Basic Information</h2>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#9CA3AF]">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter quiz title"
                className="w-full h-9 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 text-xs text-white focus:border-[#7C3AED] focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#9CA3AF]">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your quiz"
                className="w-full h-24 rounded-lg border border-white/[0.08] bg-[#0B0D12] px-3 py-2 text-xs text-white focus:border-[#7C3AED] focus:outline-none resize-none"
                required
              />
            </div>
          </motion.div>

          {/* Visibility */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6 space-y-4"
          >
            <h2 className="text-sm font-semibold text-white">Visibility</h2>
            <VisibilitySelector value={visibility} onChange={setVisibility} />

            {/* Dynamic panels based on visibility */}
            {visibility === "college_only" && (
              <CollegeFilterPanel filter={collegeFilter} onChange={setCollegeFilter} />
            )}
            {visibility === "company_only" && (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-xs text-[#9CA3AF]">
                Company filter panel placeholder. Reuse CollegeFilterPanel pattern.
              </div>
            )}
            {visibility === "organization" && (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-xs text-[#9CA3AF]">
                Organization filter panel placeholder.
              </div>
            )}
            {visibility === "classroom" && (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-xs text-[#9CA3AF]">
                Classroom filter panel placeholder.
              </div>
            )}
            {visibility === "invite_only" && (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-xs text-[#9CA3AF]">
                Invite info panel placeholder.
              </div>
            )}
            {visibility === "contest_only" && (
              <div className="p-4 rounded-xl border border-dashed border-white/[0.08] text-xs text-[#9CA3AF]">
                Contest filter panel placeholder.
              </div>
            )}
          </motion.div>

          {/* Scheduling */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
          >
            <SchedulingPanel schedule={schedule} onChange={setSchedule} />
          </motion.div>

          {/* Access Restrictions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
          >
            <AccessRestrictionsPanel restrictions={restrictions} onChange={setRestrictions} />
          </motion.div>

          {/* Discovery Permissions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
          >
            <PermissionToggle permissions={discoveryPermissions} onChange={setDiscoveryPermissions} />
          </motion.div>

          {/* Questions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
          >
            <QuestionBuilder questions={questions} onChange={setQuestions} />
          </motion.div>

          {/* Assessment Settings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
          >
            <AssessmentSettingsPanel settings={assessmentSettings} onChange={setAssessmentSettings} />
          </motion.div>

          {/* Collaborators */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="rounded-2xl border border-white/[0.08] bg-[#111827] p-6"
          >
            <CollaboratorManager collaborators={collaborators} onChange={setCollaborators} />
          </motion.div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="flex h-10 items-center gap-2 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 px-6 text-sm font-bold text-[#22C55E] transition-all hover:bg-[#22C55E]/20"
            >
              Create Quiz
            </button>
            <button
              type="button"
              onClick={reset}
              className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white transition-all hover:border-white/20 hover:bg-white/10"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}