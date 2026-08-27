"use client";

import { useState } from "react";
import { JoinQuizModal } from "@/components/quiz/live/JoinQuizModal";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";

export default function JoinQuizPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleJoin = async (code: string) => {
    toast.success({ title: "Joining quiz...", description: `Code: ${code}` });
    setIsOpen(false);
    router.push(`/quiz/${code}/waiting`);
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