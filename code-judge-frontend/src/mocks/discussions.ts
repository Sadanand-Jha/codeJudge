import { MockUser, getRandomMockUser, mockUsers } from "./users";

export interface MockReply {
  id: string;
  user: MockUser;
  content: string;
  likes: number;
  postedAt: string;
}

export interface MockDiscussion {
  id: string;
  user: MockUser;
  title: string;
  preview: string;
  likes: number;
  replies: MockReply[];
  postedAt: string;
}

function timeAgo(minutes: number): string {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  if (minutes < 120) return "1 hour ago";
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
  if (minutes < 2880) return "Yesterday";
  return `${Math.floor(minutes / 1440)} days ago`;
}

const titles = [
  "Need help understanding sample 2",
  "Why does greedy fail here?",
  "Edge case at N=1?",
  "My O(n log n) solution gets TLE",
  "Editorial explanation is confusing",
  "Can someone explain the proof?",
  "Is there a DP approach?",
  "How to handle negative numbers?",
  "Why does binary search work here?",
  "I'm getting WA on test 4",
  "Optimal solution using segment tree?",
  "Explanation needed for lemma 2",
  "Alternative O(n) solution?",
  "Debugging help - why is this wrong?",
  "Is this problem actually easy?",
  "Best resources for this topic?",
  "My solution is too slow",
  "How to optimize from O(n^2) to O(n)?",
];

const previews = [
  "I've been staring at sample 2 for 20 minutes and I still don't understand why the output is...",
  "I tried the greedy approach mentioned in the editorial but it fails on test case 5. Can someone explain...",
  "What happens when N=1? My code gives the right answer but I'm not sure if it's handling it correctly...",
  "I implemented the O(n log n) solution but I'm getting TLE on the last test. Time limit is 2s...",
  "The editorial says to use prefix sums but I don't see how that helps with the query part...",
  "Can someone provide a more detailed proof for the lemma? The editorial skips over some steps...",
  "I was thinking of using DP with states (i, k) but the constraints are too large. Is there a better way?",
  "The problem statement mentions negative numbers but doesn't give examples. How should they be handled?",
  "I understand why binary search works on the answer, but how do we check if a value is valid in O(n)?",
  "My solution passes samples but fails on test 4. I've checked edge cases but can't find the bug...",
];

const replyTemplates = [
  "Try using a set instead of a map for better performance.",
  "The edge case is when all elements are the same. Your code doesn't handle that.",
  "I had the same issue. The problem is with integer overflow. Use long long.",
  "Have you considered using binary indexed tree?",
  "The editorial is correct. You need to sort the array first.",
  "I think the issue is with how you're handling the modulo operation.",
  "Use fast I/O. That solved my TLE.",
  "The greedy approach fails because...",
  "Here's my O(n) solution: ...",
  "The key insight is to realize that...",
  "You're missing the case where k=0.",
  "Try using two pointers instead.",
  "The test case is tricky. Let me explain...",
  "I wrote a brute force to verify. Your logic is almost correct.",
  "The constraints suggest you need an O(n log n) solution.",
];

export function generateMockDiscussions(count = 18): MockDiscussion[] {
  const discussions: MockDiscussion[] = [];
  for (let i = 0; i < count; i++) {
    const user = getRandomMockUser();
    const minutes = Math.floor(Math.random() * 10080);
    const numReplies = Math.floor(Math.random() * 5);
    const replies: MockReply[] = [];
    for (let j = 0; j < numReplies; j++) {
      const replyUser = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      replies.push({
        id: `reply_${i}_${j}`,
        user: replyUser,
        content: replyTemplates[Math.floor(Math.random() * replyTemplates.length)],
        likes: Math.floor(Math.random() * 50),
        postedAt: timeAgo(Math.floor(Math.random() * 1440)),
      });
    }
    discussions.push({
      id: `disc_${String(i + 1).padStart(3, "0")}`,
      user,
      title: titles[i % titles.length],
      preview: previews[i % previews.length],
      likes: Math.floor(Math.random() * 200),
      replies,
      postedAt: timeAgo(minutes),
    });
  }
  return discussions;
}

export const mockDiscussions = generateMockDiscussions();