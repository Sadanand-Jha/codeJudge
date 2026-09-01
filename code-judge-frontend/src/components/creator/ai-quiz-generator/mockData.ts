import type { AiQuizConfig, DetectedProblem } from "./types";

export const MOCK_PROBLEMS: DetectedProblem[] = [
  { id: "p1", number: 1, title: "Two Sum Variant", topic: "Arrays", difficulty: "Easy", confidence: "high" },
  { id: "p2", number: 2, title: "Longest Substring Without Repeating Characters", topic: "Strings", difficulty: "Medium", confidence: "high" },
  { id: "p3", number: 3, title: "Binary Tree Level Order Traversal", topic: "Trees", difficulty: "Medium", confidence: "high" },
  { id: "p4", number: 4, title: "Merge Two Sorted Lists", topic: "Linked Lists", difficulty: "Easy", confidence: "high" },
  { id: "p5", number: 5, title: "Valid Parentheses", topic: "Stacks", difficulty: "Easy", confidence: "high" },
  { id: "p6", number: 6, title: "Climbing Stairs", topic: "Dynamic Programming", difficulty: "Easy", confidence: "high" },
  { id: "p7", number: 7, title: "Binary Search", topic: "Searching", difficulty: "Easy", confidence: "high" },
  { id: "p8", number: 8, title: "Maximum Subarray", topic: "Dynamic Programming", difficulty: "Medium", confidence: "high" },
  { id: "p9", number: 9, title: "Graph BFS: Shortest Path", topic: "Graphs", difficulty: "Medium", confidence: "medium" },
  { id: "p10", number: 10, title: "Detect Cycle in Linked List", topic: "Linked Lists", difficulty: "Medium", confidence: "high" },
  { id: "p11", number: 11, title: "Invert Binary Tree", topic: "Trees", difficulty: "Easy", confidence: "high" },
  { id: "p12", number: 12, title: "Flood Fill Algorithm", topic: "Graphs", difficulty: "Medium", confidence: "high" },
  { id: "p13", number: 13, title: "Longest Increasing Subsequence", topic: "Dynamic Programming", difficulty: "Hard", confidence: "medium" },
  { id: "p14", number: 14, title: "Word Break Problem", topic: "Dynamic Programming", difficulty: "Medium", confidence: "high" },
  { id: "p15", number: 15, title: "Top K Frequent Elements", topic: "Heaps", difficulty: "Medium", confidence: "high" },
  { id: "p16", number: 16, title: "Course Schedule (Topological Sort)", topic: "Graphs", difficulty: "Hard", confidence: "medium" },
  { id: "p17", number: 17, title: "Implement Trie (Prefix Tree)", topic: "Trees", difficulty: "Medium", confidence: "high" },
  { id: "p18", number: 18, title: "Median of Two Sorted Arrays", topic: "Arrays", difficulty: "Hard", confidence: "low" },
  { id: "p19", number: 19, title: "Serialize and Deserialize Binary Tree", topic: "Trees", difficulty: "Hard", confidence: "medium" },
  { id: "p20", number: 20, title: "Trapping Rain Water", topic: "Arrays", difficulty: "Hard", confidence: "high" },
];

export const MOCK_QUIZ_CONFIG: AiQuizConfig = {
  name: "Data Structures & Algorithms — Problem Solving Assessment",
  shortDescription: "A comprehensive DSA assessment covering arrays, trees, graphs, and dynamic programming.",
  description:
    "A comprehensive assessment covering core data structures and algorithmic problem-solving techniques. This quiz evaluates understanding of arrays, trees, graphs, dynamic programming, and essential problem-solving patterns commonly tested in technical interviews.",
  instructions:
    "You have 90 minutes to complete this assessment. Each problem is worth equal marks. There is no negative marking. Read each problem carefully before attempting. You may solve the problems in any order. Partial solutions will receive partial credit where applicable.",
  subject: "Data Structures & Algorithms",
  exam: "Technical Interview Preparation",
  topics: ["Arrays", "Trees", "Graphs", "Dynamic Programming", "Linked Lists", "Stacks", "Heaps", "Searching"],
  difficulty: "Medium",
  duration: 90,
  questionCount: 20,
  assessmentType: "Problem Solving",
  suggestedAudience: "Undergraduate / Technical Interview Preparation",
  tags: ["DSA", "Algorithms", "Problem Solving", "Data Structures", "Coding Interview"],
  thumbnailUrl: "",
  problems: MOCK_PROBLEMS,
  nameConfidence: "high",
  descriptionConfidence: "medium",
};

export const ANALYSIS_STEPS = [
  "Reading document",
  "Identifying questions",
  "Understanding topics",
  "Detecting difficulty",
  "Analyzing problem types",
  "Estimating solving time",
  "Classifying by skill level",
  "Preparing quiz configuration",
];
