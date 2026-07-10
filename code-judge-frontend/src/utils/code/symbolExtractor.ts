/**
 * Regex-based symbol extractors for C++, Java, Python, and JavaScript.
 *
 * Implements the SymbolExtractor interface so it can be swapped out later
 * for Tree-sitter or LSP-based extraction without changing the Monaco provider.
 *
 * CompletionItemKind numeric values (Monaco enum):
 *   0=Method, 1=Function, 3=Field, 4=Variable, 5=Class, 6=Struct,
 *   7=Interface, 8=Module, 14=Constant, 15=Enum, 16=EnumMember
 */

import type { SourceSymbol, SymbolDiff, SymbolExtractor } from "@/types/completion";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Monaco CompletionItemKind constants used throughout the extractors. */
const Kind = {
  Method: 0,
  Function: 1,
  Field: 3,
  Variable: 4,
  Class: 5,
  Struct: 6,
  Interface: 7,
  Module: 8,
  Constant: 14,
  Enum: 15,
  EnumMember: 16,
} as const;

/**
 * Compute a 0-based range for a regex match.
 * `lineStart` is the 0-based line the match started on.
 */
function lineRange(
  source: string,
  matchIndex: number,
  nameLength: number,
): { startLine: number; startColumn: number; endLine: number; endColumn: number } {
  const upTo = source.slice(0, matchIndex);
  const lines = upTo.split("\n");
  const startLine = lines.length - 1; // 0-based
  const startColumn = lines[startLine].length;
  // For simplicity, assume single-line symbol names
  return { startLine, startColumn, endLine: startLine, endColumn: startColumn + nameLength };
}

function addSymbol(
  acc: SourceSymbol[],
  name: string,
  kind: number,
  detail: string,
  source: string,
  matchIndex: number,
): void {
  if (!name) return;
  acc.push({
    name,
    kind,
    range: lineRange(source, matchIndex, name.length),
    detail,
    insertText: name,
  });
}

// ---------------------------------------------------------------------------
// C++ Extractor
// ---------------------------------------------------------------------------

const CPP_PATTERNS: { regex: RegExp; kind: number; detail: string }[] = [
  // #define MACRO
  { regex: /#\s*define\s+([A-Za-z_]\w*)/g, kind: Kind.Constant, detail: "macro" },
  // using Alias = ...
  { regex: /using\s+([A-Za-z_]\w*)\s*=/g, kind: Kind.Constant, detail: "type alias" },
  // typedef Old New
  { regex: /typedef\s+.*?\s+([A-Za-z_]\w*)\s*;/g, kind: Kind.Constant, detail: "typedef" },
  // enum [class] Name { ... }
  { regex: /enum\s+(?:class\s+)?([A-Za-z_]\w*)/g, kind: Kind.Enum, detail: "enum" },
  // struct Name ...
  { regex: /\bstruct\s+([A-Za-z_]\w*)/g, kind: Kind.Struct, detail: "struct" },
  // class Name ...
  { regex: /\bclass\s+([A-Za-z_]\w*)/g, kind: Kind.Class, detail: "class" },
  // namespace Name
  { regex: /\bnamespace\s+([A-Za-z_]\w*)/g, kind: Kind.Module, detail: "namespace" },
  // Function: returnType name(...) or returnType& name(...)
  { regex: /[\w&*]+\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*(?:const\s*)?[;{]/g, kind: Kind.Function, detail: "function" },
  // Variable: type name = ... or type name;
  { regex: /(?:int|long|double|float|char|bool|string|auto|size_t|int64_t|uint64_t|void)\s+([A-Za-z_]\w*)\s*(?:=|;|\,)/g, kind: Kind.Variable, detail: "variable" },
];

export class CppSymbolExtractor implements SymbolExtractor {
  readonly languageId = "cpp";

  extract(document: string): SourceSymbol[] {
    const symbols: SourceSymbol[] = [];
    for (const { regex, kind, detail } of CPP_PATTERNS) {
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(document)) !== null) {
        addSymbol(symbols, m[1], kind, detail, document, m.index);
      }
    }
    return symbols;
  }

  computeDiff(oldDoc: string, newDoc: string): SymbolDiff {
    const oldSyms = this.extract(oldDoc);
    const newSyms = this.extract(newDoc);
    const oldNames = new Set(oldSyms.map((s) => s.name));
    const newNames = new Set(newSyms.map((s) => s.name));
    return {
      removed: oldSyms.filter((s) => !newNames.has(s.name)).map((s) => s.name),
      added: newSyms.filter((s) => !oldNames.has(s.name)),
    };
  }

  dispose(): void {
    // No-op
  }
}

