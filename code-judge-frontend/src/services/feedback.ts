import apiClient from "@/lib/axios";

export interface FeedbackSubmission {
  category: string;
  message: string;
}

export interface FeedbackReceipt {
  id: number;
  category: string;
  message: string;
  created_at: string;
}

/**
 * Submit product feedback from the contact page.
 * Requires a signed-in session.
 * POST /api/v1/user/feedback
 */
export async function submitFeedback(payload: FeedbackSubmission): Promise<FeedbackReceipt> {
  const response = await apiClient.post<FeedbackReceipt>("/v1/user/feedback", payload);
  return response.data;
}
