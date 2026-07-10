# Dynamic Language Dropdown & Autocomplete — Complete Flow

## Overview

This document describes the end-to-end flow for two major features:
1. **Dynamic Language Dropdown** — Languages fetched from Judge0 API on mount, merged with static config
2. **Production-Grade Autocomplete** — Monaco Editor `CompletionItemProvider` with hybrid main-thread/Web Worker symbol extraction

---

## Flow 1: Dynamic Language Dropdown

### Data Flow Diagram

```
[Page Load]
     │
     ▼
CodeEditor.tsx
     │  calls useEditor()
     │
     ▼
useEditor.ts
     │  useEffect on mount:
     │  fetchAndMergeLanguages()
     │
     ▼
fetchAndMergeLanguages()  (src/services/editor.ts)
     │
     ├──► userDirectApi.get("/languages")
     │       │
     │       ▼  (Judge0 API at localhost:2358)
     │   Response: [{ id: 54, name: "C++" }, { id: 62, name: "Java" }, ...]
     │       │
     │       ▼
     │   For each API language:
     │       getLanguageOptionByName(lang.name)
     │         │
     │         ▼  (src/constants/languages.ts)
     │     Matches against static LANGUAGE_OPTIONS
     │     using judge0Name field (case-insensitive)
     │         │
     │         ▼
     │     Merge: { value: 54, label: "C++", monaco: "cpp",
     │              extension: "cpp", judge0Name: "C++" }
     │
     ├──► If API succeeds → setAvailableLanguages(merged)
     └──► If API fails → setAvailableLanguages(STATIC_LANG_OPTIONS)  [fallback]
     │
     ▼
CodeEditor.tsx
     │  passes {availableLanguages} to <EditorHeader>
     │
     ▼
EditorHeader.tsx
     │  passes {options=availableLanguages} to <LanguageSelector>
     │
     ▼
LanguageSelector.tsx
     │  renders <select> with dynamic options
     │  on change → onLanguageChange(Number(e.target.value))
     │
     ▼
useEditor.ts  handleLanguageChange(id)
     │  setLanguageId(id)
     │  getLanguageOptionById(id) → get template from DEFAULT_CODE
     │  setCode(DEFAULT_CODE[lang.monaco])
```

### Key Files Involved

| File | Role |
|------|------|
| `src/services/editor.ts` | `fetchAndMergeLanguages()` — fetches from Judge0, merges with static config |
| `src/constants/languages.ts` | Static `LANGUAGE_OPTIONS` with `judge0Name` field, lookup helpers |
| `src/types/editor.ts` | `LanguageOption` interface with added `judge0Name: string` |
| `src/hooks/useEditor.ts` | `availableLanguages` state, `useEffect` fetch on mount, returns merged options |
| `src/components/editor/CodeEditor.tsx` | Passes `availableLanguages` to `EditorHeader` |
| `src/components/editor/EditorHeader.tsx` | Forwards `options` prop to `LanguageSelector` |
| `src/components/editor/LanguageSelector.tsx` | Renders `<select>` from `options` array |

---

## Flow 2: Production-Grade Autocomplete

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CodeEditor.tsx                              │
│  calls useAutocomplete(monacoRef.current, mainEditorRef.current,    │
│                        monacoLanguage)                              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      useAutocomplete.ts                              │
│                                                                      │
│  ┌─────────────────────┐     ┌──────────────────────────────┐       │
│  │   SymbolExtractor    │     │   SymbolCache (in-memory)    │       │
│  │   (main thread)      │◄───►│   Map<fileId, SourceSymbol[]>│       │
│  │   < 1000 lines       │     │                              │       │
│  └─────────────────────┘     │  getSymbolsByPrefix(fileId,   │       │
│                              │    prefix) → SourceSymbol[]   │       │
│  ┌─────────────────────┐     │                              │       │
│  │   Web Worker         │────►│  updateSymbols(fileId, syms)│       │
│  │   >= 1000 lines      │     │                              │       │
│  └─────────────────────┘     └─────────────┬────────────────┘       │
│                                            │                        │
│  ┌─────────────────────────────────────────▼──────────────────────┐ │
│  │  Monaco CompletionItemProvider                                  │ │
│  │                                                                 │ │
│  │  provideCompletionItems(model, position) {                      │ │
│  │    const prefix = word.word                                     │ │
│  │    const userSyms = getSymbolsByPrefix(fileId, prefix)          │ │
│  │    const builtins = LANGUAGE_BUILTINS[languageId]               │ │
│  │    // Filter builtins to remove duplicates with userSyms        │ │
│  │    // Sort: user symbols (sortText "0") before builtins         │ │
│  │    // Limit: config.maxSuggestions (default 50)                 │ │
│  │    return { suggestions }                                       │ │
│  │  }                                                              │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Execution Flow