// ---------------------------------------------------------------------------
// Java Extractor
// ---------------------------------------------------------------------------

const JAVA_PATTERNS: { regex: RegExp; kind: number; detail: string }[] = [
  // interface Name
  { regex: /\binterface\s+([A-Za-z_]\w*)/g, kind: Kind.Interface, detail: "interface" },
  // enum Name
  { regex: /\benum\s+([A-Za-z_]\w*)/g, kind: Kind.Enum, detail: "enum" },
  // class Name
  { regex: /\bclass\s+([A-Za-z_]\w*)/g, kind: Kind.Class, detail: "class" },
  // Method: returnType name(...) throws? {
  { regex: /[\w<>[\],\s]+\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*(?:throws\s+[\w,]+)?\s*{/g, kind: Kind.Method, detail: "method" },
  // Field: type name;
  { regex: /(?:private|public|protected|static|final|volatile|transient|synchronized)?\s*(?:int|long|double|float|char|boolean|byte|short|String|void|List|Map|Set|ArrayList|HashMap|HashSet|Object|Integer|Long|Double|Float|Character|Boolean)\s+([A-Za-z_]\w*)\s*(?:=|;|\)|,)/g, kind: Kind.Field, detail: "field" },
];

export class JavaSymbolExtractor implements SymbolExtractor {
  readonly languageId = "java";

  extract(document: string): SourceSymbol[] {
    const symbols: SourceSymbol[] = [];
    for (const { regex, kind, detail } of JAVA_PATTERNS) {
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(document)) !== null) {
        addSymbol(symbols, m[1], kind, detail, document, m.index);
      }
    }
    return symbols;
  }

  computeDiff(oldDoc: string, newDoc: string): SymbolDiff {
    const oldSyms = this.extract(oldDoc);
    const newSyms = this.extract(newDoc);
    const oldNames = new Set(oldSyms.map((s) => s.name));
    const newNames = new Set(newSyms.map((s) => s.name));
    return {
      removed: oldSyms.filter((s) => !newNames.has(s.name)).map((s) => s.name),
      added: newSyms.filter((s) => !oldNames.has(s.name)),
    };
  }

  dispose(): void {
    // No-op
  }
}

// ---------------------------------------------------------------------------
// Python Extractor
// ---------------------------------------------------------------------------

const PYTHON_PATTERNS: { regex: RegExp; kind: number; detail: string }[] = [
  // class Name[(Base)]
  { regex: /\bclass\s+([A-Za-z_]\w*)/g, kind: Kind.Class, detail: "class" },
  // def name(...):
  { regex: /\bdef\s+([A-Za-z_]\w*)\s*\(/g, kind: Kind.Function, detail: "function" },
  // Variable: name = ... (top-level, not preceded by def/class/import/from)
  { regex: /^([A-Za-z_]\w*)\s*=\s*/gm, kind: Kind.Variable, detail: "variable" },
  // Variable in function body: name = ...
  { regex: /^\s+([A-Za-z_]\w*)\s*=\s*/gm, kind: Kind.Variable, detail: "variable" },
  // async def name(...):
  { regex: /\basync\s+def\s+([A-Za-z_]\w*)\s*\(/g, kind: Kind.Function, detail: "async function" },
];

export class PythonSymbolExtractor implements SymbolExtractor {
  readonly languageId = "python";

  extract(document: string): SourceSymbol[] {
    const symbols: SourceSymbol[] = [];
    for (const { regex, kind, detail } of PYTHON_PATTERNS) {
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(document)) !== null) {
        addSymbol(symbols, m[1], kind, detail, document, m.index);
      }
    }
    return symbols;
  }

  computeDiff(oldDoc: string, newDoc: string): SymbolDiff {
    const oldSyms = this.extract(oldDoc);
    const newSyms = this.extract(newDoc);
    const oldNames = new Set(oldSyms.map((s) => s.name));
    const newNames = new Set(newSyms.map((s) => s.name));
    return {
      removed: oldSyms.filter((s) => !newNames.has(s.name)).map((s) => s.name),
      added: newSyms.filter((s) => !oldNames.has(s.name)),
    };
  }

  dispose(): void {
    // No-op
  }
}

