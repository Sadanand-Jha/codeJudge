/**
 * Tests module — mock dataset.
 *
 * Deterministic seed data that mimics the future backend responses so every
 * page in the Tests section is fully functional today. Swap this module for
 * API calls later — component contracts live in `types.ts`.
 */

import {
  Atom,
  Dna,
  Building2,
  Landmark,
  Banknote,
  School,
  Cpu,
  Target,
  Scale,
  Shield,
  BookOpenCheck,
  GraduationCap,
  Binary,
  TrainFront,
  Cog,
  DraftingCompass,
  School2,
  Medal,
} from "lucide-react";
import type {
  ContinueTest,
  ContestPreview,
  ExamCategory,
  ExamMeta,
  FreeTest,
  LanguageId,
  PerformancePoint,
  PerformanceStats,
  ProblemLanguage,
  ProblemTopic,
  RecommendedTest,
  SearchResult,
  SeriesMeta,
  Teacher,
  TeacherSeriesStat,
  TestResultData,
  TestSection,
  TestSeriesInput,
  TrendingTest,
} from "./types";

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

/* ============================================
   Exams
   ============================================ */
export const EXAMS: ExamMeta[] = [
  { id: "dsa", name: "DSA", tagline: "Arrays · Graphs · DP · Interview Prep", category: "Data Structures & Algorithms", icon: Binary, gradient: "from-blue-600 via-indigo-500 to-violet-500", color: "#3B82F6", chipClass: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30", examCount: 12500 },
  { id: "jee", name: "JEE", tagline: "IIT-JEE Main & Advanced", category: "Engineering", icon: Atom, gradient: "from-indigo-500 via-blue-500 to-sky-400", color: "#6366F1", chipClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30", examCount: 18400 },
  { id: "neet", name: "NEET", tagline: "UG Medical Entrance", category: "Medical", icon: Dna, gradient: "from-emerald-500 via-teal-500 to-cyan-400", color: "#14B8A6", chipClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30", examCount: 11200 },
  { id: "ssc", name: "SSC", tagline: "CGL · CHSL · GD", category: "Staff Selection", icon: Building2, gradient: "from-amber-500 via-orange-500 to-red-400", color: "#F59E0B", chipClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30", examCount: 14300 },
  { id: "upsc", name: "UPSC", tagline: "IAS · IPS · PCS", category: "Civil Services", icon: Landmark, gradient: "from-rose-600 via-rose-500 to-pink-400", color: "#E11D48", chipClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30", examCount: 6200 },
  { id: "banking", name: "Banking", tagline: "IBPS · SBI · RBI", category: "Bank Exams", icon: Banknote, gradient: "from-sky-500 via-blue-500 to-indigo-500", color: "#0EA5E9", chipClass: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/30", examCount: 9800 },
  { id: "cuet", name: "CUET", tagline: "UG University Entrance", category: "University", icon: School, gradient: "from-violet-500 via-purple-500 to-fuchsia-400", color: "#8B5CF6", chipClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30", examCount: 4100 },
  { id: "gate", name: "GATE", tagline: "PG Engineering Entrance", category: "Postgraduate", icon: Cpu, gradient: "from-cyan-500 via-teal-500 to-emerald-400", color: "#06B6D4", chipClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30", examCount: 7600 },
  { id: "cat", name: "CAT", tagline: "IIM MBA Entrance", category: "Management", icon: Target, gradient: "from-orange-500 via-amber-500 to-yellow-400", color: "#F97316", chipClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30", examCount: 5400 },
  { id: "clat", name: "CLAT", tagline: "Law UG Entrance", category: "Law", icon: Scale, gradient: "from-red-500 via-rose-500 to-pink-500", color: "#EF4444", chipClass: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30", examCount: 3200 },
  { id: "defence", name: "Defence", tagline: "NDA · CDS · AFCAT", category: "Armed Forces", icon: Shield, gradient: "from-slate-600 via-slate-500 to-slate-400", color: "#475569", chipClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30", examCount: 2800 },
  { id: "teaching", name: "Teaching", tagline: "CTET · STET · KVS", category: "Teaching Exams", icon: GraduationCap, gradient: "from-teal-500 via-emerald-500 to-green-400", color: "#10B981", chipClass: "bg-teal-500/15 text-teal-600 dark:text-teal-300 border-teal-500/30", examCount: 1900 },
  { id: "school", name: "School", tagline: "Class 6–12 Boards", category: "School / Boards", icon: BookOpenCheck, gradient: "from-fuchsia-500 via-pink-500 to-rose-400", color: "#D946EF", chipClass: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30", examCount: 5600 },
  { id: "railway", name: "Railway", tagline: "RRB NTPC · Group D", category: "Railway Exams", icon: TrainFront, gradient: "from-orange-600 via-amber-500 to-yellow-400", color: "#F97316", chipClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30", examCount: 5200 },
  { id: "ese", name: "ESE", tagline: "IES Engineering Services", category: "Engineering Services", icon: Cog, gradient: "from-slate-500 via-slate-400 to-slate-300", color: "#64748B", chipClass: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30", examCount: 900 },
  { id: "state-engg", name: "State Engg", tagline: "AE · JE · PSU Exams", category: "State Engineering", icon: DraftingCompass, gradient: "from-blue-700 via-indigo-600 to-violet-500", color: "#4F46E5", chipClass: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30", examCount: 2400 },
  { id: "boards", name: "Boards", tagline: "CBSE · ICSE", category: "School Boards", icon: School2, gradient: "from-rose-500 via-pink-500 to-fuchsia-400", color: "#F43F5E", chipClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30", examCount: 4800 },
  { id: "olympiads", name: "Olympiads", tagline: "NTSE · IOQM · NSO · IMO", category: "Olympiads", icon: Medal, gradient: "from-amber-500 via-yellow-400 to-orange-400", color: "#F59E0B", chipClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30", examCount: 3100 },
];

export const EXAM_MAP: Record<string, ExamMeta> = Object.fromEntries(EXAMS.map((e) => [e.id, e]));

/* ============================================
   Exam category groups — the five pillars of the Tests hub.
   Chips map to ExamMeta entries so each gets an icon + gradient + link.
   ============================================ */
export const EXAM_CATEGORIES: ExamCategory[] = [
  {
    id: "eng-med",
    title: "Engineering & Medical",
    description: "JEE, NEET and every medical entrance — mock tests, chapter tests and full-length papers.",
    icon: Atom,
    gradient: "from-indigo-500 via-violet-500 to-fuchsia-500",
    color: "#8B5CF6",
    chips: [
      { label: "JEE Main", examId: "jee" },
      { label: "JEE Advanced", examId: "jee" },
      { label: "NEET", examId: "neet" },
    ],
    stats: { tests: 29600, series: 24, free: 8200, paid: 21400, popularity: 98, difficulty: "hard" },
  },
  {
    id: "govt",
    title: "Government Exams",
    description: "SSC, UPSC, Banking, Railway, Defence and Teaching — the complete sarkari exam prep stack.",
    icon: Landmark,
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    color: "#F59E0B",
    chips: [
      { label: "SSC", examId: "ssc" },
      { label: "UPSC", examId: "upsc" },
      { label: "Banking", examId: "banking" },
      { label: "Railway", examId: "railway" },
      { label: "Defence", examId: "defence" },
      { label: "Teaching", examId: "teaching" },
    ],
    stats: { tests: 40200, series: 38, free: 12600, paid: 27600, popularity: 96, difficulty: "medium" },
  },
  {
    id: "engg",
    title: "Engineering Exams",
    description: "GATE, ESE and state-level AE/JE/PSU papers for postgraduate and engineering-services aspirants.",
    icon: Cpu,
    gradient: "from-cyan-500 via-teal-500 to-emerald-500",
    color: "#06B6D4",
    chips: [
      { label: "GATE", examId: "gate" },
      { label: "ESE", examId: "ese" },
      { label: "State Engg", examId: "state-engg" },
    ],
    stats: { tests: 10900, series: 14, free: 3400, paid: 7500, popularity: 74, difficulty: "hard" },
  },
  {
    id: "school-acad",
    title: "School & Academic",
    description: "CBSE, ICSE, boards and Olympiads — term exams, board papers and talent-search tests.",
    icon: BookOpenCheck,
    gradient: "from-fuchsia-500 via-pink-500 to-rose-500",
    color: "#D946EF",
    chips: [
      { label: "Boards", examId: "boards" },
      { label: "School", examId: "school" },
      { label: "Olympiads", examId: "olympiads" },
    ],
    stats: { tests: 13500, series: 11, free: 5800, paid: 7700, popularity: 71, difficulty: "easy" },
  },
  {
    id: "other",
    title: "Other Competitive Exams",
    description: "CUET, CAT, CLAT and every other entrance the community publishes — new exams added weekly.",
    icon: Target,
    gradient: "from-sky-500 via-blue-500 to-indigo-500",
    color: "#0EA5E9",
    chips: [
      { label: "CUET", examId: "cuet" },
      { label: "CAT", examId: "cat" },
      { label: "CLAT", examId: "clat" },
    ],
    stats: { tests: 12700, series: 12, free: 4100, paid: 8600, popularity: 82, difficulty: "medium" },
  },
];

/* ============================================
   Teachers
   ============================================ */
export const TEACHERS: Teacher[] = [
  {
    id: "t_arjun",
    name: "Arjun Mehta",
    handle: "@arjunphysics",
    role: "Physics Educator",
    verified: true,
    rating: 4.9,
    reviewCount: 12480,
    seriesCount: 14,
    studentCount: 48200,
    following: true,
    bio: "B.Tech IIT Delhi · 9 years of JEE mentoring · 1,200+ students in top 1000 AIR.",
    avatarGradient: "from-indigo-500 to-blue-500",
    badges: ["Ex-IITian", "AIR 214"],
    subjects: ["Physics", "Mechanics", "Electrostatics"],
  },
  {
    id: "t_prachi",
    name: "Prachi Sharma",
    handle: "@prachineet",
    role: "Biology Educator",
    verified: true,
    rating: 4.8,
    reviewCount: 9840,
    seriesCount: 11,
    studentCount: 36900,
    following: false,
    bio: "MBBS · 6 years of NEET mentoring · Biology made visual and memorable.",
    avatarGradient: "from-emerald-500 to-teal-500",
    badges: ["MBBS", "NEET Expert"],
    subjects: ["Biology", "Genetics", "Human Physiology"],
  },
  {
    id: "t_ravi",
    name: "Ravi Kandula",
    handle: "@ravissc",
    role: "SSC & Banking Mentor",
    verified: true,
    rating: 4.7,
    reviewCount: 22100,
    seriesCount: 18,
    studentCount: 81100,
    following: false,
    bio: "Cleared SSC CGL twice · Quant & Reasoning specialist for competitive exams.",
    avatarGradient: "from-amber-500 to-orange-500",
    badges: ["SSC CGL Qualified"],
    subjects: ["Quantitative Aptitude", "Reasoning"],
  },
  {
    id: "t_isha",
    name: "Isha Verma",
    handle: "@ishaupsc",
    role: "UPSC Mentor",
    verified: true,
    rating: 4.9,
    reviewCount: 15320,
    seriesCount: 9,
    studentCount: 29800,
    following: false,
    bio: "IAS aspirant turned mentor · GS & Essay evaluation specialist.",
    avatarGradient: "from-rose-500 to-pink-500",
    badges: ["UPSC Mentor"],
    subjects: ["General Studies", "Polity", "Essay"],
  },
  {
    id: "t_kabir",
    name: "Kabir Nair",
    handle: "@kabirmath",
    role: "Mathematics Educator",
    verified: true,
    rating: 4.8,
    reviewCount: 8750,
    seriesCount: 10,
    studentCount: 27400,
    following: false,
    bio: "IIT Kharagpur · Mathematics for JEE, GATE & CAT in one place.",
    avatarGradient: "from-cyan-500 to-blue-500",
    badges: ["Ex-IITian"],
    subjects: ["Algebra", "Calculus", "Coordinate Geometry"],
  },
  {
    id: "t_neha",
    name: "Neha Kapoor",
    handle: "@nehadsa",
    role: "DSA & Interview Mentor",
    verified: true,
    rating: 4.9,
    reviewCount: 11320,
    seriesCount: 9,
    studentCount: 39600,
    following: false,
    bio: "Ex-Amazon SDE · 8 years of DSA mentoring · 500+ students placed in top product companies.",
    avatarGradient: "from-blue-600 to-violet-500",
    badges: ["Ex-Amazon", "Placement Expert"],
    subjects: ["Arrays & Strings", "Trees & Graphs", "Dynamic Programming"],
  },
];

export const TEACHER_MAP: Record<string, Teacher> = Object.fromEntries(TEACHERS.map((t) => [t.id, t]));

/* ============================================
   Test series
   ============================================ */
export const SERIES: SeriesMeta[] = [
  {
    id: "s_jeemain2027",
    examId: "jee",
    examName: "JEE Main",
    title: "JEE Main 2027 Complete Test Series",
    description:
      "Everything you need to crack JEE Main 2027 — 20 chapter tests, 10 full-length mocks with NTA-level difficulty, past-year papers and detailed video solutions for every question.",
    teacher: TEACHERS[0],
    rating: 4.8,
    ratingCount: 12480,
    studentCount: 48200,
    testCount: 30,
    questionCount: 4200,
    chapterTests: 20,
    fullMocks: 10,
    language: "hindi-english",
    difficulty: "hard",
    price: 499,
    originalPrice: 999,
    discountPercent: 50,
    featured: true,
    source: "platform",
    tags: ["2027", "Mock Tests", "Chapter-wise"],
    publishedAt: daysAgo(12),
    progress: 80,
    subjects: ["Physics", "Chemistry", "Mathematics"],
  },
  {
    id: "s_neetdropper",
    examId: "neet",
    examName: "NEET UG",
    title: "NEET 2027 Dropper Test Series",
    description:
      "Dropper-focused NEET series with 12 chapter tests, 8 full mocks and NMC-pattern questions covering Physics, Chemistry and Biology.",
    teacher: TEACHERS[1],
    rating: 4.7,
    ratingCount: 9840,
    studentCount: 36900,
    testCount: 20,
    questionCount: 3600,
    chapterTests: 12,
    fullMocks: 8,
    language: "english",
    difficulty: "medium",
    price: 399,
    originalPrice: 799,
    discountPercent: 50,
    featured: true,
    tags: ["Dropper", "NMC Pattern"],
    publishedAt: daysAgo(20),
    subjects: ["Physics", "Chemistry", "Biology"],
  },
  {
    id: "s_ssccgl2027",
    examId: "ssc",
    examName: "SSC CGL",
    title: "SSC CGL Tier 1 + Tier 2 Master Series",
    description:
      "Covers every SSC CGL section — Quant, Reasoning, English and GK. 40 practice sets modelled on the actual exam, updated for the 2027 pattern.",
    teacher: TEACHERS[2],
    rating: 4.6,
    ratingCount: 22100,
    studentCount: 81100,
    testCount: 40,
    questionCount: 5200,
    chapterTests: 24,
    fullMocks: 16,
    language: "hindi-english",
    difficulty: "medium",
    price: 299,
    originalPrice: 599,
    discountPercent: 50,
    featured: true,
    source: "platform",
    tags: ["Tier 1", "Tier 2", "Bilingual"],
    publishedAt: daysAgo(3),
    subjects: ["Quant", "Reasoning", "English", "GK"],
  },
  {
    id: "s_upscgs",
    examId: "upsc",
    examName: "UPSC CSE",
    title: "UPSC Prelims GS Deep-Dive Series",
    description:
      "1,800+ GS questions across Polity, History, Geography, Economy, Science & current affairs — with detailed explanations written by mentors.",
    teacher: TEACHERS[3],
    rating: 4.9,
    ratingCount: 15320,
    studentCount: 29800,
    testCount: 24,
    questionCount: 1900,
    chapterTests: 16,
    fullMocks: 8,
    language: "english",
    difficulty: "hard",
    price: 599,
    originalPrice: 1199,
    discountPercent: 50,
    tags: ["Prelims", "GS Paper 1"],
    publishedAt: daysAgo(28),
    subjects: ["Polity", "History", "Geography", "Economy"],
  },
  {
    id: "s_banking2027",
    examId: "banking",
    examName: "IBPS PO",
    title: "IBPS PO / SBI Clerk Complete Bundle",
    description:
      "Banking bundle with 4,000+ questions across Prelims & Mains — speed tests, sectional tests and 12 full mocks with shortcuts for Quant.",
    teacher: TEACHERS[2],
    rating: 4.5,
    ratingCount: 16750,
    studentCount: 52300,
    testCount: 36,
    questionCount: 4200,
    chapterTests: 22,
    fullMocks: 14,
    language: "hindi-english",
    difficulty: "medium",
    price: 349,
    originalPrice: 699,
    discountPercent: 50,
    tags: ["Prelims", "Mains", "Speed Tests"],
    publishedAt: daysAgo(9),
    subjects: ["Quant", "Reasoning", "English", "GA"],
  },
  {
    id: "s_cuet2027",
    examId: "cuet",
    examName: "CUET UG",
    title: "CUET UG 2027 Domain + General Series",
    description:
      "Subject-wise domain tests plus General Aptitude & Language sections — 1,500 questions for CUET aspirants targeting Delhi & top central universities.",
    teacher: TEACHERS[4],
    rating: 4.7,
    ratingCount: 4320,
    studentCount: 14100,
    testCount: 18,
    questionCount: 1500,
    chapterTests: 12,
    fullMocks: 6,
    language: "english",
    difficulty: "easy",
    price: 249,
    originalPrice: 499,
    discountPercent: 50,
    tags: ["Domain", "General Test"],
    publishedAt: daysAgo(34),
    subjects: ["Mathematics", "General Aptitude", "English"],
  },
  {
    id: "s_gate2027",
    examId: "gate",
    examName: "GATE CSE",
    title: "GATE CSE 2027 Previous Year + Mock Pack",
    description:
      "20 PYQs and 10 adaptive mocks for GATE CSE — strength-based question selection and detailed solutions for every topic.",
    teacher: TEACHERS[4],
    rating: 4.6,
    ratingCount: 5210,
    studentCount: 18300,
    testCount: 30,
    questionCount: 3300,
    chapterTests: 18,
    fullMocks: 12,
    language: "english",
    difficulty: "hard",
    price: 449,
    originalPrice: 899,
    discountPercent: 50,
    tags: ["PYQ", "Adaptive"],
    publishedAt: daysAgo(15),
    subjects: ["Data Structures", "Algorithms", "DBMS", "Networks"],
  },
  {
    id: "s_cat2027",
    examId: "cat",
    examName: "CAT",
    title: "CAT 2027 Sectional Booster Series",
    description:
      "QA, VARC and DILR boosters — 900 carefully curated questions with video solutions to push your sectional scores past 95 percentile.",
    teacher: TEACHERS[4],
    rating: 4.8,
    ratingCount: 6890,
    studentCount: 20700,
    testCount: 22,
    questionCount: 980,
    chapterTests: 14,
    fullMocks: 8,
    language: "english",
    difficulty: "hard",
    price: 549,
    originalPrice: 1099,
    discountPercent: 50,
    tags: ["QA", "VARC", "DILR"],
    publishedAt: daysAgo(41),
    subjects: ["Quant", "VARC", "DILR"],
  },
  {
    id: "s_clat2027",
    examId: "clat",
    examName: "CLAT",
    title: "CLAT 2027 Legal Reasoning Bootcamp",
    description:
      "Legal reasoning + GK + English in a single series — 1,200 questions with passages modelled on the latest CLAT pattern.",
    teacher: TEACHERS[3],
    rating: 4.5,
    ratingCount: 2870,
    studentCount: 9600,
    testCount: 16,
    questionCount: 1200,
    chapterTests: 10,
    fullMocks: 6,
    language: "english",
    difficulty: "medium",
    price: 349,
    originalPrice: 699,
    discountPercent: 50,
    tags: ["Legal", "GK"],
    publishedAt: daysAgo(52),
    subjects: ["Legal Reasoning", "GK", "English"],
  },
  {
    id: "s_nda2027",
    examId: "defence",
    examName: "NDA",
    title: "NDA 2027 Mathematics + GAT Series",
    description:
      "Prepare for NDA Mathematics and GAT with 14 practice sets and 6 full mocks — pattern matched to SSB recommended syllabus.",
    teacher: TEACHERS[2],
    rating: 4.6,
    ratingCount: 1980,
    studentCount: 7400,
    testCount: 20,
    questionCount: 1600,
    chapterTests: 12,
    fullMocks: 8,
    language: "english",
    difficulty: "easy",
    price: 299,
    originalPrice: 599,
    discountPercent: 50,
    tags: ["Mathematics", "GAT"],
    publishedAt: daysAgo(60),
    subjects: ["Mathematics", "GAT"],
  },
  {
    id: "s_jeeadvanced",
    examId: "jee",
    examName: "JEE Advanced",
    title: "JEE Advanced 2027 High-Level Test Series",
    description:
      "30 tough multi-correct & numerical questions per paper — the only series built around Advanced-level thinking, not JEE Main difficulty.",
    teacher: TEACHERS[0],
    rating: 4.9,
    ratingCount: 6240,
    studentCount: 18900,
    testCount: 12,
    questionCount: 3600,
    chapterTests: 6,
    fullMocks: 6,
    language: "english",
    difficulty: "hard",
    price: 649,
    originalPrice: 1299,
    discountPercent: 50,
    tags: ["Advanced", "Multi-correct"],
    publishedAt: daysAgo(6),
    subjects: ["Physics", "Chemistry", "Mathematics"],
  },
  {
    id: "s_school10",
    examId: "school",
    examName: "Class 10 Boards",
    title: "Class 10 Board Maths + Science Sprint",
    description:
      "Board-pattern tests for Class 10 — CBSE & ICSE friendly, with answer keys and marking schemes for last-minute revision.",
    teacher: TEACHERS[4],
    rating: 4.7,
    ratingCount: 3540,
    studentCount: 12800,
    testCount: 14,
    questionCount: 720,
    chapterTests: 10,
    fullMocks: 4,
    language: "hindi-english",
    difficulty: "easy",
    price: 149,
    originalPrice: 299,
    discountPercent: 50,
    tags: ["CBSE", "ICSE"],
    publishedAt: daysAgo(18),
    subjects: ["Mathematics", "Science"],
  },
  {
    id: "s_dsa2027",
    examId: "dsa",
    examName: "DSA",
    title: "DSA for Placements & Coding Interviews",
    description:
      "Array, trees, graphs, DP and greedy — 800 curated questions across 20 topic tests and 8 timed interview mocks, with hints and editorials for every problem.",
    teacher: TEACHERS[5],
    rating: 4.9,
    ratingCount: 11320,
    studentCount: 39600,
    testCount: 28,
    questionCount: 800,
    chapterTests: 20,
    fullMocks: 8,
    language: "english",
    difficulty: "hard",
    price: 549,
    originalPrice: 1099,
    discountPercent: 50,
    featured: true,
    source: "platform",
    tags: ["Placements", "Topic-wise", "Timed Mocks"],
    publishedAt: daysAgo(4),
    progress: 45,
    subjects: ["Arrays & Strings", "Trees & Graphs", "Dynamic Programming"],
  },
  {
    id: "s_jee_free",
    examId: "jee",
    examName: "JEE Main",
    title: "JEE Main Free Foundation Pack",
    description:
      "A 100% free starter pack for JEE Main — 8 chapter tests and 2 full mocks covering the most-frequent NTA topics. Zero cost, full analytics.",
    teacher: TEACHERS[0],
    rating: 4.6,
    ratingCount: 4520,
    studentCount: 112000,
    testCount: 10,
    questionCount: 760,
    chapterTests: 8,
    fullMocks: 2,
    language: "hindi-english",
    difficulty: "easy",
    price: 0,
    originalPrice: 0,
    discountPercent: 0,
    featured: true,
    source: "platform",
    tags: ["Free", "Foundation"],
    publishedAt: daysAgo(2),
    subjects: ["Physics", "Chemistry", "Mathematics"],
  },
  {
    id: "s_ssc_free",
    examId: "ssc",
    examName: "SSC CGL",
    title: "SSC Free GK + Reasoning Starter",
    description:
      "Sample the SSC ecosystem for free — 6 reasoning sets and 4 GK sets built from the latest CGL pattern, with bilingual explanations.",
    teacher: TEACHERS[2],
    rating: 4.5,
    ratingCount: 6120,
    studentCount: 94000,
    testCount: 10,
    questionCount: 500,
    chapterTests: 8,
    fullMocks: 2,
    language: "hindi-english",
    difficulty: "easy",
    price: 0,
    originalPrice: 0,
    discountPercent: 0,
    featured: true,
    source: "platform",
    tags: ["Free", "GK", "Reasoning"],
    publishedAt: daysAgo(5),
    subjects: ["Reasoning", "GK"],
  },
  {
    id: "s_neet_free",
    examId: "neet",
    examName: "NEET UG",
    title: "NEET Free Biology Kickstart",
    description:
      "Free Biology chapter tests for NEET aspirants — Genetics, Human Physiology and Cell Biology with detailed NMC-pattern solutions.",
    teacher: TEACHERS[1],
    rating: 4.7,
    ratingCount: 3980,
    studentCount: 78600,
    testCount: 8,
    questionCount: 480,
    chapterTests: 6,
    fullMocks: 2,
    language: "english",
    difficulty: "easy",
    price: 0,
    originalPrice: 0,
    discountPercent: 0,
    featured: false,
    source: "platform",
    tags: ["Free", "Biology"],
    publishedAt: daysAgo(8),
    subjects: ["Biology", "Genetics"],
  },
];

export const SERIES_MAP: Record<string, SeriesMeta> = Object.fromEntries(SERIES.map((s) => [s.id, s]));

/* ============================================
   Trending tests — the Explore rail "what's hot" list.
   ============================================ */
export const TRENDING_TESTS: TrendingTest[] = [
  { id: "tt_jee12", title: "JEE Main Full Mock #12", attempts: 2450, duration: "2 hrs", free: true, examId: "jee" },
  { id: "tt_neetbio", title: "NEET Biology Mega Test", attempts: 1820, duration: "90 min", free: true, examId: "neet" },
  { id: "tt_sscset", title: "SSC CGL Practice Set", attempts: 4120, duration: "60 min", free: true, examId: "ssc" },
];

/* ============================================
   Free tests
   ============================================ */
export const FREE_TESTS: FreeTest[] = [
  { id: "ft_phy_mechanics", examId: "jee", examName: "JEE Main", title: "JEE Main Physics — Mechanics", subject: "Physics", topic: "Mechanics", questionCount: 25, minutes: 30, difficulty: "medium", startsWith: 48720, attempts: 128400 },
  { id: "ft_bio_genetics", examId: "neet", examName: "NEET UG", title: "NEET Biology — Genetics", subject: "Biology", topic: "Genetics", questionCount: 25, minutes: 30, difficulty: "medium", startsWith: 39210, attempts: 98500 },
  { id: "ft_quant_speed", examId: "banking", examName: "SBI Clerk", title: "Quant Speed Test — Arithmetic", subject: "Quantitative Aptitude", topic: "Arithmetic", questionCount: 20, minutes: 15, difficulty: "easy", startsWith: 21540, attempts: 57200 },
  { id: "ft_eng_grammar", examId: "ssc", examName: "SSC CGL", title: "English — Grammar Essentials", subject: "English", topic: "Grammar", questionCount: 20, minutes: 20, difficulty: "easy", startsWith: 16870, attempts: 44300 },
  { id: "ft_polity_basics", examId: "upsc", examName: "UPSC CSE", title: "Polity — Constitution Basics", subject: "Polity", topic: "Constitution", questionCount: 25, minutes: 25, difficulty: "medium", startsWith: 14230, attempts: 39800 },
  { id: "ft_maths_algebra", examId: "cuet", examName: "CUET UG", title: "Mathematics — Algebra Foundation", subject: "Mathematics", topic: "Algebra", questionCount: 15, minutes: 20, difficulty: "easy", startsWith: 8940, attempts: 25600 },
];

/* ============================================
   Continue practicing
   ============================================ */
export const CONTINUE_TESTS: ContinueTest[] = [
  { id: "ct_mock04", examName: "JEE Main", title: "JEE Main Mock Test 04", percentComplete: 72, questionsRemaining: 14, totalQuestions: 50, minutesLeft: 32, section: "Physics · Chemistry · Maths" },
  { id: "ct_chap10", examName: "NEET UG", title: "NEET Biology — Human Physiology", percentComplete: 45, questionsRemaining: 33, totalQuestions: 60, minutesLeft: 41, section: "Biology" },
];

/* ============================================
   Recommended
   ============================================ */
export const RECOMMENDED_TESTS: RecommendedTest[] = [
  { id: "rec_mech2", examName: "JEE Main", title: "Mechanics — Laws of Motion Mini Test", reason: "Recommended because you practice Physics", reasonKind: "topic", questionCount: 12, minutes: 18, difficulty: "medium", free: true },
  { id: "rec_mock05", examName: "JEE Main", title: "JEE Main Mock Test 05", reason: "Recommended for JEE Main", reasonKind: "exam", questionCount: 75, minutes: 180, difficulty: "hard", free: false },
  { id: "rec_alg2", examName: "CUET UG", title: "Algebra — Quadratic Equations", reason: "Recommended because you practice Mathematics", reasonKind: "topic", questionCount: 15, minutes: 20, difficulty: "easy", free: true },
  { id: "rec_prev_physics", examName: "NEET UG", title: "NEET 2024 Previous Year — Physics", reason: "Trending among NEET aspirants", reasonKind: "trending", questionCount: 45, minutes: 60, difficulty: "medium", free: false },
];

/* ============================================
   Attempt — mock question paper
   ============================================ */
export const MOCK_ATTEMPT_SECTIONS: TestSection[] = [
  {
    name: "Physics",
    questions: [
      { id: "q1", index: 1, section: "Physics", kind: "mcq", text: "A particle moves along the x-axis with velocity v = 3t² − 12t + 9 m/s. At what instant is the particle's acceleration zero?", options: [{ id: "a", label: "t = 1 s" }, { id: "b", label: "t = 2 s" }, { id: "c", label: "t = 3 s" }, { id: "d", label: "t = 4 s" }], marks: 4, negativeMarks: 1 },
      { id: "q2", index: 2, section: "Physics", kind: "mcq", text: "Two blocks of masses 2 kg and 3 kg are connected by a light string over a frictionless pulley. The tension in the string is:", options: [{ id: "a", label: "12 N" }, { id: "b", label: "24 N" }, { id: "c", label: "18 N" }, { id: "d", label: "30 N" }], marks: 4, negativeMarks: 1 },
      { id: "q3", index: 3, section: "Physics", kind: "numerical", text: "A ball is dropped from a height of 80 m. Taking g = 10 m/s², the time taken to reach the ground is ____ seconds.", marks: 4, negativeMarks: 0 },
      { id: "q4", index: 4, section: "Physics", kind: "mcq", text: "Which of the following quantities remain constant for a projectile in flight (ignoring air resistance)?", options: [{ id: "a", label: "Speed" }, { id: "b", label: "Horizontal velocity" }, { id: "c", label: "Vertical velocity" }, { id: "d", label: "Acceleration" }], marks: 4, negativeMarks: 1 },
      { id: "q5", index: 5, section: "Physics", kind: "multi", text: "Select all statements that are true for an ideal simple pendulum.", options: [{ id: "a", label: "Time period is independent of amplitude (small angles)" }, { id: "b", label: "Time period depends on the mass of the bob" }, { id: "c", label: "Time period depends on the length of the string" }, { id: "d", label: "Time period depends on acceleration due to gravity" }], marks: 4, negativeMarks: 1 },
    ],
  },
  {
    name: "Chemistry",
    questions: [
      { id: "q6", index: 6, section: "Chemistry", kind: "mcq", text: "The number of moles of electrons required to reduce one mole of MnO₄⁻ to Mn²⁺ in acidic medium is:", options: [{ id: "a", label: "3" }, { id: "b", label: "4" }, { id: "c", label: "5" }, { id: "d", label: "6" }], marks: 4, negativeMarks: 1 },
      { id: "q7", index: 7, section: "Chemistry", kind: "mcq", text: "Which of the following has the highest boiling point?", options: [{ id: "a", label: "H₂O" }, { id: "b", label: "H₂S" }, { id: "c", label: "H₂Se" }, { id: "d", label: "H₂Te" }], marks: 4, negativeMarks: 1 },
      { id: "q8", index: 8, section: "Chemistry", kind: "numerical", text: "The pH of a 0.001 M HCl solution is ____.", marks: 4, negativeMarks: 0 },
      { id: "q9", index: 9, section: "Chemistry", kind: "mcq", text: "In which of the following reactions is entropy expected to increase?", options: [{ id: "a", label: "N₂(g) + 3H₂(g) → 2NH₃(g)" }, { id: "b", label: "2H₂O(l) → 2H₂(g) + O₂(g)" }, { id: "c", label: "CaO(s) + CO₂(g) → CaCO₃(s)" }, { id: "d", label: "2NO(g) → N₂O₂(g)" }], marks: 4, negativeMarks: 1 },
    ],
  },
  {
    name: "Mathematics",
    questions: [
      { id: "q10", index: 10, section: "Mathematics", kind: "mcq", text: "If the roots of x² − 6x + k = 0 are equal, then k equals:", options: [{ id: "a", label: "3" }, { id: "b", label: "6" }, { id: "c", label: "9" }, { id: "d", label: "36" }], marks: 4, negativeMarks: 1 },
      { id: "q11", index: 11, section: "Mathematics", kind: "mcq", text: "The number of ways to arrange the letters of the word 'BYTE' such that the vowels are together is:", options: [{ id: "a", label: "6" }, { id: "b", label: "12" }, { id: "c", label: "18" }, { id: "d", label: "24" }], marks: 4, negativeMarks: 1 },
      { id: "q12", index: 12, section: "Mathematics", kind: "numerical", text: "If |z − 3| = 4, the maximum value of |z| is ____.", marks: 4, negativeMarks: 0 },
    ],
  },
];

/* ============================================
   Result — mock attempt result
   ============================================ */
export const MOCK_RESULT: TestResultData = {
  attemptId: "atn_9f3k2",
  testTitle: "JEE Main Mock Test 04",
  examName: "JEE Main",
  score: 172,
  maxScore: 200,
  percentile: 97.35,
  rank: 1284,
  totalParticipants: 48392,
  accuracy: 86,
  correct: 43,
  incorrect: 7,
  skipped: 0,
  timeTakenSec: 101 * 60,
  totalTimeSec: 180 * 60,
  subjects: [
    { subject: "Physics", percent: 88, correct: 18, total: 20 },
    { subject: "Chemistry", percent: 79, correct: 12, total: 15 },
    { subject: "Mathematics", percent: 68, correct: 13, total: 15 },
  ],
  strongAreas: ["Mechanics", "Algebra", "Thermodynamics"],
  weakAreas: ["Integration", "Electrostatics", "Organic Chemistry"],
  analysis: [
    { id: "r1", number: 1, section: "Physics", topic: "Kinematics", status: "correct", marks: 4, timeSec: 62 },
    { id: "r2", number: 2, section: "Physics", topic: "Laws of Motion", status: "correct", marks: 4, timeSec: 71 },
    { id: "r3", number: 3, section: "Physics", topic: "Kinematics", status: "correct", marks: 4, timeSec: 48 },
    { id: "r4", number: 4, section: "Physics", topic: "Projectile Motion", status: "incorrect", marks: -1, timeSec: 104 },
    { id: "r5", number: 5, section: "Physics", topic: "Oscillations", status: "correct", marks: 4, timeSec: 85 },
    { id: "r6", number: 6, section: "Chemistry", topic: "Redox Reactions", status: "correct", marks: 4, timeSec: 57 },
    { id: "r7", number: 7, section: "Chemistry", topic: "Chemical Bonding", status: "correct", marks: 4, timeSec: 66 },
    { id: "r8", number: 8, section: "Chemistry", topic: "Acid–Base Equilibrium", status: "incorrect", marks: -1, timeSec: 92 },
    { id: "r9", number: 9, section: "Chemistry", topic: "Thermodynamics", status: "correct", marks: 4, timeSec: 74 },
    { id: "r10", number: 10, section: "Mathematics", topic: "Quadratic Equations", status: "correct", marks: 4, timeSec: 81 },
    { id: "r11", number: 11, section: "Mathematics", topic: "Permutations", status: "correct", marks: 4, timeSec: 95 },
    { id: "r12", number: 12, section: "Mathematics", topic: "Complex Numbers", status: "correct", marks: 4, timeSec: 88 },
  ],
  aiCoach: {
    summary:
      "You performed well in Mechanics but lost marks primarily in Integration and Electrostatics. Your speed in Chemistry was excellent — consider spending saved time on Mathematics.",
    steps: [
      { title: "Revise Integration", detail: "Revisit substitution and by-parts over a focused 45-minute session." },
      { title: "Attempt 10 targeted questions", detail: "We picked 10 Integration questions at your current difficulty." },
      { title: "Take a Mechanics + Electrostatics mini test", detail: "A 20-question combined test to consolidate both topics." },
    ],
  },
};

/* ============================================
   Series detail — tests inside a series
   ============================================ */
export const SERIES_TESTS = [
  { id: "st_1", number: "01", title: "Physics — Mechanics", type: "Chapter Test", questions: 60, minutes: 60, free: true },
  { id: "st_2", number: "02", title: "Chemistry — Atomic Structure", type: "Chapter Test", questions: 50, minutes: 60, free: false },
  { id: "st_3", number: "03", title: "Mathematics — Algebra", type: "Chapter Test", questions: 55, minutes: 60, free: false },
  { id: "st_4", number: "04", title: "Physics — Electrostatics", type: "Chapter Test", questions: 50, minutes: 60, free: false },
  { id: "st_5", number: "05", title: "Chemistry — Thermodynamics", type: "Chapter Test", questions: 45, minutes: 60, free: false },
  { id: "st_6", number: "06", title: "Mathematics — Calculus", type: "Chapter Test", questions: 55, minutes: 60, free: false },
  { id: "st_7", number: "07", title: "Full Mock Test 01", type: "Full Mock", questions: 90, minutes: 180, free: true },
  { id: "st_8", number: "08", title: "Full Mock Test 02", type: "Full Mock", questions: 90, minutes: 180, free: false },
  { id: "st_9", number: "09", title: "Full Mock Test 03", type: "Full Mock", questions: 90, minutes: 180, free: false },
  { id: "st_10", number: "10", title: "Full Mock Test 04", type: "Full Mock", questions: 90, minutes: 180, free: false },
];

export const SERIES_REVIEWS = [
  { id: "rev_1", author: "Rohan Gupta", rating: 5, date: "2 weeks ago", text: "Best JEE Main series I have attempted. The level of difficulty is spot on and the solutions are detailed. Scored 96 percentile in my latest mock." },
  { id: "rev_2", author: "Sneha Kulkarni", rating: 5, date: "1 month ago", text: "Chapter tests helped me identify weak topics quickly. The progress analytics are really useful." },
  { id: "rev_3", author: "Aditya Sharma", rating: 4, date: "1 month ago", text: "Great quality questions. Wish there were a few more mixed-topic chapter tests, but overall excellent value." },
];

/* ============================================
   Create series — form scaffolding data
   ============================================ */
export const CREATE_DRAFT: TestSeriesInput = {
  title: "",
  description: "",
  examId: "",
  subjects: [],
  language: "english",
  difficulty: "medium",
  price: 0,
  originalPrice: 0,
  mode: "free",
  tests: [],
};

export const LANGUAGES: { id: LanguageId; label: string }[] = [
  { id: "english", label: "English" },
  { id: "hindi", label: "Hindi" },
  { id: "hindi-english", label: "Hindi + English" },
  { id: "tamil", label: "Tamil" },
  { id: "telugu", label: "Telugu" },
  { id: "bengali", label: "Bengali" },
  { id: "marathi", label: "Marathi" },
];

export const AVAILABLE_TESTS_POOL = [
  { id: "pool_1", name: "Physics — Kinematics", type: "chapter" as const, questions: 40 },
  { id: "pool_2", name: "Physics — Laws of Motion", type: "chapter" as const, questions: 45 },
  { id: "pool_3", name: "Chemistry — Mole Concept", type: "chapter" as const, questions: 50 },
  { id: "pool_4", name: "Mathematics — Algebra", type: "chapter" as const, questions: 55 },
  { id: "pool_5", name: "Full Mock Test (Pattern)", type: "mock" as const, questions: 90 },
  { id: "pool_6", name: "Subject Test — Physics", type: "subject" as const, questions: 75 },
  { id: "pool_7", name: "Previous Year Paper 2026", type: "previous-year" as const, questions: 90 },
];

/* ============================================
   Teacher dashboard — stats
   ============================================ */
export const TEACHER_SERIES: TeacherSeriesStat[] = [
  { id: "ts_1", title: "JEE Main 2027 Complete Test Series", examName: "JEE Main", price: 499, students: 2482, revenue: 123850, rating: 4.8, status: "published", tests: 30 },
  { id: "ts_2", title: "JEE Advanced High-Level Series", examName: "JEE Advanced", price: 649, students: 1287, revenue: 83524, rating: 4.9, status: "published", tests: 12 },
  { id: "ts_3", title: "Physics Chapter-wise Booster", examName: "JEE Main", price: 0, students: 6840, revenue: 0, rating: 4.7, status: "published", tests: 18 },
  { id: "ts_4", title: "Mechanics + Electrostatics Combo", examName: "NEET UG", price: 299, students: 486, revenue: 145314, rating: 4.6, status: "draft", tests: 8 },
];

export const TEACHER_DASHBOARD_STATS = {
  totalSales: 123850,
  students: 4842,
  tests: 68,
  revenue: 353512,
  averageRating: 4.8,
};

/* ============================================
   Contests preview — sibling product under the Tests hub.
   ============================================ */
export const CONTESTS_PREVIEW: ContestPreview[] = [
  {
    id: "c_live_01",
    name: "Monthly Mega Contest — April 2026",
    kind: "Monthly",
    status: "live",
    startLabel: "Live now · 1h 24m left",
    startTime: daysAgo(0),
    durationMin: 180,
    participants: 14820,
    prize: "₹25,000",
    registered: true,
  },
  {
    id: "c_up_01",
    name: "Weekly Coding Challenge #42",
    kind: "Weekly",
    status: "upcoming",
    startLabel: "Starts in 02h 34m",
    startTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000).toISOString(),
    durationMin: 120,
    participants: 2431,
    prize: "₹5,000",
    registered: false,
  },
  {
    id: "c_up_02",
    name: "DSA Sprint — Trees & Graphs",
    kind: "Special",
    status: "upcoming",
    startLabel: "Starts in 1d 06h",
    startTime: new Date(Date.now() + 30 * 60 * 60 * 1000).toISOString(),
    durationMin: 90,
    participants: 986,
    prize: "₹3,000",
    registered: false,
  },
  {
    id: "c_past_01",
    name: "Weekly Coding Challenge #41",
    kind: "Weekly",
    status: "past",
    startLabel: "Ended 3d ago",
    startTime: daysAgo(3),
    durationMin: 120,
    participants: 3120,
    registered: true,
  },
  {
    id: "c_past_02",
    name: "College Cup — Inter-College Clash",
    kind: "College",
    status: "past",
    startLabel: "Ended 1w ago",
    startTime: daysAgo(7),
    durationMin: 150,
    participants: 5120,
    prize: "₹10,000",
    registered: false,
  },
];

/* ============================================
   Problems preview — sibling product under the Tests hub.
   ============================================ */
export const PROBLEM_TOPICS: ProblemTopic[] = [
  { name: "Arrays", count: 1280, difficulty: "easy" },
  { name: "Strings", count: 940, difficulty: "easy" },
  { name: "Linked Lists", count: 520, difficulty: "medium" },
  { name: "Trees", count: 780, difficulty: "medium" },
  { name: "Graphs", count: 610, difficulty: "hard" },
  { name: "Dynamic Programming", count: 890, difficulty: "hard" },
  { name: "Greedy", count: 470, difficulty: "medium" },
  { name: "Binary Search", count: 390, difficulty: "easy" },
  { name: "Segment Tree", count: 180, difficulty: "hard" },
  { name: "Math", count: 720, difficulty: "medium" },
];

export const PROBLEM_LANGUAGES: ProblemLanguage[] = [
  { name: "C++", count: 14800 },
  { name: "Java", count: 11200 },
  { name: "Python", count: 15900 },
  { name: "JavaScript", count: 9100 },
  { name: "C", count: 7400 },
];

/* ============================================
   Performance section — personal analytics.
   ============================================ */
export const PERFORMANCE_STATS: PerformanceStats = {
  testsAttempted: 42,
  problemsSolved: 287,
  contestsParticipated: 18,
  avgAccuracy: 86,
  avgScore: 74,
  currentStreak: 14,
  bestRank: 612,
  percentile: 94.2,
};

export const PERFORMANCE_TREND: PerformancePoint[] = [
  { label: "Jan", score: 58, accuracy: 71 },
  { label: "Feb", score: 62, accuracy: 74 },
  { label: "Mar", score: 60, accuracy: 72 },
  { label: "Apr", score: 68, accuracy: 78 },
  { label: "May", score: 71, accuracy: 80 },
  { label: "Jun", score: 74, accuracy: 83 },
  { label: "Jul", score: 79, accuracy: 86 },
];

/* ============================================
   Categorized search index — powers the hero search dropdown.
   ============================================ */
export function buildSearchIndex(query: string, limit = 4): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const out: SearchResult[] = [];
  const push = (r: SearchResult) => {
    if (out.length >= limit * 5) return;
    out.push(r);
  };

  EXAMS.filter((e) => `${e.name} ${e.tagline} ${e.category}`.toLowerCase().includes(q)).forEach((e) =>
    push({ kind: "exam", id: `e_${e.id}`, title: e.name, subtitle: e.tagline, href: `/tests?exam=${e.id}`, badge: "Exam" })
  );

  SERIES.filter((s) => `${s.title} ${s.examName} ${s.teacher.name} ${s.subjects.join(" ")}`.toLowerCase().includes(q)).forEach((s) =>
    push({
      kind: "series",
      id: `s_${s.id}`,
      title: s.title,
      subtitle: `${s.examName} · ${s.teacher.name}`,
      href: `/tests/series/${s.id}`,
      badge: s.price === 0 ? "Free Series" : "Series",
    })
  );

  FREE_TESTS.filter((t) => `${t.title} ${t.subject} ${t.topic} ${t.examName}`.toLowerCase().includes(q)).forEach((t) =>
    push({ kind: "test", id: `t_${t.id}`, title: t.title, subtitle: `${t.examName} · ${t.questionCount} Qs`, href: `/tests/attempt/${t.id}`, badge: "Test" })
  );

  PROBLEM_TOPICS.filter((t) => t.name.toLowerCase().includes(q)).forEach((t) =>
    push({ kind: "problem", id: `p_${t.name}`, title: `${t.name} problems`, subtitle: `${t.count.toLocaleString("en-IN")} challenges`, href: `/problems?tag=${t.name}`, badge: "Problems" })
  );

  CONTESTS_PREVIEW.filter((c) => `${c.name} ${c.kind}`.toLowerCase().includes(q)).forEach((c) =>
    push({ kind: "contest", id: `c_${c.id}`, title: c.name, subtitle: `${c.kind} · ${c.status}`, href: "/contests", badge: "Contest" })
  );

  TEACHERS.filter((t) => `${t.name} ${t.role} ${t.subjects.join(" ")}`.toLowerCase().includes(q)).forEach((t) =>
    push({ kind: "teacher", id: `t_${t.id}`, title: t.name, subtitle: t.role, href: `/tests/teachers/${t.id}`, badge: "Teacher" })
  );

  return out.slice(0, limit * 5);
}