#### A. Initialization (on mount / language change)

```
MonacoEditor mounts
     │
     ▼
onMount(editor, monaco) callback fires
     │  mainEditorRef.current = editor
     │  monacoRef.current = monaco
     │
     ▼
CodeEditor.tsx renders
     │  useAutocomplete(monacoRef.current, mainEditorRef.current, monacoLanguage)
     │
     ▼
useAutocomplete.ts
     ├──► useEffect([languageId]):
     │      createExtractor(languageId)  → caches extractor instance
     │      set fileIdRef.current = "code.cpp"
     │
     ├──► useEffect([monaco, editorInstance, languageId]):
     │      Dispose previous CompletionItemProvider (if any)
     │      Register new CompletionItemProvider via monaco.languages.registerCompletionItemProvider()
     │      Set trigger characters: [".", ":", ">", "/", "#", "("]
     │      Return cleanup: dispose provider on unmount/language change
     │
     └──► useEffect cleanup (on unmount):
            Terminate Web Worker
            Clear symbol cache
```

#### B. Symbol Extraction (on every debounced code change)

```
User types in editor
     │
     ▼
Monaco editor fires onChange
     │  editorInstance.getValue()
     │
     ▼
useAutocomplete.ts
     │  useDebounce(value, 150ms)  → waits 150ms of inactivity
     │
     ▼
handleExtract(debouncedCode) called
     │
     ├──► Count lines: code.split("\n").length
     │
     ├──► If lines < 1000:
     │      createExtractor(languageId).extract(code)
     │           │  (synchronous, main thread)
     │           ▼
     │      Returns SourceSymbol[] via regex scanning:
     │        C++    → #define, using, typedef, enum, struct, class,
     │                  namespace, function, variable patterns
     │        Java   → interface, enum, class, method, field patterns
     │        Python → class, def, variable, async def patterns
     │        JS     → class, function, const, let, var, method,
     │                  async function, async method patterns
     │           │
     │           ▼
     │      updateSymbols(fileId, symbols)  → writes to cache
     │
     └──► If lines >= 1000:
            new Worker("symbolExtractor.worker.ts")
                 │  (asynchronous, off main thread)
                 ▼
            Worker receives WorkerRequest:
              { type: "extract", payload: { languageId, document: code } }
                 │
                 ▼
            Worker calls createExtractor(languageId).extract(code)
                 │  (same regex patterns, but in worker context)
                 ▼
            Worker posts WorkerResponse:
              { type: "extractResult", payload: SourceSymbol[] }
                 │
                 ▼
            Main thread receives response
                 │  (discards stale responses via pendingWorkerRef counter)
                 ▼
            updateSymbols(fileId, symbols)  → writes to cache
```

#### C. Providing Completions (on every keystroke in editor)

```
User types "vec" in C++ editor
     │
     ▼
Monaco detects trigger character or natural word break
     │  Calls provideCompletionItems(model, position)
     │
     ▼
useAutocomplete.ts — provideCompletionItems callback
     │
     ├──► model.getWordAtPosition(position) → { word: "vec", ... }
     │
     ├──► getSymbolsByPrefix(fileId, "vec")
     │      │
     │      ▼  (from symbolCache.ts)
     │      Returns user-defined symbols matching "vec" prefix
     │      e.g. [vector<int> user's vector variable]
     │
     ├──► LANGUAGE_BUILTINS["cpp"]
     │      │
     │      ▼  (from constants/completions/cpp.ts)
     │      All builtins: keywords + types + functions + snippets
     │      Filtered:   "vector" matches "vec" prefix
     │      Duplicates: Excluded if user already has a symbol with same name
     │
     ├──► Merge & sort:
     │      User symbols (sortText: "0")
     │      Builtins     (sortText: "1" for classes/functions, "2" for variables)
     │      Snippets     (sortText: "3")
     │
     ├──► Limit to config.maxSuggestions (50)
     │
     └──► Return { suggestions: [...] }
            │
            ▼
      Monaco renders dropdown:
        ┌──────────────────────────────┐
        │ vector  (user variable)  ◄── user-defined (sortText "0")
        │ vector  (std::vector<T>) ◄── class (sortText "1")
        │ vec     (macro)          ◄── constant (sortText "1")
        └──────────────────────────────┘
```

### Trigger Characters for Autocomplete

| Character | Purpose | Languages |
|-----------|---------|-----------|
| `.` | Member access (obj.prop) | C++, Java, Python, JS |
| `:` | Scope resolution / slicing | C++ (`::`), Python (`:` after def/class) |
| `>` | Arrow operator (ptr->method) | C++ |
| `/` | Comments, paths | All |
| `#` | Preprocessor directives | C++ |
| `(` | Function call completion | All |

