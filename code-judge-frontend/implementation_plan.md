# Implementation Plan

[Overview]
Implement two major features: (1) dynamic language dropdown populated from Judge0 API (`/languages` endpoint), and (2) a production-grade autocomplete/suggestion system using Monaco Editor's CompletionItemProvider with a hybrid main-thread/Web Worker architecture.

The language dropdown currently uses a static `LANGUAGE_OPTIONS` mapping. It needs to fetch available languages from `http://localhost:2358/languages` via `userDirectApi` on mount and merge them with the static config (which maps Judge0 IDs to Monaco identifiers and extensions). The autocomplete system needs to support all 4 languages (C++, Java, Python, JavaScript) with language-specific keywords, built-in types, STL/standard library completions, plus user-defined symbol extraction via regex-based scanning. The architecture must be designed with abstraction layers so that the symbol extractor can later be replaced with Tree-sitter or LSP without changing the Monaco provider API.

[Types]
Add new type definitions for the autocomplete engine, symbol table, completion items, and language provider abstractions.

Detailed type definitions:
- `src/types/completion.ts`:
  ```typescript
  /** A single symbol extracted from source code */
  export interface SourceSymbol {
    name: string;
    kind: MonacoCompletionItemKind;   // Variable, Function, Class, Struct, Enum, etc.
    range: { startLine: number; startColumn: number; endLine: number; endColumn: number };
    detail: string;                   // e.g. "int", "void", "user-defined variable"
    insertText: string;               // The text to insert
  }

  /** Incremental change to apply to the symbol table */
  export interface SymbolDiff {
    removed: string[];                // Symbol names to remove
    added: SourceSymbol[];            // New symbols to add
  }

  /** Language-specific built-in completions */
  export interface LanguageBuiltins {
    keywords: CompletionItem[];
    types: CompletionItem[];
    functions: CompletionItem[];
    snippets: CompletionItem[];
  }

  /** Abstraction for a symbol extractor (supports swap to Tree-sitter/LSP later) */
  export interface SymbolExtractor {
    readonly languageId: string;
    extract(document: string): SourceSymbol[];
    computeDiff(oldDoc: string, newDoc: string): SymbolDiff;
    dispose(): void;
  }

  /** Config for the completion provider */
  export interface CompletionConfig {
    debounceMs: number;               // 150ms default
    workerThreshold: number;          // 1000 lines default
    maxSuggestions: number;           // 50 default
    enableFuzzy: boolean;             // true default
  }
  ```

- `src/types/editor.ts` — Update `LanguageOption` to add `judge0Name: string` field for matching against API response names.

- `src/types/worker.ts`:
  ```typescript
  /** Messages sent from main thread to Web Worker */
  export interface WorkerRequest {
    type: "extract" | "computeDiff";
    payload: {
      languageId: string;
      document?: string;
      oldDoc?: string;
      newDoc?: string;
    };
  }

  /** Messages sent from Web Worker to main thread */
  export interface WorkerResponse {
    type: "extractResult" | "diffResult";
    payload: SourceSymbol[] | SymbolDiff;
  }
  ```

[Files]
Create 11 new files and modify 9 existing files.

Detailed breakdown:
- **New files to create:**
  - `src/types/completion.ts` — All autocomplete-related type definitions
  - `src/types/worker.ts` — Web Worker message types
  - `src/hooks/useAutocomplete.ts` — React hook that manages the completion provider lifecycle (registers/disposes Monaco provider, manages symbol table, handles worker messages)
  - `src/hooks/useDebounce.ts` — Reusable debounce hook (currently an empty stub, needs implementation)
  - `src/utils/code/symbolExtractor.ts` — Regex-based symbol extractor implementing SymbolExtractor interface (handles all 4 languages)
  - `src/utils/code/builtins.ts` — Static built-in completion data per language (C++ STL, Java stdlib, Python builtins, JS globals)
  - `src/utils/code/symbolCache.ts` — Incremental symbol table cache (Map<fileName, SourceSymbol[]>) with diff computation
  - `src/workers/symbolExtractor.worker.ts` — Web Worker wrapper for extractSymbols (runs extractor off main thread)
  - `src/config/completion.ts` — Default CompletionConfig and language-specific lists of keywords/types/functions
  - `src/constants/completions/cpp.ts` — C++ specific completions (keywords, STL containers, algorithms, CP snippets)
  - `src/constants/completions/index.ts` — Barrel export for language-specific builtins

