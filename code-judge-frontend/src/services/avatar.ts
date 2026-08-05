import apiClient from "@/lib/axios";

interface UpdateAvatarRequest {
  avatarUrl: string;
}

interface UpdateAvatarResponse {
  avatarUrl: string;
}

/**
 * Update user avatar
 * PATCH /api/v1/user/avatar
 */
export async function updateAvatar(avatarUrl: string): Promise<string> {
  const response = await apiClient.patch<UpdateAvatarResponse>("/v1/user/avatar", {
    avatarUrl,
  });
  return response.data.avatarUrl;
}