### Hybrid Architecture Decision

```
Lines = code.split("\n").length

┌──────────────┐
│  Lines < 1000 │ ──► Main Thread (synchronous)
│               │     - No worker overhead
│               │     - Instant symbol table update
│               │     - Suitable for typical CP solutions (20-200 lines)
└──────────────┘

┌──────────────┐
│  Lines >= 1000│ ──► Web Worker (asynchronous)
│               │     - Non-blocking UI
│               │     - ~5ms message overhead
│               │     - Suitable for large files (3000+ lines)
│               │     - Stale responses discarded via request counter
└──────────────┘
```

### Duplicate Prevention Strategy

```
User declares in C++:
    vector<int> vec;      ← symbolCache stores { name: "vec", kind: Variable }

Builtins include:
    vector (std::vector<T>)  ← kind: Class

At provideCompletionItems time:
    1. Get user symbols matching prefix "vec"
    2. Build userNames Set from user symbols: {"vec", ...}
    3. For each builtin, check if userNames.has(builtin.label.toLowerCase())
    4. Skip builtins that match a user symbol name
```

### Built-in Completion Categories (C++ Example)

| Category | Count | Examples |
|----------|-------|---------|
| Keywords | 50+ | if, else, for, while, int, bool, const, virtual, template, ... |
| Types (STL) | 40+ | vector, map, set, unordered_map, unique_ptr, string_view, ... |
| Functions (STL) | 100+ | sort, lower_bound, accumulate, gcd, min_element, ... |
| Snippets | 8 | solve_func, main_func, fast_io, debug, rng, read_vector, ... |

### Cleanup & Disposal

```
Language Change:
    1. disposeProvider()  → unregister Monaco CompletionItemProvider
    2. SymbolExtractor recreated for new language
    3. fileIdRef updated (e.g. "code.cpp" → "code.py")
    4. Symbol cache NOT cleared (can be reused if user switches back)

Component Unmount:
    1. disposeProvider()  → unregister Monaco CompletionItemProvider
    2. workerRef.current.terminate()  → kill Web Worker
    3. clearCache()  → empty entire symbol table
```

---

## Files Created/Modified Summary

### New Files (11 files)

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `src/types/completion.ts` | ~70 | SourceSymbol, SymbolDiff, LanguageBuiltins, SymbolExtractor, CompletionConfig |
| 2 | `src/types/worker.ts` | ~30 | WorkerRequest, WorkerResponse interfaces |
| 3 | `src/config/completion.ts` | ~15 | Default CompletionConfig, LANGUAGE_EXT_MAP |
| 4 | `src/hooks/useDebounce.ts` | ~20 | Generic `useDebounce<T>` hook |
| 5 | `src/hooks/useAutocomplete.ts` | ~210 | Main autocomplete hook (provider registration, extraction, worker) |
| 6 | `src/utils/code/symbolExtractor.ts` | ~250 | 4 regex extractors + factory |
| 7 | `src/utils/code/symbolCache.ts` | ~60 | In-memory symbol table with diff support |
| 8 | `src/constants/completions/cpp.ts` | ~600 | C++ builtins (keywords, STL types, functions, snippets) |
| 9 | `src/constants/completions/index.ts` | ~1 | Barrel export |
| 10 | `src/workers/symbolExtractor.worker.ts` | ~50 | Web Worker wrapper |
| 11 | `docs/autocomplete-language-dropdown-flow.md` | This file |

### Modified Files (6 files)

| # | File | Change |
|---|------|--------|
| 1 | `src/types/editor.ts` | Added `judge0Name: string` to `LanguageOption` |
| 2 | `src/constants/languages.ts` | Added `judge0Name` values, `getLanguageOptionByName()`, `LANGUAGE_NAME_TO_ID` |
| 3 | `src/services/editor.ts` | Added `fetchAndMergeLanguages()` |
| 4 | `src/hooks/useEditor.ts` | Added `availableLanguages` state + dynamic fetch on mount |
| 5 | `src/utils/code.ts` | Barrel exports for symbolExtractor and symbolCache |
| 6 | `src/components/editor/CodeEditor.tsx` | Use `availableLanguages`, integrate `useAutocomplete` |

### Files That Did NOT Need Changes

| File | Reason |
|------|--------|
| `src/components/editor/LanguageSelector.tsx` | Already generic — takes `options: LanguageOption[]` |
| `src/components/editor/EditorHeader.tsx` | Already passes `options` through to `LanguageSelector` |
| `src/components/editor/MonacoEditor.tsx` | Already exposes `monaco` via `onMount` callback |

---

## TypeScript Compilation

```
$ npx tsc --noEmit
EXIT_CODE=0    ← 0 errors