/**
 * A single symbol extracted from source code.
 */
export interface SourceSymbol {
  name: string;
  kind: number; // Monaco.CompletionItemKind (numeric enum)
  range: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  detail: string; // e.g. "int", "void", "user-defined variable"
  insertText: string; // The text to insert
}

/**
 * Incremental change to apply to the symbol table.
 */
export interface SymbolDiff {
  removed: string[]; // Symbol names to remove
  added: SourceSymbol[]; // New symbols to add
}

/**
 * Language-specific built-in completions.
 */
export interface LanguageBuiltins {
  keywords: CompletionItem[];
  types: CompletionItem[];
  functions: CompletionItem[];
  snippets: CompletionItem[];
}

/**
 * A simplified completion item for static built-in data.
 */
export interface CompletionItem {
  label: string;
  kind: number; // Monaco.CompletionItemKind
  detail?: string;
  insertText: string;
  documentation?: string;
}

/**
 * Abstraction for a symbol extractor (supports swap to Tree-sitter/LSP later).
 */
export interface SymbolExtractor {
  readonly languageId: string;
  extract(document: string): SourceSymbol[];
  computeDiff(oldDoc: string, newDoc: string): SymbolDiff;
  dispose(): void;
}

/**
 * Config for the completion provider.
 */
export interface CompletionConfig {
  debounceMs: number; // 150ms default
  workerThreshold: number; // 1000 lines default
  maxSuggestions: number; // 50 default
  enableFuzzy: boolean; // true default
}