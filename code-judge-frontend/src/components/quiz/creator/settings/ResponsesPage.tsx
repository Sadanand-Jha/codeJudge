"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Crown,
  Download,
  Loader2,
  Mail,
  Medal,
  Search,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserX,
  Users,
  X,
} from "lucide-react";
import { SettingsCard, SettingsRow, Toggle } from "@/components/ui/settings";
import { useToast } from "@/hooks/useToast";
import { useQuizSettings } from "./QuizSettingsContext";
import { cn } from "@/lib/helpers";
import { saveQuizDetails } from "@/utils/quizStorage";
// import {
//   getQuizResponses,
//   getStudentResponseDetail,
//   generateQuizResults,
//   retryQuizResultsEmail,
//   updateQuiz,
//   type QuizResponsesData,
//   type QuizResponseStudent,
//   type StudentResponseDetail,
// } from "@/services/quiz";

// ===== MOCK TYPES (matching backend types) =====
type QuizResponseStudent = {
  user_id: number;
  rollno: string | null;
  is_registered: boolean;
  registered_at: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  attempt_id: number | null;
  score: number | null;
  percentage: number | null;
  rank: number | null;
  attempt_status: string | null;
  completed_at: string | null;
  time_taken: number | null;
  total_questions: number | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  skipped_questions: number | null;
};

type QuizResponsesSummary = {
  total: number;
  submitted: number;
  not_submitted: number;
  average_score: number;
  highest_score: number | null;
  lowest_score: number | null;
  total_marks: number;
};

type QuizResponsesData = {
  quiz: {
    id: number;
    name: string;
    code: string;
    total_marks: number;
    passing_marks: number;
    status: string | null;
    starttime: string | null;
    endtime: string | null;
  };
  students: QuizResponseStudent[];
  summary: QuizResponsesSummary;
};

