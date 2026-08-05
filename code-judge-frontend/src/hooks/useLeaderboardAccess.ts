import { useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { QuizLeaderboardSettings } from "@/types/quiz";

interface UseLeaderboardAccessOptions {
  quizCreatorId: string;
  leaderboardSettings: QuizLeaderboardSettings;
  quizStatus: "upcoming" | "active" | "completed" | "expired";
  hasAllParticipantsSubmitted?: boolean;
}

interface LeaderboardAccessResult {
  canView: boolean;
  reason?: string;
  showToParticipants: boolean;
  isCreatorOrAdmin: boolean;
}

/**
 * Hook to determine if a user can access the quiz leaderboard
 * 
 * Access Logic:
 * - If leaderboard is disabled: only creators/admins can view
 * - If enabled:
 *   - Students can view if showToParticipants is true AND timing conditions are met
 *   - Creators and admins always have access
 * 
 * Timing conditions (when showToParticipants is true):
 * - showLiveDuringQuiz: visible during active quiz
 * - showAfterQuizEnds: visible after quiz ends
 * - showAfterAllSubmitted: visible only after all participants have submitted
 */
export function useLeaderboardAccess({
  quizCreatorId,
  leaderboardSettings,
  quizStatus,
  hasAllParticipantsSubmitted = false,
}: UseLeaderboardAccessOptions): LeaderboardAccessResult {
  const { user } = useAuthStore();

  const isCreatorOrAdmin = useMemo(() => {
    if (!user) return false;
    // Creator check
    if (user.id === quizCreatorId) return true;
    // Admin check - adjust based on your user role structure
    const userRole = (user as any).role;
    if (userRole === "admin" || userRole === "superadmin") return true;
    return false;
  }, [user, quizCreatorId]);

  const accessResult = useMemo(() => {
    // If leaderboard is not enabled in settings
    if (!leaderboardSettings.enabled) {
      return {
        canView: isCreatorOrAdmin,
        reason: isCreatorOrAdmin ? undefined : "Leaderboard is disabled for this quiz",
        showToParticipants: false,
        isCreatorOrAdmin,
      };
    }

    // If user is creator or admin, always allow access
    if (isCreatorOrAdmin) {
      return {
        canView: true,
        showToParticipants: leaderboardSettings.showToParticipants,
        isCreatorOrAdmin: true,
      };
    }

    // For regular participants, check if showToParticipants is enabled
    if (!leaderboardSettings.showToParticipants) {
      return {
        canView: false,
        reason: "The quiz creator has disabled leaderboard visibility for participants.",
        showToParticipants: false,
        isCreatorOrAdmin: false,
      };
    }

    // Check timing conditions
    const timingConditions = {
      showLiveDuringQuiz: leaderboardSettings.showLiveDuringQuiz,
      showAfterQuizEnds: leaderboardSettings.showAfterQuizEnds,
      showAfterAllSubmitted: leaderboardSettings.showAfterAllSubmitted,
    };

    // If no timing options are enabled, default to not showing
    if (!timingConditions.showLiveDuringQuiz && !timingConditions.showAfterQuizEnds && !timingConditions.showAfterAllSubmitted) {
      return {
        canView: false,
        reason: "Leaderboard is not yet available.",
        showToParticipants: true,
        isCreatorOrAdmin: false,
      };
    }

    // Evaluate timing conditions based on quiz status
    const isQuizActive = quizStatus === "active";
    const isQuizCompleted = quizStatus === "completed" || quizStatus === "expired";

    // Check if "show after all submitted" is enabled and condition not met
    if (timingConditions.showAfterAllSubmitted && !hasAllParticipantsSubmitted) {
      return {
        canView: false,
        reason: "Leaderboard will be available after all participants have submitted.",
        showToParticipants: true,
        isCreatorOrAdmin: false,
      };
    }

    // Check if live leaderboard during quiz
    if (isQuizActive && timingConditions.showLiveDuringQuiz) {
      return {
        canView: true,
        showToParticipants: true,
        isCreatorOrAdmin: false,
      };
    }

    // Check if leaderboard should show after quiz ends
    if (isQuizCompleted && timingConditions.showAfterQuizEnds) {
      return {
        canView: true,
        showToParticipants: true,
        isCreatorOrAdmin: false,
      };
    }

    // If quiz is active but live leaderboard is not enabled
    if (isQuizActive && !timingConditions.showLiveDuringQuiz) {
      return {
        canView: false,
        reason: "Leaderboard will be available after the quiz ends.",
        showToParticipants: true,
        isCreatorOrAdmin: false,
      };
    }

    // If quiz hasn't started yet
    if (quizStatus === "upcoming") {
      return {
        canView: false,
        reason: "Leaderboard will be available after the quiz starts.",
        showToParticipants: true,
        isCreatorOrAdmin: false,
      };
    }

    // Default: deny access if no conditions match
    return {
      canView: false,
      reason: "Leaderboard is not available at this time.",
      showToParticipants: true,
      isCreatorOrAdmin: false,
    };
  }, [
    leaderboardSettings,
    isCreatorOrAdmin,
    quizStatus,
    hasAllParticipantsSubmitted,
  ]);

  return accessResult;
}