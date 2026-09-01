"use client";

export type GeneratorStep = "upload" | "analyzing" | "review" | "create";

export interface UploadedFile {
  name: string;
  type: "pdf" | "docx";
  size: number;
  pageCount: number;
  valid: boolean;
  error?: string;
}

export interface DetectedProblem {
  id: string;
  number: number;
  title: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  confidence: "high" | "medium" | "low";
}

export interface AiQuizConfig {
  name: string;
  shortDescription: string;
  description: string;
  instructions: string;
  subject: string;
  exam: string;
  topics: string[];
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  duration: number;
  questionCount: number;
  assessmentType: string;
  suggestedAudience: string;
  tags: string[];
  thumbnailUrl: string;
  problems: DetectedProblem[];
  nameConfidence: "high" | "medium" | "low";
  descriptionConfidence: "high" | "medium" | "low";
}

export interface AiQuizGeneratorState {
  step: GeneratorStep;
  file: UploadedFile | null;
  config: AiQuizConfig | null;
  analysisProgress: number;
  analysisSteps: string[];
}
