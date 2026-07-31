export interface MockUser {
  id: string;
  username: string;
  avatar: string;
  rating?: number;
  rank?: string;
}

export const mockUsers: MockUser[] = [
  { id: "u1", username: "tourist", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tourist", rating: 3850, rank: "Legendary Grandmaster" },
  { id: "u2", username: "benq", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=benq", rating: 3700, rank: "Legendary Grandmaster" },
  { id: "u3", username: "petr", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=petr", rating: 3600, rank: "Legendary Grandmaster" },
  { id: "u4", username: "ecnerwala", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ecnerwala", rating: 3500, rank: "International Grandmaster" },
  { id: "u5", username: "ksun48", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ksun48", rating: 3400, rank: "International Grandmaster" },
  { id: "u6", username: "dolphingarlic", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=dolphingarlic", rating: 3300, rank: "International Grandmaster" },
  { id: "u7", username: "jiangly", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jiangly", rating: 3200, rank: "Grandmaster" },
  { id: "u8", username: "mnbvmar", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mnbvmar", rating: 3100, rank: "Grandmaster" },
  { id: "u9", username: "BurnedChicken", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=BurnedChicken", rating: 2900, rank: "Master" },
  { id: "u10", username: "TLE", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TLE", rating: 2400, rank: "International Master" },
  { id: "u11", username: "NewbieCoder", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=NewbieCoder", rating: 1100, rank: "Pupil" },
  { id: "u12", username: "BinaryWizard", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=BinaryWizard", rating: 1800, rank: "Candidate Master" },
  { id: "u13", username: "CodeNinja", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CodeNinja", rating: 2100, rank: "Master" },
  { id: "u14", username: "GraphExplorer", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=GraphExplorer", rating: 1650, rank: "Expert" },
  { id: "u15", username: "DP_God", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=DP_God", rating: 2700, rank: "International Master" },
  { id: "u16", username: "BitMask", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=BitMask", rating: 1950, rank: "Candidate Master" },
  { id: "u17", username: "SegmentTree", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=SegmentTree", rating: 2300, rank: "Master" },
  { id: "u18", username: "FlowMaster", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=FlowMaster", rating: 2600, rank: "International Master" },
];

export function getMockUser(id: string): MockUser | undefined {
  return mockUsers.find((u) => u.id === id);
}

export function getRandomMockUser(): MockUser {
  return mockUsers[Math.floor(Math.random() * mockUsers.length)];
}