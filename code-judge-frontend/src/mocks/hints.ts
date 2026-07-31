export interface MockHint {
  id: string;
  text: string;
  isRevealed?: boolean;
}

export const mockHints: MockHint[] = [
  {
    id: "hint_1",
    text: "Think about how you would solve this problem if the array only contained positive numbers. Can you extend that approach?",
  },
  {
    id: "hint_2",
    text: "Consider using a sliding window or two-pointer technique. What condition would allow you to expand or shrink the window?",
  },
  {
    id: "hint_3",
    text: "Prefix sums can help you compute the sum of any subarray in O(1). How might that simplify your solution?",
  },
  {
    id: "hint_4",
    text: "The optimal solution has O(n) time complexity. Think about what information you need to maintain at each step.",
  },
  {
    id: "hint_5",
    text: "Use Kadane's algorithm: maintain current_sum and best. At each step, decide whether to extend the current subarray or start fresh. The transition is: current_sum = max(arr[i], current_sum + arr[i]).",
  },
];