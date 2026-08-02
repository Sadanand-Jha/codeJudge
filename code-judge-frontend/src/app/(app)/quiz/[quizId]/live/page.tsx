"use client";

import { notFound, useParams } from "next/navigation";
import LiveAssessmentRoom from "@/components/quiz/live/LiveAssessmentRoom";
import {
  mockLiveAssessmentRoom,
  mockEmptyLiveAssessmentRoom,
} from "@/mocks/liveAssessment";

/**
 * Live Assessment Room — route page.
 *
 * Opens whenever a teacher starts or monitors an active quiz.
 * Uses mock data so this is purely a frontend feature.
 *
 * Route: /quiz/[quizId]/live
 */
export default function LiveAssessmentRoomPage() {
  const params = useParams<{ quizId?: string }>();
  const quizId = params?.quizId;

  if (!quizId) {
    notFound();
  }

  // Pick the populated mock room for known quiz ids, empty state otherwise.
  // In a real app this would be fetched from a backend API.
  let roomData = mockLiveAssessmentRoom;
  if (quizId === mockEmptyLiveAssessmentRoom.quizId) {
    roomData = mockEmptyLiveAssessmentRoom;
  }

  return <LiveAssessmentRoom data={roomData} />;
}
