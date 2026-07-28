export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  model?: string;
  codeBlocks?: CodeBlock[];
  executionResult?: ExecutionResult;
  thinking?: string;
}

export interface CodeBlock {
  id: string;
  language: string;
  code: string;
}

export interface ExecutionResult {
  status: "Accepted" | "Wrong Answer" | "Compilation Error" | "Runtime Error" | "Time Limit Exceeded" | "Pending";
  stdout: string;
  stderr: string;
  time: string;
  memory: string;
  testCases: TestCaseResult[];
}

export interface TestCaseResult {
  id: number;
  passed: boolean;
  input: string;
  expected: string;
  output: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: AIModel;
  createdAt: number;
  updatedAt: number;
}

export type AIModel = "gpt-5" | "gemini" | "claude" | "local";
export type RightTab = "conversation" | "files" | "problems" | "execution";

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  content?: string;
}

export interface ExecutionHistoryItem {
  id: string;
  language: string;
  runtime: string;
  memory: string;
  verdict: string;
  timestamp: number;
}

export interface PromptSuggestion {
  label: string;
  icon: string;
  prompt: string;
}