"use client";

import { motion } from "framer-motion";
import { User, BookOpen, Radio } from "lucide-react";

interface QuizHeaderProps {
  quizName: string;
  teacherName: string;
  subject: string;
  status?: "waiting" | "live";
  className?: string;
}

export function QuizHeader({ quizName, teacherName, subject, status = "waiting", className = "" }: QuizHeaderProps) {
  const waiting = status === "waiting";
  return (
    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col items-center text-center px-4 ${className}`}>
      <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-3">
        <Radio className="w-3 h-3 text-[#EC4899]" />
        {waiting ? "Waiting Room" : "In Session"}
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1.5 truncate">{quizName}</h1>
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1.5"><User className="w-4 h-4 text-[#EC4899]" />{teacherName}</span>
        <span className="w-1 h-1 rounded-full bg-[#71717A]" />
        <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-[#EC4899]" />{subject}</span>
      </div>
      {waiting && <span className="text-xs text-[#F59E0B]">Waiting for the teacher to start the quiz...</span>}
    </motion.div>
  );
}

export default QuizHeader;
