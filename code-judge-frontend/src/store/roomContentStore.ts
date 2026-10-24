"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface RoomAnnouncement {
  id: string;
  roomId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomDocument {
  id: string;
  roomId: string;
  name: string;
  type: string;
  size: string;
  addedAt: string;
}

interface RoomContentState {
  announcements: RoomAnnouncement[];
  documents: RoomDocument[];
  seededRoomIds: string[];
  seedRoom: (roomId: string, roomName?: string) => void;
  addAnnouncement: (roomId: string, input: { title: string; body: string }) => void;
  updateAnnouncement: (id: string, input: { title: string; body: string }) => void;
  deleteAnnouncement: (id: string) => void;
  addDocument: (roomId: string, input: { name: string; type: string; size: string }) => void;
  deleteDocument: (id: string) => void;
}

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function seedAnnouncements(roomId: string, roomName: string): RoomAnnouncement[] {
  const now = Date.now();
  return [
    {
      id: uid("ann"),
      roomId,
      title: `Welcome to ${roomName}`,
      body: "I'll share class notes and important updates here. Please check this space before every class.",
      createdAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uid("ann"),
      roomId,
      title: "Chapter test on Friday",
      body: "The revision notes are in the Documents section. Complete the practice sheet before the test.",
      createdAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function seedDocuments(roomId: string): RoomDocument[] {
  const now = Date.now();
  return [
    {
      id: uid("doc"),
      roomId,
      name: "Chapter 3 — Class Notes.pdf",
      type: "PDF",
      size: "2.4 MB",
      addedAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uid("doc"),
      roomId,
      name: "Practice Sheet.docx",
      type: "DOCX",
      size: "860 KB",
      addedAt: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: uid("doc"),
      roomId,
      name: "Class Timetable.pdf",
      type: "PDF",
      size: "1.1 MB",
      addedAt: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export const useRoomContentStore = create<RoomContentState>()(
  persist(
    (set) => ({
      announcements: [],
      documents: [],
      seededRoomIds: [],

      seedRoom: (roomId, roomName) =>
        set((state) => {
          if (!roomId || state.seededRoomIds.includes(roomId)) return state;
          const name = roomName?.trim() || "your room";
          return {
            announcements: [...state.announcements, ...seedAnnouncements(roomId, name)],
            documents: [
              ...state.documents,
              ...seedDocuments(roomId).map((doc) => ({ ...doc, roomId })),
            ],
            seededRoomIds: [...state.seededRoomIds, roomId],
          };
        }),

      addAnnouncement: (roomId, input) => {
        const now = new Date().toISOString();
        set((state) => ({
          announcements: [
            {
              id: uid("ann"),
              roomId,
              title: input.title.trim(),
              body: input.body.trim(),
              createdAt: now,
              updatedAt: now,
            },
            ...state.announcements,
          ],
        }));
      },

      updateAnnouncement: (id, input) =>
        set((state) => ({
          announcements: state.announcements.map((announcement) =>
            announcement.id === id
              ? {
                  ...announcement,
                  title: input.title.trim(),
                  body: input.body.trim(),
                  updatedAt: new Date().toISOString(),
                }
              : announcement
          ),
        })),

      deleteAnnouncement: (id) =>
        set((state) => ({
          announcements: state.announcements.filter((announcement) => announcement.id !== id),
        })),

      addDocument: (roomId, input) =>
        set((state) => ({
          documents: [
            {
              id: uid("doc"),
              roomId,
              name: input.name,
              type: input.type,
              size: input.size,
              addedAt: new Date().toISOString(),
            },
            ...state.documents,
          ],
        })),

      deleteDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((document) => document.id !== id),
        })),
    }),
    {
      name: "quizsupport_room_content",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
