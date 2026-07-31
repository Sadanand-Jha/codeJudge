import { MockUser, getRandomMockUser } from "./users";

export interface MockSubmission {
  id: string;
  user: MockUser;
  language: string;
  verdict: "Accepted" | "Wrong Answer" | "Time Limit Exceeded" | "Runtime Error" | "Compilation Error" | "Memory Limit Exceeded";
  runtimeMs: number;
  memoryMB: number;
  submittedAt: string;
}

const languages = ["C++", "Java", "Python", "JavaScript", "Rust", "Go"];
const verdicts: MockSubmission["verdict"][] = ["Accepted", "Wrong Answer", "Time Limit Exceeded", "Runtime Error", "Compilation Error", "Memory Limit Exceeded"];
const verdictWeights = [55, 20, 10, 5, 5, 5];

function pickVerdict(): MockSubmission["verdict"] {
  const total = verdictWeights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < verdicts.length; i++) {
    r -= verdictWeights[i];
    if (r <= 0) return verdicts[i];
  }
  return "Accepted";
}

function randomRuntime(verdict: MockSubmission["verdict"]): number {
  if (verdict === "Accepted") return Math.floor(Math.random() * 180) + 10;
  if (verdict === "Time Limit Exceeded") return Math.floor(Math.random() * 500) + 1000;
  return Math.floor(Math.random() * 100);
}

function randomMemory(verdict: MockSubmission["verdict"]): number {
  if (verdict === "Memory Limit Exceeded") return Math.floor(Math.random() * 512) + 256;
  return Math.floor(Math.random() * 32) + 2;
}

function timeAgo(minutes: number): string {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${Math.floor(minutes)} min ago`;
  if (minutes < 120) return "1 hour ago";
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hours ago`;
  if (minutes < 2880) return "Yesterday";
  return `${Math.floor(minutes / 1440)} days ago`;
}

const submissionTimes = [
  2, 5, 12, 18, 25, 35, 45, 60, 75, 90, 110, 130, 150, 180, 210, 240, 300, 360, 420, 480, 540, 600, 720, 960, 1200, 1440, 1800, 2160, 2520, 2880, 3600, 4320, 5040, 5760, 6480, 7200, 8640, 10080, 11520, 12960, 14400, 15840, 17280, 18720, 20160, 21600, 23040, 24480, 25920,
];

export function generateMockSubmissions(count = 45): MockSubmission[] {
  const submissions: MockSubmission[] = [];
  for (let i = 0; i < count; i++) {
    const user = getRandomMockUser();
    const verdict = pickVerdict();
    const runtime = randomRuntime(verdict);
    const memory = randomMemory(verdict);
    const language = languages[Math.floor(Math.random() * languages.length)];
    const minutes = submissionTimes[i % submissionTimes.length] + Math.floor(Math.random() * 30);
    submissions.push({
      id: `sub_${String(i + 1).padStart(3, "0")}`,
      user,
      language,
      verdict,
      runtimeMs: runtime,
      memoryMB: memory,
      submittedAt: timeAgo(minutes),
    });
  }
  return submissions.sort((a, b) => {
    const aMin = a.submittedAt.includes("min") ? parseInt(a.submittedAt) : 9999;
    const bMin = b.submittedAt.includes("min") ? parseInt(b.submittedAt) : 9999;
    return aMin - bMin;
  });
}

export const mockSubmissions = generateMockSubmissions();