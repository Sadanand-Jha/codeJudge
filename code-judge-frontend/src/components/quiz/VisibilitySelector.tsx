"use client";

import { motion } from "framer-motion";
import { Globe, GraduationCap, Building2, Users, School, Link, Lock, Mail, Trophy } from "lucide-react";
import { VisibilityOption, QuizVisibility } from "@/types/quiz";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Globe,
  GraduationCap,
  Building2,
  Users,
  School,
  Link,
  Lock,
  Mail,
  Trophy,
};

interface VisibilitySelectorProps {
  value: QuizVisibility;
  onChange: (visibility: QuizVisibility) => void;
  options?: VisibilityOption[];
}

export default function VisibilitySelector({ value, onChange, options }: VisibilitySelectorProps) {
  const items = options || [
    { id: "global", label: "Global", description: "Anyone on CodeJudge can discover and attempt this quiz.", icon: "Globe" },
    { id: "college_only", label: "College Only", description: "Only students from selected colleges can access this quiz.", icon: "GraduationCap" },
    { id: "company_only", label: "Company Only", description: "Only employees of selected companies can access this quiz.", icon: "Building2" },
    { id: "organization", label: "Organization / Club", description: "Only members of selected organizations can access this quiz.", icon: "Users" },
    { id: "classroom", label: "Classroom / Batch", description: "Only enrolled classroom members can access this quiz.", icon: "School" },
    { id: "unlisted", label: "Unlisted", description: "Quiz does not appear in search or feeds. Only users with the link can access it.", icon: "Link" },
    { id: "private", label: "Private", description: "Only the creator and invited collaborators can access this quiz.", icon: "Lock" },
    { id: "invite_only", label: "Invite Only", description: "Only invited users can access this quiz.", icon: "Mail" },
    { id: "contest_only", label: "Contest Only", description: "Only registered contest participants can access this quiz.", icon: "Trophy" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((option) => {
        const Icon = iconMap[option.icon] || Globe;
        const isActive = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200 ${
              isActive
                ? "border-[#EC4899] bg-[#EC4899]/10 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
                : "border-white/[0.08] bg-[#111827] hover:border-white/[0.12] hover:bg-white/[0.02]"
            }`}
          >
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
              isActive ? "border-[#EC4899]/30 bg-[#EC4899]/20 text-[#EC4899]" : "border-white/[0.08] bg-white/[0.03] text-[#9CA3AF]"
            }`}>
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <p className={`text-sm font-semibold ${isActive ? "text-white" : "text-[#E5E7EB]"}`}>{option.label}</p>
              <p className="mt-1 text-xs text-[#9CA3AF] leading-relaxed">{option.description}</p>
            </div>

            {isActive && (
              <motion.div
                layoutId="activeVisibility"
                className="absolute inset-0 rounded-xl border-2 border-[#EC4899] pointer-events-none"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}