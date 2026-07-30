import apiClient from "@/lib/axios";
import type { UserProfile } from "@/types/user";

export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>("/v1/user/profile");
  return response.data;
}