// ---------------------------------------------------------------------------
// JavaScript Extractor
// ---------------------------------------------------------------------------

const JS_PATTERNS: { regex: RegExp; kind: number; detail: string }[] = [
  // class Name
  { regex: /\bclass\s+([A-Za-z_$]\w*)/g, kind: Kind.Class, detail: "class" },
  // function name(...)
  { regex: /\bfunction\s+([A-Za-z_$]\w*)\s*\(/g, kind: Kind.Function, detail: "function" },
  // const name = (arrow function or value)
  { regex: /\bconst\s+([A-Za-z_$]\w*)\s*=/g, kind: Kind.Constant, detail: "const" },
  // let name =
  { regex: /\blet\s+([A-Za-z_$]\w*)\s*=/g, kind: Kind.Variable, detail: "let variable" },
  // var name =
  { regex: /\bvar\s+([A-Za-z_$]\w*)\s*=/g, kind: Kind.Variable, detail: "var variable" },
  // methodName(...) { ... } (inside class or object literal)
  { regex: /([A-Za-z_$]\w*)\s*\([^)]*\)\s*{/g, kind: Kind.Method, detail: "method" },
  // async function name(...)
  { regex: /\basync\s+function\s+([A-Za-z_$]\w*)\s*\(/g, kind: Kind.Function, detail: "async function" },
  // async name(...) { ... } (method shorthand)
  { regex: /\basync\s+([A-Za-z_$]\w*)\s*\([^)]*\)\s*{/g, kind: Kind.Method, detail: "async method" },
];

export class JavaScriptSymbolExtractor implements SymbolExtractor {
  readonly languageId = "javascript";

  extract(document: string): SourceSymbol[] {
    const symbols: SourceSymbol[] = [];
    for (const { regex, kind, detail } of JS_PATTERNS) {
      regex.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(document)) !== null) {
        addSymbol(symbols, m[1], kind, detail, document, m.index);
      }
    }
    return symbols;
  }

  computeDiff(oldDoc: string, newDoc: string): SymbolDiff {
    const oldSyms = this.extract(oldDoc);
    const newSyms = this.extract(newDoc);
    const oldNames = new Set(oldSyms.map((s) => s.name));
    const newNames = new Set(newSyms.map((s) => s.name));
    return {
      removed: oldSyms.filter((s) => !newNames.has(s.name)).map((s) => s.name),
      added: newSyms.filter((s) => !oldNames.has(s.name)),
    };
  }

  dispose(): void {
    // No-op
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const extractorRegistry: Record<string, SymbolExtractor> = {
  cpp: new CppSymbolExtractor(),
  java: new JavaSymbolExtractor(),
  python: new PythonSymbolExtractor(),
  javascript: new JavaScriptSymbolExtractor(),
};

/**
 * Factory that returns the appropriate language extractor.
 * Throws if the language is not supported.
 */
export function createExtractor(languageId: string): SymbolExtractor {
  const extractor = extractorRegistry[languageId];
  if (!extractor) {
    throw new Error(`Unsupported language: ${languageId}`);
  }
  return extractor;
}

/**
 * Check if a language is supported by the symbol extractor.
 */
export function isLanguageSupported(languageId: string): boolean {
  return languageId in extractorRegistry;
}