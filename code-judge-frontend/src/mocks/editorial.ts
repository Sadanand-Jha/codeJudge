export interface MockEditorial {
  intuition: string;
  observations: string[];
  proof: string;
  complexity: string;
  edgeCases: string[];
  approach: string;
}

export const mockEditorial: MockEditorial = {
  intuition: "The problem asks us to find the maximum sum of a subarray with some constraints. The key insight is that we can use a sliding window technique combined with a data structure that supports efficient range queries.",
  observations: [
    "The optimal subarray is always contiguous.",
    "Prefix sums allow O(1) range sum queries after O(n) preprocessing.",
    "For the constraint version, we only need to consider subarrays where the sum of elements is within a specific range.",
    "The problem has optimal substructure: the answer for prefix i can be computed from answers for prefixes < i.",
    "Greedy approaches fail because local optima don't lead to global optima when negative numbers are present.",
  ],
  proof: "We prove by induction that the algorithm maintains the invariant: after processing element i, dp[i] contains the maximum sum of a valid subarray ending at i.\n\nBase case: i=0, dp[0] = max(0, arr[0]).\nInductive step: Assume the invariant holds for all j < i. For position i, we can either start a new subarray at i, or extend a previous valid subarray. The transition dp[i] = max(arr[i], dp[i-1] + arr[i]) correctly captures this choice.\n\nThus by induction, the algorithm is correct.",
  complexity: "Time: O(n) — single pass through the array. Space: O(1) — only storing the current maximum and global maximum.",
  edgeCases: [
    "All negative numbers: the answer is the maximum single element.",
    "Single element array: return that element.",
    "All zeros: return 0.",
    "Array length at maximum constraint (2×10⁵): ensure no stack overflow and O(n) runtime.",
    "Mixed positive and negative with large absolute values: use 64-bit integers.",
  ],
  approach: "1. Initialize current_sum = 0 and best = -∞.\n2. Iterate through each element x:\n   - current_sum = max(x, current_sum + x)\n   - best = max(best, current_sum)\n3. Return best.\n\nThis is Kadane's algorithm. The insight is that at each step, we decide whether to continue the current subarray or start fresh. The O(n) complexity comes from the fact that we only need the best sum ending at the previous position.",
};