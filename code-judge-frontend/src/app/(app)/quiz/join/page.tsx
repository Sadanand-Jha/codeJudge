"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { JoinQuizModal } from "@/components/quiz/live/JoinQuizModal";
import { joinQuiz } from "@/services/quiz";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";

export default function JoinQuizPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleJoin = async (code: string) => {
    try {
      const result = await joinQuiz({ code });
      if (result?.quiz?.id) {
        toast.success({ title: "Joined successfully", description: "Redirecting to quiz..." });
        router.push(`/quiz/${result.quiz.id}/waiting`);
      } else {
        toast.error({ title: "Failed to join", description: "Invalid quiz code" });
      }
      setIsOpen(false);
    } catch (error) {
      toast.error({ title: "Error", description: "Failed to join quiz" });
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <JoinQuizModal
          open={isOpen}
          onClose={handleClose}
          onJoin={handleJoin}
        />
      </div>
    </div>
  );
}