- **Existing files to modify:**
  - `src/types/editor.ts` — Add `judge0Name: string` to `LanguageOption`
  - `src/constants/languages.ts` — Add `judge0Name` field to each entry, add `LANGUAGE_NAME_TO_ID` map for API response matching
  - `src/services/editor.ts` — Add `fetchAndMergeLanguages()` that calls `/languages` API and merges with static config
  - `src/hooks/useEditor.ts` — Integrate dynamic language fetching on mount, expose `availableLanguages` state
  - `src/components/editor/LanguageSelector.tsx` — No change needed (already uses `languageId: number`)
  - `src/components/editor/CodeEditor.tsx` — Integrate `useAutocomplete` hook, pass `monacoRef` and `mainEditorRef`
  - `src/components/editor/MonacoEditor.tsx` — Expose `monacoRef` to parent for provider registration, accept `onMount` callback properly
  - `src/hooks/useDebounce.ts` — Implement debounce utility
  - `src/utils/code.ts` or new `src/utils/code/index.ts` — Add barrel exports for the code utilities

[Functions]
Create new functions and modify existing ones for the autocomplete system and dynamic language fetching.

Detailed breakdown:
- **New functions:**
  - `src/hooks/useAutocomplete.ts`:
    - `useAutocomplete(monaco, editor, languageId)` — Registers a `CompletionItemProvider` for the current language. Manages symbol table via `symbolCache.ts`. Returns `{ registerProvider, disposeProvider }`.
    - `handleDocumentChange(content: string)` — Debounced handler that triggers symbol extraction (main thread if <threshold, worker if >=threshold).
    - `provideCompletionItems(model, position)` — Reads from symbol cache + builtins, filters by prefix, sorts by relevance.
    - `resolveCompletionItem(item)` — Optional, for adding documentation/details later.

  - `src/utils/code/symbolExtractor.ts`:
    - `extractCppSymbols(document: string): SourceSymbol[]` — Regex-based C++ scanner for: variables, functions, classes, structs, enums, namespaces, typedefs, using aliases, macros (#define).
    - `extractJavaSymbols(document: string): SourceSymbol[]` — Java scanner for: variables, methods, classes, interfaces, enums.
    - `extractPythonSymbols(document: string): SourceSymbol[]` — Python scanner for: variables, functions, classes.
    - `extractJavaScriptSymbols(document: string): SourceSymbol[]` — JavaScript scanner for: variables, functions, classes, const/let/var.
    - `computeDiff(oldDoc: string, newDoc: string): SymbolDiff` — Compares two extractions and returns added/removed symbols.
    - `createExtractor(languageId: string): SymbolExtractor` — Factory that returns the appropriate language extractor.

  - `src/utils/code/symbolCache.ts`:
    - `getSymbols(fileId: string): SourceSymbol[]` — Returns cached symbols for a file.
    - `updateSymbols(fileId: string, symbols: SourceSymbol[]): void` — Replaces cache entry.
    - `applyDiff(fileId: string, diff: SymbolDiff): void` — Incrementally updates cache.
    - `clearCache(fileId?: string): void` — Clears cache for a file or all.
    - `getAllIdentifiers(fileId: string): string[]` — Returns all symbol names for prefix matching.

  - `src/services/editor.ts`:
    - `fetchAndMergeLanguages(): Promise<LanguageOption[]>` — Calls `GET /languages`, parses response, maps Judge0 names to static config via `judge0Name`, returns merged array.

  - `src/workers/symbolExtractor.worker.ts`:
    - `self.onmessage(event: MessageEvent<WorkerRequest>)` — Handles "extract" and "computeDiff" messages, posts `WorkerResponse` back.

- **Modified functions:**
  - `src/hooks/useEditor.ts` — Add `availableLanguages` state initialized from static config; on mount call `fetchAndMergeLanguages()` to replace it; expose `availableLanguages` from the hook.
  - `src/constants/languages.ts` — Add `judge0Name` field: `{ value: 54, label: "C++", monaco: "cpp", extension: "cpp", judge0Name: "C++" }`
  - `src/hooks/useDebounce.ts` — Implement `useDebounce<T>(value: T, delay: number): T` hook.
  - `src/components/editor/CodeEditor.tsx` — Call `useAutocomplete(monacoRef.current, mainEditorRef.current, monacoLanguage)` after editor mounts.
  - `src/utils/code.ts` — Add re-exports for the new code analysis modules.

[Classes]
No classes; this is a functional architecture with interfaces (SymbolExtractor) and factory functions.

Interface implementations:
- `CppSymbolExtractor implements SymbolExtractor` — Regex-based C++ parser
- `JavaSymbolExtractor implements SymbolExtractor` — Regex-based Java parser
- `PythonSymbolExtractor implements SymbolExtractor` — Regex-based Python parser
- `JavaScriptSymbolExtractor implements SymbolExtractor` — Regex-based JavaScript parser

Each extractor has:
- `readonly languageId: string`
- `extract(document: string): SourceSymbol[]`
- `computeDiff(oldDoc: string, newDoc: string): SymbolDiff`
- `dispose(): void`

[Dependencies]
No new external dependencies required.

Existing dependencies used: `@monaco-editor/react`, `monaco-editor` types.

[Testing]
Manual verification by rendering the editor page and verifying autocomplete behavior.

Test scenarios:
- Verify language dropdown shows all languages from Judge0 API (including newly added ones if API response changes)
- Verify symbol extraction works for all 4 languages (type a variable name, then type its prefix elsewhere)
- Verify built-in keywords appear (e.g. typing "ve" suggests "vector" in C++, "def" in Python)
- Verify STL containers appear in C++ (vector, map, set, etc.)
- Verify user-defined functions appear (e.g. type "df" after defining `void dfs(...)`)
- Verify debounce prevents excessive re-parsing
- Verify Web Worker is used for files >1000 lines (check with large pasted content)
- Verify no duplicate suggestions
- Verify performance with 3000+ line file
- Verify proper disposal of Monaco provider on language change/unmount

[Implementation Order]
Implement in dependency order: types → config/constants → utilities (extractor, cache, builtins) → worker → services → hooks → components → integration.

Numbered steps:
1. Add `judge0Name` to `LanguageOption` in `src/types/editor.ts`
2. Create `src/types/completion.ts` with SourceSymbol, SymbolDiff, LanguageBuiltins, SymbolExtractor, CompletionConfig types
3. Create `src/types/worker.ts` with WorkerRequest, WorkerResponse types
4. Update `src/constants/languages.ts` — add `judge0Name` field, add `LANGUAGE_NAME_TO_ID` map
5. Create `src/config/completion.ts` — default CompletionConfig
6. Implement `src/hooks/useDebounce.ts` — debounce hook
7. Create `src/utils/code/symbolExtractor.ts` — regex-based extractors for all 4 languages + factory
8. Create `src/utils/code/symbolCache.ts` — incremental symbol table cache
9. Create `src/constants/completions/cpp.ts` — C++ builtins (keywords, STL containers, algorithms, CP snippets)
10. Create `src/constants/completions/index.ts` — barrel export for builtins
11. Create `src/workers/symbolExtractor.worker.ts` — Web Worker wrapper
12. Update `src/services/editor.ts` — add `fetchAndMergeLanguages()` function
13. Update `src/hooks/useEditor.ts` — integrate dynamic language fetching, expose `availableLanguages`
14. Create `src/hooks/useAutocomplete.ts` — main autocomplete hook (registers Monaco provider, manages symbol table, handles worker)
15. Update `src/utils/code.ts` — add barrel exports for new code analysis modules
16. Update `src/components/editor/MonacoEditor.tsx` — expose monacoRef via props/callback
17. Update `src/components/editor/CodeEditor.tsx` — integrate useAutocomplete hook