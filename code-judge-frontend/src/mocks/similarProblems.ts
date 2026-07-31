export interface MockSimilarProblem {
  id: string;
  title: string;
  rating: number;
  tags: string[];
}

export const mockSimilarProblems: MockSimilarProblem[] = [
  { id: "4A", title: "Watermelon", rating: 800, tags: ["Brute Force", "Math"] },
  { id: "1A", title: "Theatre Square", rating: 1000, tags: ["Math"] },
  { id: "71A", title: "Way Too Long Words", rating: 800, tags: ["Strings"] },
  { id: "158A", title: "Next Round", rating: 1000, tags: ["Sorting", "Implementation"] },
  { id: "282A", title: "Bit++", rating: 800, tags: ["Implementation"] },
  { id: "116A", title: "Tram", rating: 900, tags: ["Implementation", "Math"] },
];