"use client";

import { useCallback, useEffect, useRef } from "react";
import type { editor } from "monaco-editor";
import { useDebounce } from "./useDebounce";
import { DEFAULT_COMPLETION_CONFIG } from "@/config/completion";
import { CPP_BUILTINS } from "@/constants/completions";
import { createExtractor, isLanguageSupported } from "@/utils/code/symbolExtractor";
import {
  getSymbolsByPrefix,
  updateSymbols,
  clearCache,
} from "@/utils/code/symbolCache";
import type {
  SourceSymbol,
  CompletionItem,
  LanguageBuiltins,
  CompletionConfig,
} from "@/types/completion";
import type { WorkerRequest, WorkerResponse } from "@/types/worker";

/**
 * Map of Monaco language IDs to their built-in completion data.
 * Extend this as more language builtins are added.
 */
const LANGUAGE_BUILTINS: Record<string, LanguageBuiltins> = {
  cpp: CPP_BUILTINS,
};

const ALL_MONACO_KINDS: Record<
  number,
  { label: string; sortText: string }
> = {
  0: { label: "method", sortText: "1" },
  1: { label: "function", sortText: "1" },
  3: { label: "field", sortText: "2" },
  4: { label: "variable", sortText: "2" },
  5: { label: "class", sortText: "1" },
  6: { label: "struct", sortText: "1" },
  7: { label: "interface", sortText: "1" },
  8: { label: "module", sortText: "2" },
  14: { label: "constant", sortText: "1" },
  15: { label: "enum", sortText: "1" },
  16: { label: "enumMember", sortText: "2" },
  17: { label: "snippet", sortText: "3" },
};

function monacoCompletionItem(
  item: CompletionItem,
): { label: string; kind: number; insertText: string; detail?: string; documentation?: string; sortText: string } {
  const kindInfo = ALL_MONACO_KINDS[item.kind] ?? { label: "variable", sortText: "2" };
  return {
    label: item.label,
    kind: item.kind,
    insertText: item.insertText,
    detail: item.detail,
    documentation: item.documentation,
    sortText: kindInfo.sortText,
  };
}

function sourceSymbolToCompletion(sym: SourceSymbol): {
  label: string;
  kind: number;
  insertText: string;
  detail: string;
  sortText: string;
} {
  const kindInfo = ALL_MONACO_KINDS[sym.kind] ?? { label: "variable", sortText: "2" };
  return {
    label: sym.name,
    kind: sym.kind,
    insertText: sym.insertText,
    detail: sym.detail,
    sortText: "0", // User-defined symbols come before builtins
  };
}

