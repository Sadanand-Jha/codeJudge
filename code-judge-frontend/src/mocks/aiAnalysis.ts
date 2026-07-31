export interface MockAIAnalysis {
  difficulty: string;
  requiredConcepts: string[];
  commonMistakes: string[];
  recommendedDifficulty: number[];
  learningOutcome: string;
}

export const mockAIAnalysis: MockAIAnalysis = {
  difficulty: "Medium",
  requiredConcepts: ["Binary Search", "Prefix Sum", "Greedy", "Sorting"],
  commonMistakes: ["Integer overflow when summing large values", "Missing edge case at N=1", "Wrong indexing in prefix sum array", "Not handling negative numbers correctly"],
  recommendedDifficulty: [900, 1000, 1100],
  learningOutcome: "This problem teaches the fundamental technique of transforming a problem into a decision problem and binary searching on the answer. It reinforces prefix sum optimizations and careful handling of edge cases with negative values.",
};