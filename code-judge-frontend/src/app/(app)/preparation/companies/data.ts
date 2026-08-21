/**
 * Company preparation tracks — mock data shared by the Companies index and
 * the [companyId] detail page. Replace with API data when the backend lands.
 */

export interface CompanyInterviewQuestion {
  question: string;
  frequency: number; // 0-100, relative ask-rate
  askedCount: number;
  difficulty: "Easy" | "Medium" | "Hard";
}

export interface CompanyExperience {
  author: string;
  role: string;
  rounds: string;
  when: string;
}

export interface Company {
  id: string;
  name: string;
  letter: string;
  category: "Product-based" | "Service-based";
  tagline: string;
  tint: string;
  roles: number;
  questions: number;
  experiences: number;
  difficulty: { easy: number; medium: number; hard: number };
  /** null = not started yet */
  progress: number | null;
  focusTopics: string[];
  readiness: { dsa: number; csFundamentals: number; systemDesign: number; hr: number };
  interviewQuestions: CompanyInterviewQuestion[];
  recentExperiences: CompanyExperience[];
  csFundamentals: string[];
  systemDesign: string[];
}

export const COMPANIES: Company[] = [
  {
    id: "amazon",
    name: "Amazon",
    letter: "A",
    category: "Product-based",
    tagline: "Leadership principles + heavy DSA focus",
    tint: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    roles: 42,
    questions: 386,
    experiences: 124,
    difficulty: { easy: 25, medium: 55, hard: 20 },
    progress: 64,
    focusTopics: ["Arrays", "Trees", "DP", "Graphs"],
    readiness: { dsa: 72, csFundamentals: 58, systemDesign: 40, hr: 66 },
    interviewQuestions: [
      { question: "Two Sum variants", frequency: 92, askedCount: 148, difficulty: "Easy" },
      { question: "LRU Cache", frequency: 85, askedCount: 121, difficulty: "Medium" },
      { question: "Word Ladder", frequency: 74, askedCount: 96, difficulty: "Hard" },
      { question: "Merge K Sorted Lists", frequency: 68, askedCount: 88, difficulty: "Hard" },
      { question: "Number of Islands", frequency: 61, askedCount: 79, difficulty: "Medium" },
    ],
    recentExperiences: [
      { author: "Arjun M.", role: "SDE Intern", rounds: "OA → 2 technical → HR", when: "2 weeks ago" },
      { author: "Priya N.", role: "SDE-1", rounds: "OA → 3 technical", when: "1 month ago" },
      { author: "Rahul V.", role: "SDE Intern", rounds: "OA → 2 technical → Bar raiser", when: "1 month ago" },
    ],
    csFundamentals: ["OS", "DBMS", "CN", "OOP"],
    systemDesign: ["URL Shortener", "Rate Limiter", "Key-Value Store"],
  },
  {
    id: "google",
    name: "Google",
    letter: "G",
    category: "Product-based",
    tagline: "Algorithmic depth over rote patterns",
    tint: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    roles: 28,
    questions: 342,
    experiences: 98,
    difficulty: { easy: 15, medium: 50, hard: 35 },
    progress: 41,
    focusTopics: ["Graphs", "DP", "Recursion", "Math"],
    readiness: { dsa: 58, csFundamentals: 52, systemDesign: 30, hr: 60 },
    interviewQuestions: [
      { question: "Course Schedule II", frequency: 78, askedCount: 102, difficulty: "Medium" },
      { question: "Median of Two Sorted Arrays", frequency: 71, askedCount: 94, difficulty: "Hard" },
      { question: "Word Break", frequency: 66, askedCount: 81, difficulty: "Medium" },
      { question: "Trapping Rain Water", frequency: 59, askedCount: 73, difficulty: "Hard" },
      { question: "Decode Ways", frequency: 52, askedCount: 64, difficulty: "Medium" },
    ],
    recentExperiences: [
      { author: "Sneha P.", role: "SDE Intern", rounds: "2 screening → 3 onsite", when: "3 weeks ago" },
      { author: "Vikram S.", role: "Software Engineer", rounds: "1 phone → 4 onsite", when: "2 months ago" },
    ],
    csFundamentals: ["OS", "CN", "OOP"],
    systemDesign: ["Design Google Docs", "Distributed Cache", "Load Balancer"],
  },
  {
    id: "microsoft",
    name: "Microsoft",
    letter: "M",
    category: "Product-based",
    tagline: "Balanced DSA + CS fundamentals rounds",
    tint: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
    roles: 36,
    questions: 298,
    experiences: 87,
    difficulty: { easy: 30, medium: 50, hard: 20 },
    progress: 22,
    focusTopics: ["Strings", "Linked List", "OS", "OOP"],
    readiness: { dsa: 48, csFundamentals: 44, systemDesign: 25, hr: 58 },
    interviewQuestions: [
      { question: "Reverse Linked List in Groups", frequency: 81, askedCount: 96, difficulty: "Medium" },
      { question: "Clone a Graph", frequency: 70, askedCount: 82, difficulty: "Medium" },
      { question: "Serialize & Deserialize Tree", frequency: 63, askedCount: 71, difficulty: "Hard" },
      { question: "Implement LRU Cache", frequency: 57, askedCount: 65, difficulty: "Medium" },
    ],
    recentExperiences: [
      { author: "Kavya R.", role: "SWE Intern", rounds: "OA → 3 technical", when: "1 week ago" },
      { author: "Nikhil T.", role: "SDE-1", rounds: "OA → 2 technical → HR", when: "3 weeks ago" },
    ],
    csFundamentals: ["OS", "DBMS", "OOP", "CN"],
    systemDesign: ["Design Excel", "Message Queue", "Parking Lot"],
  },
  {
    id: "adobe",
    name: "Adobe",
    letter: "Ad",
    category: "Product-based",
    tagline: "DSA + strong puzzle and OS rounds",
    tint: "bg-red-500/10 text-red-600 dark:text-red-300",
    roles: 18,
    questions: 214,
    experiences: 62,
    difficulty: { easy: 28, medium: 52, hard: 20 },
    progress: null,
    focusTopics: ["Arrays", "OS", "Puzzles", "Strings"],
    readiness: { dsa: 40, csFundamentals: 36, systemDesign: 20, hr: 50 },
    interviewQuestions: [
      { question: "Rotate Matrix", frequency: 76, askedCount: 64, difficulty: "Medium" },
      { question: "Median in a Stream", frequency: 68, askedCount: 57, difficulty: "Hard" },
      { question: "Producer-Consumer Problem", frequency: 60, askedCount: 49, difficulty: "Medium" },
    ],
    recentExperiences: [
      { author: "Meera J.", role: "SWE Intern", rounds: "OA → 2 technical → HR", when: "5 days ago" },
    ],
    csFundamentals: ["OS", "DBMS", "OOP"],
    systemDesign: ["Design Photoshop Layers", "Notification Service"],
  },
  {
    id: "meta",
    name: "Meta",
    letter: "M",
    category: "Product-based",
    tagline: "Fast-paced product rounds, heavy graphs",
    tint: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    roles: 22,
    questions: 268,
    experiences: 74,
    difficulty: { easy: 12, medium: 53, hard: 35 },
    progress: null,
    focusTopics: ["Graphs", "Stacks", "DP", "Strings"],
    readiness: { dsa: 45, csFundamentals: 38, systemDesign: 28, hr: 54 },
    interviewQuestions: [
      { question: "Valid Parentheses variants", frequency: 84, askedCount: 91, difficulty: "Easy" },
      { question: "Binary Tree Vertical Order", frequency: 72, askedCount: 77, difficulty: "Medium" },
      { question: "Random Pick with Weight", frequency: 65, askedCount: 69, difficulty: "Medium" },
    ],
    recentExperiences: [
      { author: "Ishaan K.", role: "SWE Intern", rounds: "2 screens → team match", when: "1 month ago" },
    ],
    csFundamentals: ["OS", "CN"],
    systemDesign: ["Design Instagram", "News Feed", "Chat System"],
  },
  {
    id: "flipkart",
    name: "Flipkart",
    letter: "F",
    category: "Product-based",
    tagline: "DSA + machine coding rounds",
    tint: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-300",
    roles: 24,
    questions: 232,
    experiences: 69,
    difficulty: { easy: 22, medium: 56, hard: 22 },
    progress: null,
    focusTopics: ["Arrays", "HashMaps", "System Design", "SQL"],
    readiness: { dsa: 42, csFundamentals: 40, systemDesign: 24, hr: 52 },
    interviewQuestions: [
      { question: "Snake & Ladder (machine coding)", frequency: 79, askedCount: 58, difficulty: "Medium" },
      { question: "Top K Frequent Elements", frequency: 71, askedCount: 52, difficulty: "Medium" },
      { question: "Design Splitwise", frequency: 64, askedCount: 47, difficulty: "Hard" },
    ],
    recentExperiences: [
      { author: "Tanvi B.", role: "SDE-1", rounds: "MC round → 2 technical → HM", when: "2 weeks ago" },
    ],
    csFundamentals: ["DBMS", "OS", "SQL"],
    systemDesign: ["Design Splitwise", "Inventory System", "Cab Booking"],
  },
  {
    id: "goldman-sachs",
    name: "Goldman Sachs",
    letter: "GS",
    category: "Product-based",
    tagline: "HackerRank test + CS fundamentals deep dive",
    tint: "bg-sky-500/10 text-sky-600 dark:text-sky-300",
    roles: 16,
    questions: 188,
    experiences: 54,
    difficulty: { easy: 32, medium: 48, hard: 20 },
    progress: null,
    focusTopics: ["Math", "DBMS", "OS", "Arrays"],
    readiness: { dsa: 38, csFundamentals: 34, systemDesign: 18, hr: 48 },
    interviewQuestions: [
      { question: "Gas Station Circuit", frequency: 74, askedCount: 41, difficulty: "Medium" },
      { question: "Fractional Knapsack", frequency: 66, askedCount: 37, difficulty: "Medium" },
      { question: "Concurrency in OS", frequency: 58, askedCount: 32, difficulty: "Medium" },
    ],
    recentExperiences: [
      { author: "Rohan D.", role: "Analyst", rounds: "Hackerrank → 3 tech + behavioral", when: "3 weeks ago" },
    ],
    csFundamentals: ["DBMS", "OS", "CN", "SQL"],
    systemDesign: ["Trade Matching Engine", "Ledger Service"],
  },
  {
    id: "infosys",
    name: "Infosys",
    letter: "In",
    category: "Service-based",
    tagline: "Aptitude + basics of programming",
    tint: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
    roles: 58,
    questions: 164,
    experiences: 112,
    difficulty: { easy: 55, medium: 35, hard: 10 },
    progress: 80,
    focusTopics: ["Aptitude", "Puzzles", "SQL", "Basics"],
    readiness: { dsa: 55, csFundamentals: 62, systemDesign: 15, hr: 70 },
    interviewQuestions: [
      { question: "Array Rotation", frequency: 82, askedCount: 66, difficulty: "Easy" },
      { question: "String Palindrome Checks", frequency: 75, askedCount: 60, difficulty: "Easy" },
      { question: "SQL Joins Scenarios", frequency: 67, askedCount: 54, difficulty: "Easy" },
    ],
    recentExperiences: [
      { author: "Ananya S.", role: "Systems Engineer", rounds: "Test → Technical + HR", when: "4 days ago" },
    ],
    csFundamentals: ["SQL", "OOP", "DBMS"],
    systemDesign: [],
  },
  {
    id: "tcs",
    name: "TCS",
    letter: "T",
    category: "Service-based",
    tagline: "NQT — aptitude, coding basics, MCQs",
    tint: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
    roles: 64,
    questions: 152,
    experiences: 128,
    difficulty: { easy: 60, medium: 32, hard: 8 },
    progress: 90,
    focusTopics: ["Aptitude", "Coding Basics", "SQL", "CN"],
    readiness: { dsa: 50, csFundamentals: 66, systemDesign: 12, hr: 74 },
    interviewQuestions: [
      { question: "Number Series Problems", frequency: 85, askedCount: 72, difficulty: "Easy" },
      { question: "Basic String Manipulation", frequency: 78, askedCount: 66, difficulty: "Easy" },
      { question: "Normalization Questions", frequency: 62, askedCount: 51, difficulty: "Easy" },
    ],
    recentExperiences: [
      { author: "Karan L.", role: "Assistant System Engineer", rounds: "NQT → TR + MR + HR", when: "6 days ago" },
    ],
    csFundamentals: ["SQL", "CN", "DBMS", "OOP"],
    systemDesign: [],
  },
  {
    id: "oracle",
    name: "Oracle",
    letter: "Or",
    category: "Product-based",
    tagline: "DBMS-heavy rounds + DSA screen",
    tint: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
    roles: 14,
    questions: 176,
    experiences: 48,
    difficulty: { easy: 26, medium: 54, hard: 20 },
    progress: null,
    focusTopics: ["DBMS", "SQL", "Arrays", "OS"],
    readiness: { dsa: 36, csFundamentals: 46, systemDesign: 20, hr: 46 },
    interviewQuestions: [
      { question: "Complex SQL Queries", frequency: 80, askedCount: 44, difficulty: "Medium" },
      { question: "Indexing & B-Trees", frequency: 72, askedCount: 39, difficulty: "Medium" },
      { question: "Kth Largest Element", frequency: 64, askedCount: 35, difficulty: "Medium" },
    ],
    recentExperiences: [
      { author: "Divya M.", role: "SWE Intern", rounds: "OA → 2 technical → HR", when: "2 months ago" },
    ],
    csFundamentals: ["DBMS", "SQL", "OS"],
    systemDesign: ["Design a Database Pool", "Job Scheduler"],
  },
];

export const getCompanyById = (id: string): Company | undefined =>
  COMPANIES.find((c) => c.id === id);

export const COMPANY_CATEGORIES = ["All", "Product-based", "Service-based"] as const;
