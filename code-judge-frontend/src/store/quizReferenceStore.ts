import { create } from "zustand";
import {
  getQuizDifficultyOptions,
  getAllSubjects,
  getAllExamCategories,
} from "@/services/quiz";

interface DifficultyOption {
  id: number;
  heading: string;
}

interface SubjectOption {
  id: number;
  subject_name: string;
}

interface ExamOption {
  id: number;
  exam_cat: string;
}

interface QuizReferenceStore {
  difficultyOptions: DifficultyOption[];
  subjects: SubjectOption[];
  exams: ExamOption[];
  loaded: boolean;
  fetchAll: () => Promise<void>;
}

export const useQuizReferenceStore = create<QuizReferenceStore>((set, get) => ({
  difficultyOptions: [],
  subjects: [],
  exams: [],
  loaded: false,

  fetchAll: async () => {
    if (get().loaded) return;
    const [diffs, subs, exms] = await Promise.allSettled([
      getQuizDifficultyOptions(),
      getAllSubjects(),
      getAllExamCategories(),
    ]);
    set({
      difficultyOptions: diffs.status === "fulfilled" ? diffs.value : [],
      subjects: subs.status === "fulfilled" ? subs.value : [],
      exams: exms.status === "fulfilled" ? exms.value : [],
      loaded: true,
    });
  },
}));