type StudentResponseDetail = {
  attempt: {
    attempt_id: number;
    user_id: number;
    quiz_id: number;
    score: number;
    percentage: number;
    rank: number | null;
    attempt_status: string;
    completed_at: string | null;
    time_taken: number | null;
    total_questions: number | null;
    correct_answers: number | null;
    wrong_answers: number | null;
    skipped_questions: number | null;
    username: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
  review: Array<{
    problem_id: number;
    question_number: number;
    problem_statement: string;
    problem_description: string | null;
    explaination: string | null;
    problem_type: string | null;
    correct_answer: string | null;
    selected_option: string | null;
    selected_statement: string | null;
    answered_at: string | null;
    status: "correct" | "wrong" | "unanswered";
  }>;
};

// ===== MOCK DATA: Children Participants Example =====
const MOCK_RESPONSES_DATA: QuizResponsesData = {
  quiz: {
    id: 1,
    name: "Fun Math Quiz for Kids",
    code: "KIDS123MATH",
    total_marks: 50,
    passing_marks: 25,
    status: "published",
    starttime: "2026-01-15T10:00:00Z",
    endtime: "2026-01-15T11:30:00Z",
  },
  students: [
    {
      user_id: 101,
      rollno: "KIDS-001",
      is_registered: true,
      registered_at: "2026-01-10T09:00:00Z",
      username: "alice_smith",
      first_name: "Alice",
      last_name: "Smith",
      email: "alice@example.com",
      attempt_id: 201,
      score: 48,
      percentage: 96.0,
      rank: 1,
      attempt_status: "completed",
      completed_at: "2026-01-15T10:30:15Z",
      time_taken: 1815,
      total_questions: 50,
      correct_answers: 48,
      wrong_answers: 2,
      skipped_questions: 0,
    },
    {
      user_id: 102,
      rollno: "KIDS-002",
      is_registered: true,
      registered_at: "2026-01-10T09:05:00Z",
      username: "bob_jones",
      first_name: "Bob",
      last_name: "Jones",
      email: "bob@example.com",
      attempt_id: 202,
      score: 42,
      percentage: 84.0,
      rank: 2,
      attempt_status: "completed",
      completed_at: "2026-01-15T10:35:42Z",
      time_taken: 2142,
      total_questions: 50,
      correct_answers: 42,
      wrong_answers: 8,
      skipped_questions: 0,
    },
    {
      user_id: 103,
      rollno: "KIDS-003",
      is_registered: true,
      registered_at: "2026-01-10T09:10:00Z",
      username: "charlie_brown",
      first_name: "Charlie",
      last_name: "Brown",
      email: "charlie@example.com",
      attempt_id: 203,
      score: 38,
      percentage: 76.0,
      rank: 3,
      attempt_status: "completed",
      completed_at: "2026-01-15T10:40:10Z",
      time_taken: 2410,
      total_questions: 50,
      correct_answers: 38,
      wrong_answers: 10,
      skipped_questions: 2,
    },
    {
      user_id: 104,
      rollno: "KIDS-004",
      is_registered: true,
      registered_at: "2026-01-10T09:15:00Z",
      username: "diana_prince",
      first_name: "Diana",
      last_name: "Prince",
      email: "diana@example.com",
      attempt_id: 204,
      score: 35,
      percentage: 70.0,
      rank: 4,
      attempt_status: "completed",
      completed_at: "2026-01-15T10:42:55Z",
      time_taken: 2575,
      total_questions: 50,
      correct_answers: 35,
      wrong_answers: 12,
      skipped_questions: 3,
    },
    {
      user_id: 105,
      rollno: "KIDS-005",
      is_registered: true,
      registered_at: "2026-01-10T09:20:00Z",
      username: "ethan_hunt",
      first_name: "Ethan",
      last_name: "Hunt",
      email: "ethan@example.com",
      attempt_id: 205,
      score: 28,
      percentage: 56.0,
      rank: 5,
      attempt_status: "completed",
      completed_at: "2026-01-15T10:45:30Z",
      time_taken: 2730,
      total_questions: 50,
      correct_answers: 28,
      wrong_answers: 15,
      skipped_questions: 7,
    },
    {
      user_id: 106,
      rollno: "KIDS-006",
      is_registered: true,
      registered_at: "2026-01-10T09:25:00Z",
      username: "fiona_glen",
      first_name: "Fiona",
      last_name: "Glen",
      email: "fiona@example.com",
      attempt_id: 206,
      score: 22,
      percentage: 44.0,
      rank: 6,
      attempt_status: "timed_out",
      completed_at: "2026-01-15T11:30:00Z",
      time_taken: 5400,
      total_questions: 50,
      correct_answers: 22,
      wrong_answers: 8,
      skipped_questions: 20,
    },
    {
      user_id: 107,
      rollno: "KIDS-007",
      is_registered: true,
      registered_at: "2026-01-10T09:30:00Z",
      username: "george_king",
      first_name: "George",
      last_name: "King",
      email: "george@example.com",
      attempt_id: 207,
      score: 15,
      percentage: 30.0,
      rank: 7,
      attempt_status: "left_early",
      completed_at: "2026-01-15T10:20:00Z",
      time_taken: 1200,
      total_questions: 50,
      correct_answers: 15,
      wrong_answers: 5,
      skipped_questions: 30,
    },
    {
      user_id: 108,
      rollno: "KIDS-008",
      is_registered: true,
      registered_at: "2026-01-10T09:35:00Z",
      username: "hannah_lee",
      first_name: "Hannah",
      last_name: "Lee",
      email: "hannah@example.com",
      attempt_id: null,
      score: null,
      percentage: null,
      rank: null,
      attempt_status: null,
      completed_at: null,
      time_taken: null,
      total_questions: null,
      correct_answers: null,
      wrong_answers: null,
      skipped_questions: null,
    },
    {
      user_id: 109,
      rollno: "KIDS-009",
      is_registered: true,
      registered_at: "2026-01-10T09:40:00Z",
      username: "ivan_moore",
      first_name: "Ivan",
      last_name: "Moore",
      email: "ivan@example.com",
      attempt_id: null,
      score: null,
      percentage: null,
      rank: null,
      attempt_status: null,
      completed_at: null,
      time_taken: null,
      total_questions: null,
      correct_answers: null,
      wrong_answers: null,
      skipped_questions: null,
    },
    {
      user_id: 110,
      rollno: "KIDS-010",
      is_registered: true,
      registered_at: "2026-01-10T09:45:00Z",
      username: "julia_nash",
      first_name: "Julia",
      last_name: "Nash",
      email: "julia@example.com",
      attempt_id: null,
      score: null,
      percentage: null,
      rank: null,
      attempt_status: null,
      completed_at: null,
      time_taken: null,
      total_questions: null,
      correct_answers: null,
      wrong_answers: null,
      skipped_questions: null,
    },
  ],
  summary: {
    total: 10,
    submitted: 5,
    not_submitted: 3,
    average_score: 32.6,
    highest_score: 48,
    lowest_score: 15,
    total_marks: 50,
  },
};

// Mock detail data for Alice (first student)
const MOCK_STUDENT_DETAILS: Record<number, StudentResponseDetail> = {
  101: {
    attempt: {
      attempt_id: 201,
      user_id: 101,
      quiz_id: 1,
      score: 48,
      percentage: 96.0,
      rank: 1,
      attempt_status: "completed",
      completed_at: "2026-01-15T10:30:15Z",
      time_taken: 1815,
      total_questions: 50,
      correct_answers: 48,
      wrong_answers: 2,
      skipped_questions: 0,
      username: "alice_smith",
      first_name: "Alice",
      last_name: "Smith",
      email: "alice@example.com",
    },
    review: [
      { problem_id: 1, question_number: 1, problem_statement: "What is 2 + 2?", problem_description: null, explaination: "Basic addition", problem_type: "mcq", correct_answer: "4", selected_option: "4", selected_statement: "4", answered_at: "2026-01-15T10:01:00Z", status: "correct" },
      { problem_id: 2, question_number: 2, problem_statement: "What is 5 × 3?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "15", selected_option: "15", selected_statement: "15", answered_at: "2026-01-15T10:02:30Z", status: "correct" },
      { problem_id: 3, question_number: 3, problem_statement: "What is 10 - 4?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "6", selected_option: "6", selected_statement: "6", answered_at: "2026-01-15T10:03:15Z", status: "correct" },
      { problem_id: 4, question_number: 4, problem_statement: "What is 12 ÷ 3?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "4", selected_option: "4", selected_statement: "4", answered_at: "2026-01-15T10:04:00Z", status: "correct" },
      { problem_id: 5, question_number: 5, problem_statement: "What is 7 + 8?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "15", selected_option: "15", selected_statement: "15", answered_at: "2026-01-15T10:05:00Z", status: "correct" },
      { problem_id: 6, question_number: 6, problem_statement: "What is 9 × 2?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "18", selected_option: "18", selected_statement: "18", answered_at: "2026-01-15T10:06:00Z", status: "correct" },
      { problem_id: 7, question_number: 7, problem_statement: "What is 20 - 7?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "13", selected_option: "13", selected_statement: "13", answered_at: "2026-01-15T10:07:00Z", status: "correct" },
      { problem_id: 8, question_number: 8, problem_statement: "What is 16 ÷ 4?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "4", selected_option: "4", selected_statement: "4", answered_at: "2026-01-15T10:08:00Z", status: "correct" },
      { problem_id: 9, question_number: 9, problem_statement: "What is 6 + 9?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "15", selected_option: "15", selected_statement: "15", answered_at: "2026-01-15T10:09:00Z", status: "correct" },
      { problem_id: 10, question_number: 10, problem_statement: "What is 8 × 3?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "24", selected_option: "24", selected_statement: "24", answered_at: "2026-01-15T10:10:00Z", status: "correct" },
      { problem_id: 11, question_number: 11, problem_statement: "What is 25 - 9?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "16", selected_option: "16", selected_statement: "16", answered_at: "2026-01-15T10:11:00Z", status: "correct" },
      { problem_id: 12, question_number: 12, problem_statement: "What is 21 ÷ 7?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "3", selected_option: "3", selected_statement: "3", answered_at: "2026-01-15T10:12:00Z", status: "correct" },
      { problem_id: 13, question_number: 13, problem_statement: "What is 11 + 12?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "23", selected_option: "23", selected_statement: "23", answered_at: "2026-01-15T10:13:00Z", status: "correct" },
      { problem_id: 14, question_number: 14, problem_statement: "What is 7 × 6?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "42", selected_option: "42", selected_statement: "42", answered_at: "2026-01-15T10:14:00Z", status: "correct" },
      { problem_id: 15, question_number: 15, problem_statement: "What is 30 - 11?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "19", selected_option: "19", selected_statement: "19", answered_at: "2026-01-15T10:15:00Z", status: "correct" },
      { problem_id: 16, question_number: 16, problem_statement: "What is 36 ÷ 6?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "6", selected_option: "6", selected_statement: "6", answered_at: "2026-01-15T10:16:00Z", status: "correct" },
      { problem_id: 17, question_number: 17, problem_statement: "What is 14 + 15?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "29", selected_option: "29", selected_statement: "29", answered_at: "2026-01-15T10:17:00Z", status: "correct" },
      { problem_id: 18, question_number: 18, problem_statement: "What is 9 × 5?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "45", selected_option: "45", selected_statement: "45", answered_at: "2026-01-15T10:18:00Z", status: "correct" },
      { problem_id: 19, question_number: 19, problem_statement: "What is 50 - 23?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "27", selected_option: "27", selected_statement: "27", answered_at: "2026-01-15T10:19:00Z", status: "correct" },
      { problem_id: 20, question_number: 20, problem_statement: "What is 48 ÷ 8?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "6", selected_option: "6", selected_statement: "6", answered_at: "2026-01-15T10:20:00Z", status: "correct" },
      { problem_id: 21, question_number: 21, problem_statement: "What is 22 + 18?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "40", selected_option: "40", selected_statement: "40", answered_at: "2026-01-15T10:21:00Z", status: "correct" },
      { problem_id: 22, question_number: 22, problem_statement: "What is 11 × 4?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "44", selected_option: "44", selected_statement: "44", answered_at: "2026-01-15T10:22:00Z", status: "correct" },
      { problem_id: 23, question_number: 23, problem_statement: "What is 45 - 19?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "26", selected_option: "26", selected_statement: "26", answered_at: "2026-01-15T10:23:00Z", status: "correct" },
      { problem_id: 24, question_number: 24, problem_statement: "What is 56 ÷ 7?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "8", selected_option: "8", selected_statement: "8", answered_at: "2026-01-15T10:24:00Z", status: "correct" },
      { problem_id: 25, question_number: 25, problem_statement: "What is 19 + 21?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "40", selected_option: "40", selected_statement: "40", answered_at: "2026-01-15T10:25:00Z", status: "correct" },
      { problem_id: 26, question_number: 26, problem_statement: "What is 12 × 3?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "36", selected_option: "36", selected_statement: "36", answered_at: "2026-01-15T10:26:00Z", status: "correct" },
      { problem_id: 27, question_number: 27, problem_statement: "What is 60 - 28?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "32", selected_option: "32", selected_statement: "32", answered_at: "2026-01-15T10:27:00Z", status: "correct" },
      { problem_id: 28, question_number: 28, problem_statement: "What is 63 ÷ 9?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "7", selected_option: "7", selected_statement: "7", answered_at: "2026-01-15T10:28:00Z", status: "correct" },
      { problem_id: 29, question_number: 29, problem_statement: "What is 27 + 16?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "43", selected_option: "43", selected_statement: "43", answered_at: "2026-01-15T10:29:00Z", status: "correct" },
      { problem_id: 30, question_number: 30, problem_statement: "What is 8 × 7?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "56", selected_option: "56", selected_statement: "56", answered_at: "2026-01-15T10:30:00Z", status: "correct" },
      { problem_id: 31, question_number: 31, problem_statement: "What is 72 - 35?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "37", selected_option: "37", selected_statement: "37", answered_at: "2026-01-15T10:31:00Z", status: "correct" },
      { problem_id: 32, question_number: 32, problem_statement: "What is 54 ÷ 6?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "9", selected_option: "9", selected_statement: "9", answered_at: "2026-01-15T10:32:00Z", status: "correct" },
      { problem_id: 33, question_number: 33, problem_statement: "What is 34 + 25?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "59", selected_option: "59", selected_statement: "59", answered_at: "2026-01-15T10:33:00Z", status: "correct" },
      { problem_id: 34, question_number: 34, problem_statement: "What is 13 × 4?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "52", selected_option: "52", selected_statement: "52", answered_at: "2026-01-15T10:34:00Z", status: "correct" },
      { problem_id: 35, question_number: 35, problem_statement: "What is 81 - 42?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "39", selected_option: "39", selected_statement: "39", answered_at: "2026-01-15T10:35:00Z", status: "correct" },
      { problem_id: 36, question_number: 36, problem_statement: "What is 72 ÷ 8?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "9", selected_option: "9", selected_statement: "9", answered_at: "2026-01-15T10:36:00Z", status: "correct" },
      { problem_id: 37, question_number: 37, problem_statement: "What is 41 + 32?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "73", selected_option: "73", selected_statement: "73", answered_at: "2026-01-15T10:37:00Z", status: "correct" },
      { problem_id: 38, question_number: 38, problem_statement: "What is 14 × 5?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "70", selected_option: "70", selected_statement: "70", answered_at: "2026-01-15T10:38:00Z", status: "correct" },
      { problem_id: 39, question_number: 39, problem_statement: "What is 95 - 48?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "47", selected_option: "47", selected_statement: "47", answered_at: "2026-01-15T10:39:00Z", status: "correct" },
      { problem_id: 40, question_number: 40, problem_statement: "What is 81 ÷ 9?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "9", selected_option: "9", selected_statement: "9", answered_at: "2026-01-15T10:40:00Z", status: "correct" },
      { problem_id: 41, question_number: 41, problem_statement: "What is 53 + 27?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "80", selected_option: "80", selected_statement: "80", answered_at: "2026-01-15T10:41:00Z", status: "correct" },
      { problem_id: 42, question_number: 42, problem_statement: "What is 15 × 4?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "60", selected_option: "60", selected_statement: "60", answered_at: "2026-01-15T10:42:00Z", status: "correct" },
      { problem_id: 43, question_number: 43, problem_statement: "What is 100 - 55?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "45", selected_option: "45", selected_statement: "45", answered_at: "2026-01-15T10:43:00Z", status: "correct" },
      { problem_id: 44, question_number: 44, problem_statement: "What is 96 ÷ 8?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "12", selected_option: "12", selected_statement: "12", answered_at: "2026-01-15T10:44:00Z", status: "correct" },
      { problem_id: 45, question_number: 45, problem_statement: "What is 67 + 28?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "95", selected_option: "95", selected_statement: "95", answered_at: "2026-01-15T10:45:00Z", status: "correct" },
      { problem_id: 46, question_number: 46, problem_statement: "What is 16 × 3?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "48", selected_option: "48", selected_statement: "48", answered_at: "2026-01-15T10:46:00Z", status: "correct" },
      { problem_id: 47, question_number: 47, problem_statement: "What is 120 - 68?", problem_description: null, explaination: "Subtraction", problem_type: "mcq", correct_answer: "52", selected_option: "52", selected_statement: "52", answered_at: "2026-01-15T10:47:00Z", status: "correct" },
      { problem_id: 48, question_number: 48, problem_statement: "What is 108 ÷ 9?", problem_description: null, explaination: "Division", problem_type: "mcq", correct_answer: "12", selected_option: "12", selected_statement: "12", answered_at: "2026-01-15T10:48:00Z", status: "correct" },
      { problem_id: 49, question_number: 49, problem_statement: "What is 75 + 35?", problem_description: null, explaination: "Addition", problem_type: "mcq", correct_answer: "110", selected_option: "105", selected_statement: "105", answered_at: "2026-01-15T10:49:00Z", status: "wrong" },
      { problem_id: 50, question_number: 50, problem_statement: "What is 17 × 4?", problem_description: null, explaination: "Multiplication", problem_type: "mcq", correct_answer: "68", selected_option: "72", selected_statement: "72", answered_at: "2026-01-15T10:50:00Z", status: "wrong" },
    ],
  },
};

type FilterKey = "all" | "submitted" | "not_submitted" | "timed_out" | "left_early";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Submitted" },
  { key: "not_submitted", label: "Not Submitted" },
  { key: "timed_out", label: "Timed Out" },
  { key: "left_early", label: "Left Early" },
];

type SortKey = "rank" | "marks" | "percentage" | "time_taken" | "rollno" | "name";

function studentStatus(s: QuizResponseStudent): { key: FilterKey; label: string } {
  if (!s.attempt_id || !s.attempt_status) return { key: "not_submitted", label: "Not Submitted" };
  const st = s.attempt_status.toLowerCase();
  if (st === "completed" || st === "submitted_late") return { key: "submitted", label: st === "submitted_late" ? "Submitted Late" : "Submitted" };
  if (st === "timed_out") return { key: "timed_out", label: "Timed Out" };
  return { key: "left_early", label: "Left Early" };
}

const STATUS_STYLE: Record<string, { badge: string; dot: string }> = {
  Submitted: { badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500", dot: "bg-emerald-500" },
  "Submitted Late": { badge: "border-teal-500/30 bg-teal-500/10 text-teal-500", dot: "bg-teal-500" },
  "Not Submitted": { badge: "border-amber-500/30 bg-amber-500/10 text-amber-500", dot: "bg-amber-500" },
  "Timed Out": { badge: "border-red-500/30 bg-red-500/10 text-red-500", dot: "bg-red-500" },
  "Left Early": { badge: "border-orange-500/30 bg-orange-500/10 text-orange-500", dot: "bg-orange-500" },
};

function formatTimeTaken(sec?: number | null): string {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatPercent(p?: number | null): string {
  if (p == null) return "—";
  return `${Number(p).toFixed(1)}%`;
}

export default function ResponsesPage() {
  const toast = useToast();
  const { quizId, details, updateDetails } = useQuizSettings();

  const [data, setData] = useState<QuizResponsesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sortOpen, setSortOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<QuizResponseStudent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<StudentResponseDetail | null>(null);

  const [emailBusy, setEmailBusy] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  const persistSettings = async (patch: Partial<{ leaderboard: boolean; showResultsImmediately: boolean }>) => {
    setSettingsBusy(true);
    try {
      // await updateQuiz(String(quizId), { ...patch, code });
      // MOCK: Settings saved locally
      console.log("MOCK: Settings saved", patch);
    } catch (err) {
      console.error("Failed to save response settings:", err);
      toast.error({ title: "Could not save settings", description: "Something went wrong. Please try again." });
    } finally {
      setSettingsBusy(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // MOCK: Using static data instead of API call
      // const res = await getQuizResponses(String(quizId));
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setData(MOCK_RESPONSES_DATA);
    } catch (err) {
      console.error("Failed to load responses:", err);
      toast.error({ title: "Could not load responses", description: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    load();
  }, [load]);

  const handleSelectStudent = async (s: QuizResponseStudent) => {
    setSelectedStudent(s);
    setDetail(null);
    setDetailLoading(true);
    try {
      // MOCK: Using static detail data instead of API call
      // const res = await getStudentResponseDetail(String(quizId), s.user_id);
      await new Promise((resolve) => setTimeout(resolve, 300));
      setDetail(MOCK_STUDENT_DETAILS[s.user_id] || {
        attempt: {
          attempt_id: s.attempt_id || 0,
          user_id: s.user_id,
          quiz_id: Number(quizId ?? 0),
          score: s.score || 0,
          percentage: s.percentage || 0,
          rank: s.rank || null,
          attempt_status: s.attempt_status || "completed",
          completed_at: s.completed_at,
          time_taken: s.time_taken,
          total_questions: s.total_questions,
          correct_answers: s.correct_answers,
          wrong_answers: s.wrong_answers,
          skipped_questions: s.skipped_questions,
          username: s.username,
          first_name: s.first_name,
          last_name: s.last_name,
          email: s.email,
        },
        review: [],
      });
    } catch {
      toast.error({ title: "Could not load student result", description: "Something went wrong." });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setEmailBusy(true);
    try {
      // MOCK: Simulate email sending
      // const res = await generateQuizResults(String(quizId), { force: true, sendEmail: true });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success({
        title: "Results emailed (MOCK)",
        description: "The complete result report was sent to the quiz admin. [Backend disconnected]",
      });
    } catch {
      toast.error({ title: "Could not send results", description: "Something went wrong. Please try again." });
    } finally {
      setEmailBusy(false);
    }
  };

  const downloadResultsCsv = () => {
    if (!data) return;
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      "Rank",
      "Roll No.",
      "Student",
      "User ID",
      "Status",
      "Marks",
      "Total",
      "Percentage",
      "Time Taken",
      "Submitted At",
    ];
    const rows = data.students.map((s) => {
      const status = studentStatus(s);
      return [
        s.rank ?? "",
        s.rollno ?? "",
        [s.first_name, s.last_name].filter(Boolean).join(" "),
        s.user_id,
        status.label,
        s.score ?? "",
        data.quiz.total_marks ?? "",
        s.percentage != null ? Number(s.percentage).toFixed(1) : "",
        s.time_taken != null ? formatTimeTaken(s.time_taken) : "",
        s.completed_at ? new Date(s.completed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "",
      ];
    });
    const csv = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
    const safeName = (data.quiz.name || "quiz").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "quiz";
    const code = data.quiz.code ? `-${data.quiz.code}` : "";
    const filename = `byteclash-${safeName}${code}-results.csv`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success({ title: "Results downloaded", description: `${filename} exported.` });
  };

  const students = useMemo(() => {
    if (!data) return [];
    let list = data.students.slice();

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => {
        const name = `${s.first_name ?? ""} ${s.last_name ?? ""} ${s.username ?? ""}`.toLowerCase();
        return (
          name.includes(q) ||
          String(s.user_id).includes(q) ||
          (s.rollno ? String(s.rollno).toLowerCase().includes(q) : false)
        );
      });
    }

    if (filter !== "all") {
      list = list.filter((s) => studentStatus(s).key === filter);
    }

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case "rank": {
          const ar = a.rank ?? Infinity;
          const br = b.rank ?? Infinity;
          if (ar !== br) return (ar - br) * dir;
          return (b.score ?? 0) - (a.score ?? 0);
        }
        case "marks":
          return ((a.score ?? 0) - (b.score ?? 0)) * dir;
        case "percentage":
          return ((a.percentage ?? 0) - (b.percentage ?? 0)) * dir;
        case "time_taken":
          return ((a.time_taken ?? 0) - (b.time_taken ?? 0)) * dir;
        case "rollno":
          return String(a.rollno ?? "").localeCompare(String(b.rollno ?? "")) * dir;
        case "name": {
          const an = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim();
          const bn = `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim();
          return an.localeCompare(bn) * dir;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [data, search, filter, sortKey, sortDir]);

  const summary = data?.summary;
  const quizName = data?.quiz?.name || details.name;
  const totalMarks = summary?.total_marks || data?.quiz?.total_marks || 0;

  const stats = [
    {
      label: "Total Students",
      value: summary?.total ?? 0,
      icon: Users,
      card: "border-pink-500/20 bg-pink-500/[0.06] text-pink-500",
      iconBg: "bg-pink-500/10",
    },
    {
      label: "Submitted",
      value: summary?.submitted ?? 0,
      icon: CheckCircle2,
      card: "border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      label: "Not Submitted",
      value: summary?.not_submitted ?? 0,
      icon: UserX,
      card: "border-amber-500/20 bg-amber-500/[0.06] text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      label: "Average Score",
      value: summary?.average_score ?? 0,
      icon: BarChart3,
      card: "border-violet-500/20 bg-violet-500/[0.06] text-violet-500",
      iconBg: "bg-violet-500/10",
    },
    {
      label: "Highest Score",
      value: summary?.highest_score ?? "—",
      icon: TrendingUp,
      card: "border-blue-500/20 bg-blue-500/[0.06] text-blue-500",
      iconBg: "bg-blue-500/10",
    },
    {
      label: "Lowest Score",
      value: summary?.lowest_score ?? "—",
      icon: TrendingDown,
      card: "border-orange-500/20 bg-orange-500/[0.06] text-orange-500",
      iconBg: "bg-orange-500/10",
    },
  ];

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" || key === "marks" || key === "percentage" ? "desc" : "asc");
    }
  };

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: "rank", label: "Rank" },
    { key: "marks", label: "Marks" },
    { key: "percentage", label: "Percentage" },
    { key: "time_taken", label: "Time Taken" },
    { key: "rollno", label: "Roll Number" },
    { key: "name", label: "Name" },
  ];

  const currentSortLabel = sortOptions.find((o) => o.key === sortKey)?.label ?? "Rank";

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-8 lg:px-8">
      {/* ===== MOCK INDICATOR BANNER ===== */}
      <div className="flex items-center gap-3 rounded-xl border-2 border-amber-500/30 bg-amber-500/10 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-amber-600 text-sm">Backend Disconnected — Mock Data Active</p>
          <p className="mt-0.5 text-xs text-amber-500">
            This page is using static mock data with children participants (10 kids aged 7-9).
            Backend API calls have been commented out. Data includes: Alice, Bob, Charlie, Diana, Ethan, Fiona, George, Hannah, Ivan, Julia.
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
          DEMO MODE
        </span>
      </div>

      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Responses</h2>
          <p className="mt-0.5 text-sm text-text-secondary">{quizName || "Quiz Responses"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadResultsCsv}
            disabled={!data}
            className="flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-5 text-xs font-bold text-text-primary transition-all duration-200 hover:border-border-hover hover:bg-card-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-pink-500" />
            Download Results
          </button>
          <button
            onClick={handleSendEmail}
            disabled={emailBusy}
            className="flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-600 px-5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(236,72,153,0.5)] hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {emailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send results on email
          </button>
        </div>
      </div>

      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn("rounded-2xl border p-4", stat.card)}
          >
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", stat.iconBg)}>
              <stat.icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-text-primary">{stat.value}</p>
            <p className="mt-0.5 text-[11px] font-medium text-text-secondary">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* ===== Toolbar: Search + Filters + Sort ===== */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by roll number, name or user ID..."
            className="w-full h-10 rounded-xl border border-input-border bg-input-bg pl-10 pr-4 text-sm text-text-primary placeholder-text-muted outline-none transition-colors focus:border-pink-500 focus:ring-2 focus:ring-pink-500/10"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all",
                filter === f.key
                  ? "border-pink-500 bg-pink-500/10 text-pink-500"
                  : "border-border bg-card-hover text-text-secondary hover:text-text-primary"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card-hover px-3.5 text-xs font-semibold text-text-primary transition-colors hover:border-border-hover"
          >
            Sort: {currentSortLabel}
            <ChevronDown className={cn("h-3.5 w-3.5 text-text-muted transition-transform", sortOpen && "rotate-180")} />
          </button>
          <AnimatePresence>
            {sortOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
              >
                {sortOptions.map((o) => (
                  <button
                    key={o.key}
                    onClick={() => {
                      toggleSort(o.key);
                      setSortOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors",
                      sortKey === o.key ? "bg-pink-500/10 font-semibold text-pink-500" : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                    )}
                  >
                    {o.label}
                    {sortKey === o.key && <span className="text-[10px] text-text-muted">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== Students Table ===== */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-text-muted">
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-4 py-3 font-semibold">Roll No.</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">User ID</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Marks</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
                <th className="px-4 py-3 text-right font-semibold">Percentage</th>
                <th className="px-4 py-3 text-right font-semibold">Time Taken</th>
                <th className="px-4 py-3 font-semibold">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-text-muted">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p className="mt-2 text-sm">Loading responses...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-text-muted">
                    <UserX className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm font-medium">No students match your filters.</p>
                  </td>
                </tr>
              ) : (
                students.map((s) => {
                  const status = studentStatus(s);
                  const style = STATUS_STYLE[status.label] || STATUS_STYLE["Not Submitted"];
                  return (
                    <tr
                      key={s.user_id}
                      onClick={() => handleSelectStudent(s)}
                      className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-pink-500/[0.04]"
                    >
                      <td className="px-4 py-3">
                        {s.rank != null ? (
                          <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold", s.rank === 1 ? "bg-amber-500/15 text-amber-500" : s.rank === 2 ? "bg-slate-400/15 text-slate-400" : s.rank === 3 ? "bg-orange-500/15 text-orange-500" : "bg-card-hover text-text-secondary")}>
                            {s.rank === 1 ? <Crown className="h-3.5 w-3.5" /> : s.rank === 2 ? <Medal className="h-3.5 w-3.5" /> : s.rank === 3 ? <Award className="h-3.5 w-3.5" /> : s.rank}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary tabular-nums">{s.rollno || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-text-primary">
                          {[s.first_name, s.last_name].filter(Boolean).join(" ") || "Student"}
                        </p>
                        {s.username && <p className="text-[11px] text-text-muted">@{s.username}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary tabular-nums">{s.user_id}</td>
                      <td className="px-4 py-3">
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", style.badge)}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold tabular-nums text-text-primary">{s.score ?? 0}</td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary tabular-nums">{totalMarks || "—"}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-violet-500">{formatPercent(s.percentage)}</td>
                      <td className="px-4 py-3 text-right text-sm text-text-secondary tabular-nums">{formatTimeTaken(s.time_taken)}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {s.completed_at ? new Date(s.completed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 text-[11px] text-text-muted">
          {students.length} of {summary?.total ?? 0} students · Table scrolls horizontally on small screens
        </div>
      </div>

      {/* ===== Result & Email Settings ===== */}
      <SettingsCard
        title="Result & Email Settings"
        description="How results, leaderboard and the admin report behave."
        icon={<Mail className="h-5 w-5" />}
        iconClassName="bg-pink-500/10 text-pink-500"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <SettingsRow
              label="Email Quiz Results"
              description="Send the complete quiz result report to the quiz admin (never to students)."
            >
              <Toggle
                checked={details.emailResults}
                onChange={(v) => {
                  updateDetails({ emailResults: v });
                  saveQuizDetails({ ...details, emailResults: v });
                }}
              />
            </SettingsRow>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <SettingsRow label="Leaderboard" description="Show a ranked leaderboard for this quiz">
              <Toggle
                checked={details.leaderboard}
                onChange={(v) => {
                  updateDetails({ leaderboard: v });
                  saveQuizDetails({ ...details, leaderboard: v });
                  void persistSettings({ leaderboard: v });
                }}
              />
            </SettingsRow>
            {details.leaderboard && (
              <div className="mt-2 space-y-1 border-t border-border pt-3">
                <Toggle
                  checked={details.leaderboardShowRank}
                  onChange={(v) => updateDetails({ leaderboardShowRank: v })}
                  label="Show Rank"
                />
                <Toggle
                  checked={details.leaderboardShowScore}
                  onChange={(v) => updateDetails({ leaderboardShowScore: v })}
                  label="Show Score"
                />
                <Toggle
                  checked={details.leaderboardShowTime}
                  onChange={(v) => updateDetails({ leaderboardShowTime: v })}
                  label="Show Time Taken"
                />
              </div>
            )}
          </div>
          {settingsBusy && (
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving settings...
            </div>
          )}
          <div className="flex items-start gap-2.5 rounded-xl border border-pink-500/15 bg-pink-500/[0.05] p-3.5">
            <Download className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />
            <p className="text-xs leading-relaxed text-text-secondary">
              Use <span className="font-semibold text-pink-500">Download Results</span> to export the result report as a
              CSV, or <span className="font-semibold text-pink-500">Send results on email</span> to email the complete
              report to the quiz admin. Students never receive performance emails.
            </p>
          </div>
        </div>
      </SettingsCard>

      {/* ===== Student Detail Modal ===== */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-pink-500">Student Result</p>
                  <h3 className="mt-0.5 text-lg font-bold text-text-primary">
                    {[selectedStudent.first_name, selectedStudent.last_name].filter(Boolean).join(" ") || "Student"}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-secondary">
                    Roll No: {selectedStudent.rollno || "—"} · User ID: {selectedStudent.user_id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="rounded-lg border border-border bg-card-hover p-2 text-text-muted transition-colors hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {detailLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-muted">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm">Loading result...</p>
                  </div>
                ) : detail?.attempt ? (
                  <>
                    {/* Score breakdown */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {[
                        { label: "Marks", value: `${detail.attempt.score} / ${detail.attempt.total_questions ?? "—"}`, icon: Medal, tone: "text-pink-500 bg-pink-500/10" },
                        { label: "Percentage", value: formatPercent(detail.attempt.percentage), icon: BarChart3, tone: "text-violet-500 bg-violet-500/10" },
                        { label: "Rank", value: detail.attempt.rank ?? "—", icon: Trophy, tone: "text-amber-500 bg-amber-500/10" },
                        { label: "Correct", value: detail.attempt.correct_answers ?? 0, icon: CheckCircle2, tone: "text-emerald-500 bg-emerald-500/10" },
                        { label: "Wrong", value: detail.attempt.wrong_answers ?? 0, icon: X, tone: "text-red-500 bg-red-500/10" },
                        { label: "Unanswered", value: detail.attempt.skipped_questions ?? 0, icon: UserX, tone: "text-orange-500 bg-orange-500/10" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-border bg-card-hover p-3.5">
                          <div className={cn("mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg", item.tone)}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <p className="text-lg font-bold tabular-nums text-text-primary">{item.value}</p>
                          <p className="text-[11px] font-medium text-text-secondary">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-secondary">
                      <span className="rounded-full bg-card-hover px-3 py-1.5">
                        Time taken: <span className="font-semibold text-text-primary">{formatTimeTaken(detail.attempt.time_taken)}</span>
                      </span>
                      <span className="rounded-full bg-card-hover px-3 py-1.5">
                        Status: <span className="font-semibold capitalize text-text-primary">{detail.attempt.attempt_status.replace("_", " ")}</span>
                      </span>
                      <span className="rounded-full bg-card-hover px-3 py-1.5">
                        Submitted: <span className="font-semibold text-text-primary">{detail.attempt.completed_at ? new Date(detail.attempt.completed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}</span>
                      </span>
                    </div>

                    {/* Question-wise */}
                    {detail.review.length > 0 && (
                      <div className="mt-6">
                        <h4 className="mb-3 text-sm font-bold text-text-primary">Question-wise Breakdown</h4>
                        <div className="space-y-2">
                          {detail.review.map((q) => (
                            <div
                              key={q.problem_id}
                              className={cn(
                                "rounded-xl border p-3.5",
                                q.status === "correct"
                                  ? "border-emerald-500/20 bg-emerald-500/[0.04]"
                                  : q.status === "wrong"
                                  ? "border-red-500/20 bg-red-500/[0.04]"
                                  : "border-orange-500/20 bg-orange-500/[0.04]"
                              )}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-text-primary">
                                    Q{q.question_number}. {q.problem_statement}
                                  </p>
                                  <p className="mt-1 text-[11px] text-text-secondary">
                                    Selected: <span className="text-text-primary">{q.selected_statement || "—"}</span>
                                  </p>
                                  {q.status !== "correct" && q.correct_answer && (
                                    <p className="mt-0.5 text-[11px] text-emerald-500">Correct answer: {q.correct_answer}</p>
                                  )}
                                </div>
                                <span
                                  className={cn(
                                    "shrink-0 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                    q.status === "correct"
                                      ? "bg-emerald-500/15 text-emerald-500"
                                      : q.status === "wrong"
                                      ? "bg-red-500/15 text-red-500"
                                      : "bg-orange-500/15 text-orange-500"
                                  )}
                                >
                                  {q.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-16 text-center text-text-muted">
                    <Clock className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">No submission found for this student.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