export function useAutocomplete(
  monaco: any | null,
  editorInstance: editor.IStandaloneCodeEditor | null,
  languageId: string,
  config: CompletionConfig = DEFAULT_COMPLETION_CONFIG,
) {
  const disposerRef = useRef<(() => void) | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingWorkerRef = useRef<number>(0); // request ID to discard stale responses
  const fileIdRef = useRef<string>("code");
  const extractorRef = useRef<ReturnType<typeof createExtractor> | null>(null);

  // Create extractor on language change (synchronous for main thread)
  useEffect(() => {
    if (isLanguageSupported(languageId)) {
      extractorRef.current = createExtractor(languageId);
    } else {
      extractorRef.current = null;
    }

    // Update fileId based on language
    const extMap: Record<string, string> = {
      cpp: "cpp",
      java: "java",
      python: "py",
      javascript: "js",
    };
    fileIdRef.current = `code.${extMap[languageId] ?? "txt"}`;
  }, [languageId]);

  // Debounced code value for re-extraction
  const debouncedValue = useDebounce(
    editorInstance?.getValue() ?? "",
    config.debounceMs,
  );

  // Handle document change -> re-extract symbols
  const handleExtract = useCallback(
    async (code: string) => {
      if (!code || !languageId) return;
      const fileId = fileIdRef.current;
      const numLines = code.split("\n").length;

      if (numLines < config.workerThreshold) {
        // Main-thread extraction
        const extractor = extractorRef.current;
        if (!extractor) return;

        const symbols = extractor.extract(code);
        updateSymbols(fileId, symbols);
      } else {
        // Web Worker extraction
        try {
          if (!workerRef.current) {
            workerRef.current = new Worker(
              new URL("../workers/symbolExtractor.worker.ts", import.meta.url),
            );

            workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
              const { type, payload } = event.data;
              if (type === "extractResult") {
                updateSymbols(fileId, payload as SourceSymbol[]);
              }
            };
          }

          const requestId = ++pendingWorkerRef.current;
          const request: WorkerRequest = {
            type: "extract",
            payload: { languageId, document: code },
          };
          workerRef.current.postMessage(request);

          // Discard stale responses by checking requestId in the onmessage handler
          workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
            if (requestId === pendingWorkerRef.current) {
              const { type, payload } = event.data;
              if (type === "extractResult") {
                updateSymbols(fileId, payload as SourceSymbol[]);
              }
            }
          };
        } catch {
          // Worker failed, do nothing; stale cache is acceptable
        }
      }
    },
    [languageId, config.workerThreshold],
  );

  // Trigger extraction when debounced code changes
  useEffect(() => {
    handleExtract(debouncedValue);
  }, [debouncedValue, handleExtract]);

  // Register Monaco CompletionItemProvider
  useEffect(() => {
    if (!monaco || !editorInstance) return;

    // Dispose previous provider
    if (disposerRef.current) {
      disposerRef.current();
      disposerRef.current = null;
    }

    const provider = monaco.languages.registerCompletionItemProvider(
      languageId,
      {
        triggerCharacters: [".", ":", ">", "/", "#", "("],
        provideCompletionItems: (
          model: editor.ITextModel,
          position: { lineNumber: number; column: number },
        ) => {
          const word = model.getWordAtPosition(position);
          const prefix = word?.word ?? "";
          const fileId = fileIdRef.current;

          // Collect user-defined symbols from cache
          const userSymbols = getSymbolsByPrefix(fileId, prefix);

          // Collect built-in completions
          const builtins = LANGUAGE_BUILTINS[languageId];
          const builtinItems: ReturnType<typeof monacoCompletionItem>[] = [];

          if (builtins) {
            const allBuiltins = [
              ...builtins.keywords,
              ...builtins.types,
              ...builtins.functions,
              ...builtins.snippets,
            ];

            // Build a set of user symbol names to avoid duplicates
            const userNames = new Set(
              userSymbols.map((s) => s.name.toLowerCase()),
            );

            for (const item of allBuiltins) {
              if (!userNames.has(item.label.toLowerCase())) {
                builtinItems.push(monacoCompletionItem(item));
              }
            }
          }

          // Build the suggestions list
          const suggestions = [
            ...userSymbols.map(sourceSymbolToCompletion),
            ...builtinItems,
          ];

          // Sort: user-defined (sortText "0") come before builtins ("1", "2", "3")
          suggestions.sort((a, b) => {
            const cmp = a.sortText.localeCompare(b.sortText);
            if (cmp !== 0) return cmp;
            return a.label.localeCompare(b.label);
          });

          // Apply max suggestions limit
          const limited = suggestions.slice(0, config.maxSuggestions);

          return {
            suggestions: limited.map((item) => ({
              label: item.label,
              kind: item.kind,
              insertText: item.insertText,
              detail: item.detail,
              sortText: item.sortText,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: word?.startColumn ?? position.column,
                endLineNumber: position.lineNumber,
                endColumn: word?.endColumn ?? position.column,
              },
            })),
          };
        },
      },
    );

    disposerRef.current = () => {
      provider.dispose();
    };

    return () => {
      if (disposerRef.current) {
        disposerRef.current();
        disposerRef.current = null;
      }
    };
  }, [monaco, editorInstance, languageId, config.maxSuggestions]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      clearCache();
    };
  }, []);

  // Expose a method for manual disposal
  const dispose = useCallback(() => {
    if (disposerRef.current) {
      disposerRef.current();
      disposerRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    clearCache();
  }, []);

  return { dispose };
}