export interface MockStatistics {
  acceptanceRate: string;
  accepted: number;
  attempts: number;
  averageRuntime: string;
  fastestRuntime: string;
  averageMemory: string;
}

export const mockStatistics: MockStatistics = {
  acceptanceRate: "63.4%",
  accepted: 14283,
  attempts: 22491,
  averageRuntime: "62 ms",
  fastestRuntime: "0 ms",
  averageMemory: "14 MB",
};