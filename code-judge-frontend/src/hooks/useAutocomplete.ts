"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

interface UseAutocompleteProps {
  monacoRef: React.MutableRefObject<any>;
  editorRef: React.MutableRefObject<editor.IStandaloneCodeEditor | null>;
  languageId: string;
  config?: CompletionConfig;
}

/**
 * Hook for managing Monaco autocomplete with symbol extraction.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses requestId pattern for worker to ignore stale responses
 * - Caches extracted symbols to avoid redundant parsing
 * - Skips extraction if code hasn't changed
 * - Sets worker.onmessage only once during worker creation
 * - Detects when editor/monaco become available via polling ref values
 */
export function useAutocomplete({
  monacoRef,
  editorRef,
  languageId,
  config = DEFAULT_COMPLETION_CONFIG,
}: UseAutocompleteProps) {
  const disposerRef = useRef<(() => void) | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestIdRef = useRef<number>(0);
  const latestCodeRef = useRef<string>("");
  const cachedSymbolsRef = useRef<SourceSymbol[] | null>(null);
  const fileIdRef = useRef<string>("code");
  const extractorRef = useRef<ReturnType<typeof createExtractor> | null>(null);
  const modelSubscriptionRef = useRef<(() => void) | null>(null);
  const lastExtractedCodeRef = useRef<string>("");
  const workerMessageQueueRef = useRef<Array<{ requestId: number; code: string }>>([]);
  const isProcessingRef = useRef<boolean>(false);
  
  // Track editor availability state to trigger effects when refs are set
  const [editorAvailable, setEditorAvailable] = useState(false);
  const lastEditorRefCurrent = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Create extractor on language change (synchronous for main thread)
  useEffect(() => {
    if (isLanguageSupported(languageId)) {
      extractorRef.current = createExtractor(languageId);
    } else {
      extractorRef.current = null;
    }

    const extMap: Record<string, string> = {
      cpp: "cpp",
      java: "java",
      python: "py",
      javascript: "js",
    };
    fileIdRef.current = `code.${extMap[languageId] ?? "txt"}`;
    // Clear cache on language change
    cachedSymbolsRef.current = null;
    lastExtractedCodeRef.current = "";
  }, [languageId]);

  // Initialize worker ONCE with message handler that handles all requests
  useEffect(() => {
    if (workerRef.current) return;

    try {
      workerRef.current = new Worker(
        new URL("../workers/symbolExtractor.worker.ts", import.meta.url),
      );

      // Set onmessage ONCE - use requestId pattern to handle stale responses
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { requestId, type, payload } = event.data;
        
        // Ignore stale responses (not from the latest request)
        if (requestId !== pendingRequestIdRef.current) return;
        
        if (type === "extractResult") {
          const symbols = payload as SourceSymbol[];
          cachedSymbolsRef.current = symbols;
          const fileId = fileIdRef.current;
          updateSymbols(fileId, symbols);
        }
      };
    } catch {
      // Worker failed to initialize - will fall back to main-thread extraction
      workerRef.current = null;
    }
  }, []);

  // Detect when editor is mounted by polling ref values
  // This avoids the issue of refs not triggering re-renders
  useEffect(() => {
    const checkEditor = () => {
      const currentEditor = editorRef.current;
      if (currentEditor && currentEditor !== lastEditorRefCurrent.current) {
        lastEditorRefCurrent.current = currentEditor;
        setEditorAvailable(true);
      } else if (!currentEditor) {
        setEditorAvailable(false);
      }
    };

    // Check immediately
    checkEditor();

    // Poll at low frequency (only checks ref values, no actual work)
    const intervalId = setInterval(checkEditor, 100);

    return () => clearInterval(intervalId);
  }, [editorRef]);

  // Subscribe to Monaco model content changes instead of polling getValue() on every render
  useEffect(() => {
    // Clean up previous subscription
    if (modelSubscriptionRef.current) {
      modelSubscriptionRef.current();
      modelSubscriptionRef.current = null;
    }

    const editorInstance = editorRef.current;
    if (!editorInstance) return;

    const model = editorInstance.getModel();
    if (!model) return;

    // Store initial value
    latestCodeRef.current = model.getValue();

    const subscription = model.onDidChangeContent(() => {
      latestCodeRef.current = model.getValue();
    });

    modelSubscriptionRef.current = () => {
      subscription.dispose();
    };

    return () => {
      if (modelSubscriptionRef.current) {
        modelSubscriptionRef.current();
        modelSubscriptionRef.current = null;
      }
    };
  }, [editorRef, editorAvailable]);

  // Debounced code value for re-extraction - reads from ref, not from editor on every render
  const debouncedValue = useDebounce(
    latestCodeRef.current,
    config.debounceMs,
  );

  // Handle document change -> re-extract symbols (skip if unchanged)
  useEffect(() => {
    const code = debouncedValue;
    if (!code || !languageId) return;

    // Skip extraction if document text has not changed
    if (code === lastExtractedCodeRef.current) return;
    lastExtractedCodeRef.current = code;

    const numLines = code.split("\n").length;

    if (numLines < config.workerThreshold) {
      // Main-thread extraction
      const extractor = extractorRef.current;
      if (!extractor) return;

      try {
        const symbols = extractor.extract(code);
        cachedSymbolsRef.current = symbols;
        const fileId = fileIdRef.current;
        updateSymbols(fileId, symbols);
      } catch {
        // Extraction failed - stale cache is acceptable
      }
    } else {
      // Web Worker extraction - add to queue
      if (!workerRef.current) return;

      const requestId = ++pendingRequestIdRef.current;
      workerMessageQueueRef.current.push({ requestId, code });
      
      // Process one at a time
      if (!isProcessingRef.current) {
        isProcessingRef.current = true;
        const processNext = () => {
          const item = workerMessageQueueRef.current.shift();
          if (!item) {
            isProcessingRef.current = false;
            return;
          }
          const { requestId } = item;
          const request: WorkerRequest = {
            requestId,
            type: "extract",
            payload: { languageId, document: code },
          };
          workerRef.current?.postMessage(request);
          // Schedule next check
          setTimeout(processNext, 0);
        };
        processNext();
      }
    }
  }, [debouncedValue, languageId, config.workerThreshold]);

  // Register Monaco CompletionItemProvider only when editor and monaco are available
  useEffect(() => {
    const monaco = monacoRef.current;
    const editorInstance = editorRef.current;
    
    if (!monaco || !editorInstance || !editorAvailable) return;

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
  }, [monacoRef, editorAvailable, languageId, config.maxSuggestions]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (modelSubscriptionRef.current) {
        modelSubscriptionRef.current();
        modelSubscriptionRef.current = null;
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
    if (modelSubscriptionRef.current) {
      modelSubscriptionRef.current();
      modelSubscriptionRef.current = null;
    }
    clearCache();
    setEditorAvailable(false);
    lastEditorRefCurrent.current = null;
  }, []);

  return { dispose };
}