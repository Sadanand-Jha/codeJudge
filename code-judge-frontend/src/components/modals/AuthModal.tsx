"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Lock,
  Sparkles,
  Trophy,
  Bot,
  TrendingUp,
  Bookmark,
  Map,
  MessageSquare,
  ChevronRight,
  Users,
  Code,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectUrl?: string;
}

const features = [
  {
    icon: Trophy,
    title: "Join Contests",
    description: "Submit solutions and compete globally.",
    color: "text-[#FFD700]",
    bgColor: "bg-[#FFD700]/10",
  },
  {
    icon: Bot,
    title: "AI Coding Assistant",
    description: "Debug, optimize and explain your code.",
    color: "text-[#7C3AED]",
    bgColor: "bg-[#7C3AED]/10",
  },
  {
    icon: TrendingUp,
    title: "Track Progress",
    description: "Ratings, streaks and analytics.",
    color: "text-[#22C55E]",
    bgColor: "bg-[#22C55E]/10",
  },
  {
    icon: Bookmark,
    title: "Save Collections",
    description: "Bookmark problems and organize learning.",
    color: "text-[#3B82F6]",
    bgColor: "bg-[#3B82F6]/10",
  },
  {
    icon: Map,
    title: "Personalized Roadmaps",
    description: "AI generated learning paths.",
    color: "text-[#F59E0B]",
    bgColor: "bg-[#F59E0B]/10",
  },
  {
    icon: MessageSquare,
    title: "Discussions",
    description: "Ask questions and help others.",
    color: "text-[#EC4899]",
    bgColor: "bg-[#EC4899]/10",
  },
];

const socialProof = [
  { icon: Users, stat: "85,000+", label: "developers practicing" },
  { icon: Code, stat: "3.2M+", label: "submissions this month" },
  { icon: Bot, stat: "420,000+", label: "problems solved with AI" },
];

export default function AuthModal({ isOpen, onClose, redirectUrl }: AuthModalProps) {
  const [showSocialProof, setShowSocialProof] = useState(false);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleOverlayClick}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="relative rounded-2xl border bg-[#111827] p-0 shadow-2xl" style={{ borderColor: "#23252F" }}>
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-[#6B7280] hover:bg-[#1F2937] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center px-8 pt-8 pb-6">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="relative mb-4"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#3B82F6]">
                    <Lock className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#111827]" style={{ borderColor: "#23252F", borderWidth: 2 }}>
                    <Sparkles className="h-3 w-3 text-[#7C3AED]" />
                  </div>
                </motion.div>

                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-bold text-white"
                >
                  Continue with ByteClash
                </motion.h2>

                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2 text-center text-[13px] text-[#9CA3AF] max-w-[380px]"
                >
                  Create a free account to unlock submissions, AI assistance, contests, discussions and personalized progress tracking.
                </motion.p>
              </div>

              {/* Feature Grid */}
              <div className="px-8 pb-6">
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="grid grid-cols-2 gap-3"
                >
                  {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <motion.div
                        key={feature.title}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        whileHover={{ scale: 1.02, y: -2 }}
                        className={`flex items-start gap-3 rounded-xl border p-3 transition-all cursor-default ${feature.bgColor}`}
                        style={{ borderColor: "rgba(35, 37, 47, 0.5)" }}
                      >
                        <div className={`rounded-lg p-1.5 ${feature.bgColor}`}>
                          <Icon className={`h-4 w-4 ${feature.color}`} />
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-white">{feature.title}</div>
                          <div className="text-[9px] text-[#6B7280]">{feature.description}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* Buttons */}
              <div className="px-8 pb-6">
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col gap-3"
                >
                  <Link
                    href={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#3B82F6] px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-[#7C3AED]/25 hover:shadow-[#7C3AED]/40 transition-all hover:scale-[1.02]"
                    onClick={onClose}
                  >
                    Create Free Account
                    <ChevronRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`}
                    className="flex items-center justify-center gap-2 rounded-xl border px-6 py-3.5 text-[14px] font-semibold text-white transition-all hover:bg-[#1F2937]"
                    style={{ borderColor: "#23252F" }}
                    onClick={onClose}
                  >
                    Sign In
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="mt-4 flex items-center justify-center gap-1 text-[11px] text-[#6B7280]"
                >
                  <CheckCircle className="h-3 w-3 text-[#22C55E]" />
                  No credit card required
                  <span className="mx-1">·</span>
                  Free forever for practice
                </motion.div>
              </div>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showSocialProof ? 1 : 0 }}
                className="border-t px-8 py-5"
                style={{ borderColor: "#23252F" }}
              >
                <div className="flex items-center justify-center gap-6">
                  {socialProof.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-[#6B7280]" />
                        <div>
                          <div className="text-[12px] font-bold text-white">{item.stat}</div>
                          <div className="text-[9px] text-[#6B7280]">{item.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}