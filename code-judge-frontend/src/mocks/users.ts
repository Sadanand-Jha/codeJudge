import { getAvatarUrlById } from "@/config/dicebear";

export interface MockUser {
  id: string;
  username: string;
  avatar: string;
  rating?: number;
  rank?: string;
}

export const mockUsers: MockUser[] = [
  { id: "u1", username: "tourist", avatar: getAvatarUrlById(1), rating: 3850, rank: "Legendary Grandmaster" },
  { id: "u2", username: "benq", avatar: getAvatarUrlById(2), rating: 3700, rank: "Legendary Grandmaster" },
  { id: "u3", username: "petr", avatar: getAvatarUrlById(3), rating: 3600, rank: "Legendary Grandmaster" },
  { id: "u4", username: "ecnerwala", avatar: getAvatarUrlById(4), rating: 3500, rank: "International Grandmaster" },
  { id: "u5", username: "ksun48", avatar: getAvatarUrlById(5), rating: 3400, rank: "International Grandmaster" },
  { id: "u6", username: "dolphingarlic", avatar: getAvatarUrlById(6), rating: 3300, rank: "International Grandmaster" },
  { id: "u7", username: "jiangly", avatar: getAvatarUrlById(7), rating: 3200, rank: "Grandmaster" },
  { id: "u8", username: "mnbvmar", avatar: getAvatarUrlById(8), rating: 3100, rank: "Grandmaster" },
  { id: "u9", username: "BurnedChicken", avatar: getAvatarUrlById(9), rating: 2900, rank: "Master" },
  { id: "u10", username: "TLE", avatar: getAvatarUrlById(10), rating: 2400, rank: "International Master" },
  { id: "u11", username: "NewbieCoder", avatar: getAvatarUrlById(11), rating: 1100, rank: "Pupil" },
  { id: "u12", username: "BinaryWizard", avatar: getAvatarUrlById(12), rating: 1800, rank: "Candidate Master" },
  { id: "u13", username: "CodeNinja", avatar: getAvatarUrlById(13), rating: 2100, rank: "Master" },
  { id: "u14", username: "GraphExplorer", avatar: getAvatarUrlById(14), rating: 1650, rank: "Expert" },
  { id: "u15", username: "DP_God", avatar: getAvatarUrlById(15), rating: 2700, rank: "International Master" },
  { id: "u16", username: "BitMask", avatar: getAvatarUrlById(16), rating: 1950, rank: "Candidate Master" },
  { id: "u17", username: "SegmentTree", avatar: getAvatarUrlById(17), rating: 2300, rank: "Master" },
  { id: "u18", username: "FlowMaster", avatar: getAvatarUrlById(18), rating: 2600, rank: "International Master" },
];

export function getMockUser(id: string): MockUser | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function getRandomMockUser(): MockUser {
  return mockUsers[Math.floor(Math.random() * mockUsers.length)];
}