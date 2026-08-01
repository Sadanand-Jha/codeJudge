import apiClient from "@/lib/axios";
import type { UserProfile, UserInfo } from "@/types/user";

export async function getProfile(): Promise<UserProfile> {
  const response = await apiClient.get<UserProfile>("/v1/user/profile");
  return response.data;
}

interface AuthMeResponse {
  user: UserInfo;
}

export async function getUserInfo(): Promise<UserInfo> {
  const response = await apiClient.get<AuthMeResponse>("/auth/me");
  return response.data.user;
}
