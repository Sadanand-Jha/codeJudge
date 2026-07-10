import type { CompletionConfig } from "@/types/completion";

/**
 * Default configuration for the autocomplete / completion provider.
 */
export const DEFAULT_COMPLETION_CONFIG: CompletionConfig = {
  debounceMs: 150,
  workerThreshold: 1000,
  maxSuggestions: 50,
  enableFuzzy: true,
};

/**
 * Map of Monaco language IDs to their file extensions for symbol extraction context.
 */
export const LANGUAGE_EXT_MAP: Record<string, string> = {
  cpp: "cpp",
  java: "java",
  python: "py",
  javascript: "js",
};