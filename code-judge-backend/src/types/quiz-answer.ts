import { z } from "zod";

// ============================================
// Question Type Constants
// ============================================

export const QuestionType = {
  SINGLE_CHOICE: 1,
  MULTIPLE_CHOICE: 2,
  TRUE_FALSE: 3,
  TEXT: 4,
  PARAGRAPH: 5,
  FILL_BLANKS: 6,
  TABLE_FILL: 7,
  CODE_OUTPUT: 8,
  MATH: 9,
  GRAPH: 10,
  FORMULA: 11,
  MATCHING: 12,
  ORDERING: 13,
  DRAG_DROP: 14,
  CATEGORIZE: 15,
  HOTSPOT: 16,
  IMAGE_LABEL: 17,
  DRAWING: 18,
  VIDEO_RESPONSE: 19,
  AUDIO_RESPONSE: 20,
  POLL: 21,
  WORD_CLOUD: 22,
} as const;

export type QuestionTypeId = (typeof QuestionType)[keyof typeof QuestionType];

// ============================================
// Answer Schemas (Zod)
// ============================================

const MCQAnswerSchema = z.object({
  type: z.literal("MCQ"),
  selectedOptionId: z.number().int().positive(),
});

const MSQAnswerSchema = z.object({
  type: z.literal("MSQ"),
  selectedOptionIds: z
    .array(z.number().int().positive())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Duplicate option IDs not allowed",
    }),
});

const TrueFalseAnswerSchema = z.object({
  type: z.literal("TRUE_FALSE"),
  value: z.boolean(),
});

const NumericalAnswerSchema = z.object({
  type: z.literal("NUMERICAL"),
  value: z.number(),
});

const FillBlanksAnswerSchema = z.object({
  type: z.literal("FILL_BLANK"),
  values: z.array(z.string().trim()).min(1),
});

const MatchingAnswerSchema = z.object({
  type: z.literal("MATCHING"),
  matches: z
    .array(
      z.object({
        leftId: z.number().int().positive(),
        rightId: z.number().int().positive(),
      })
    )
    .min(1)
    .refine(
      (matches) => new Set(matches.map((m) => m.leftId)).size === matches.length,
      { message: "Duplicate left IDs not allowed" }
    ),
});

const OrderingAnswerSchema = z.object({
  type: z.literal("ORDERING"),
  orderedIds: z.array(z.number().int().positive()).min(1),
});

const CodingAnswerSchema = z.object({
  type: z.literal("CODING"),
  language: z.string().min(1),
  code: z.string().min(1),
});

const SubjectiveAnswerSchema = z.object({
  type: z.literal("SUBJECTIVE"),
  text: z.string().min(1),
});

const TextAnswerSchema = z.object({
  type: z.literal("TEXT"),
  text: z.string().min(1),
});

const ParagraphAnswerSchema = z.object({
  type: z.literal("PARAGRAPH"),
  text: z.string().min(1),
});

const TableFillAnswerSchema = z.object({
  type: z.literal("TABLE_FILL"),
  cells: z.array(z.array(z.string())).min(1),
});

const CodeOutputAnswerSchema = z.object({
  type: z.literal("CODE_OUTPUT"),
  output: z.string(),
});

const MathAnswerSchema = z.object({
  type: z.literal("MATH"),
  expression: z.string().min(1),
});

const GraphAnswerSchema = z.object({
  type: z.literal("GRAPH"),
  points: z.array(z.object({ x: z.number(), y: z.number() })),
});

const FormulaAnswerSchema = z.object({
  type: z.literal("FORMULA"),
  expression: z.string().min(1),
});

const DragDropAnswerSchema = z.object({
  type: z.literal("DRAG_DROP"),
  placements: z.array(
    z.object({
      itemId: z.number().int().positive(),
      zoneId: z.number().int().positive(),
    })
  ),
});

const CategorizeAnswerSchema = z.object({
  type: z.literal("CATEGORIZE"),
  placements: z.array(
    z.object({
      itemId: z.number().int().positive(),
      categoryId: z.number().int().positive(),
    })
  ),
});

const HotspotAnswerSchema = z.object({
  type: z.literal("HOTSPOT"),
  x: z.number(),
  y: z.number(),
});

const ImageLabelAnswerSchema = z.object({
  type: z.literal("IMAGE_LABEL"),
  labels: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      text: z.string(),
    })
  ),
});

const DrawingAnswerSchema = z.object({
  type: z.literal("DRAWING"),
  dataUrl: z.string().min(1),
});

const VideoResponseAnswerSchema = z.object({
  type: z.literal("VIDEO_RESPONSE"),
  videoUrl: z.string().url(),
});

const AudioResponseAnswerSchema = z.object({
  type: z.literal("AUDIO_RESPONSE"),
  audioUrl: z.string().url(),
});

const PollAnswerSchema = z.object({
  type: z.literal("POLL"),
  selectedOptionId: z.number().int().positive(),
});

const WordCloudAnswerSchema = z.object({
  type: z.literal("WORD_CLOUD"),
  words: z.array(z.string().trim()).min(1),
});

// ============================================
// Discriminated Union
// ============================================

export const StudentAnswerSchema = z.discriminatedUnion("type", [
  MCQAnswerSchema,
  MSQAnswerSchema,
  TrueFalseAnswerSchema,
  NumericalAnswerSchema,
  FillBlanksAnswerSchema,
  MatchingAnswerSchema,
  OrderingAnswerSchema,
  CodingAnswerSchema,
  SubjectiveAnswerSchema,
  TextAnswerSchema,
  ParagraphAnswerSchema,
  TableFillAnswerSchema,
  CodeOutputAnswerSchema,
  MathAnswerSchema,
  GraphAnswerSchema,
  FormulaAnswerSchema,
  DragDropAnswerSchema,
  CategorizeAnswerSchema,
  HotspotAnswerSchema,
  ImageLabelAnswerSchema,
  DrawingAnswerSchema,
  VideoResponseAnswerSchema,
  AudioResponseAnswerSchema,
  PollAnswerSchema,
  WordCloudAnswerSchema,
]);

export type StudentAnswer = z.infer<typeof StudentAnswerSchema>;

// ============================================
// Normalized Answer (for evaluation)
// ============================================

export interface NormalizedAnswer {
  questionType: string;
  answer: number | number[] | boolean | string | string[] | null;
}

// ============================================
// Evaluation Result
// ============================================

export interface EvaluationResult {
  isCorrect: boolean;
  score: number;
  maxScore: number;
  details?: string;
}

// ============================================
// Validation Error
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}
