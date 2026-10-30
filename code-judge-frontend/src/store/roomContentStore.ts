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
  seedRoom: (roomId: string) => void;
  addAnnouncement: (roomId: string, input: { title: string; body: string }) => void;
  updateAnnouncement: (id: string, input: { title: string; body: string }) => void;
  deleteAnnouncement: (id: string) => void;
  addDocument: (roomId: string, input: { name: string; type: string; size: string }) => void;
  deleteDocument: (id: string) => void;
}

const uid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const LEGACY_SEEDED_ANNOUNCEMENT_BODIES = new Set([
  "I'll share class notes and important updates here. Please check this space before every class.",
  "The revision notes are in the Documents section. Complete the practice sheet before the test.",
]);

const LEGACY_SEEDED_DOCUMENT_NAMES = new Set([
  "Chapter 3 — Class Notes.pdf",
  "Practice Sheet.docx",
  "Class Timetable.pdf",
]);

function isLegacySeededAnnouncement(announcement: RoomAnnouncement): boolean {
  return LEGACY_SEEDED_ANNOUNCEMENT_BODIES.has(announcement.body);
}

function isLegacySeededDocument(document: RoomDocument): boolean {
  return LEGACY_SEEDED_DOCUMENT_NAMES.has(document.name);
}

export const useRoomContentStore = create<RoomContentState>()(
  persist(
    (set) => ({
      announcements: [],
      documents: [],
      seededRoomIds: [],

      seedRoom: (roomId) =>
        set((state) => {
          if (!roomId || state.seededRoomIds.includes(roomId)) return state;
          return {
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
      version: 1,
      migrate: (persistedState) => {
        const state = (persistedState ?? {}) as Partial<RoomContentState>;
        return {
          ...state,
          announcements: (state.announcements ?? []).filter(
            (announcement) => !isLegacySeededAnnouncement(announcement)
          ),
          documents: (state.documents ?? []).filter(
            (document) => !isLegacySeededDocument(document)
          ),
          seededRoomIds: [],
        } as RoomContentState;
      },
    }
  )
);
