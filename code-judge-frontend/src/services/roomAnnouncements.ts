import apiClient from "@/lib/axios";

export interface RoomAnnouncement {
  id: string;
  roomId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
}

export async function listRoomAnnouncements(roomId: string): Promise<RoomAnnouncement[]> {
  const response = await apiClient.get<RoomAnnouncement[]>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/announcements`
  );
  return Array.isArray(response.data) ? response.data : [];
}

export async function createRoomAnnouncement(
  roomId: string,
  input: { title: string; body: string }
): Promise<RoomAnnouncement> {
  const response = await apiClient.post<RoomAnnouncement>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/announcements`,
    input
  );
  return response.data;
}

export async function updateRoomAnnouncement(
  roomId: string,
  announcementId: string,
  input: { title: string; body: string }
): Promise<RoomAnnouncement> {
  const response = await apiClient.patch<RoomAnnouncement>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/announcements/${encodeURIComponent(announcementId)}`,
    input
  );
  return response.data;
}

export async function deleteRoomAnnouncement(
  roomId: string,
  announcementId: string
): Promise<{ deletedId: string }> {
  const response = await apiClient.delete<{ deletedId: string }>(
    `/v1/user/rooms/${encodeURIComponent(roomId)}/announcements/${encodeURIComponent(announcementId)}`
  );
  return response.data;
}
