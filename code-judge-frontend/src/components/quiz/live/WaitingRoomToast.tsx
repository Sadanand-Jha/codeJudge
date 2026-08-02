"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { LiveParticipant } from "@/types/liveAssessment";
import { DEFAULT_AVATAR_URL, getPredefinedAvatarByUrl } from "@/config/dicebear";

interface ToastData {
  id: string;
  participant: LiveParticipant;
}

export function WaitingRoomToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((participant: LiveParticipant) => {
    const id = `${participant.id}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, participant }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Expose addToast globally for the waiting room to use
  useEffect(() => {
    (window as any).__waitingRoomToast = addToast;
    return () => {
      delete (window as any).__waitingRoomToast;
    };
  }, [addToast]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const displayAvatarUrl =
            toast.participant.avatarUrl && getPredefinedAvatarByUrl(toast.participant.avatarUrl)
              ? toast.participant.avatarUrl
              : DEFAULT_AVATAR_URL;
          return (
            <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#EC4899]/30 bg-[#111217]/90 backdrop-blur-xl shadow-2xl shadow-[#EC4899]/10 min-w-[280px] max-w-[320px]"
          >
            {/* Avatar */}
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  border: "2px solid rgba(236,72,153,0.5)",
                  backgroundColor: "#171923",
                  boxShadow: "0 0 12px rgba(236,72,153,0.3)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayAvatarUrl}
                  alt={toast.participant.username}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Glow pulse */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "2px solid rgba(236,72,153,0.5)" }}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.8, repeat: 1 }}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {toast.participant.username}
              </p>
              <p className="text-[11px] text-[#EC4899]">joined the classroom</p>
              <p className="text-[9px] text-[#71717A] mt-0.5">a few seconds ago</p>
            </div>

            {/* Close button */}
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 rounded-lg hover:bg-white/[0.06] text-[#71717A] hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default WaitingRoomToast;