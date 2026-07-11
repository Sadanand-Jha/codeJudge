import type { LanguageOption } from "@/types/editor";

/**
 * Static mapping of Judge0 language IDs to editor configuration.
 * This array serves as the source of truth for language options displayed in the editor,
 * mapping Judge0 API IDs to Monaco editor identifiers and file extensions.
 */

/**
 * All available languages (full list for API compatibility)
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 45, label: "Assembly",      monaco: "plaintext",  extension: "asm",        judge0Name: "Assembly (NASM 2.14.02)" },
  { value: 46, label: "Bash",          monaco: "shell",      extension: "sh",         judge0Name: "Bash (5.0.0)" },
  { value: 47, label: "Basic",         monaco: "vb",         extension: "bas",        judge0Name: "Basic (FBC 1.07.1)" },

  { value: 75, label: "C (Clang)",     monaco: "c",          extension: "c",          judge0Name: "C (Clang 7.0.1)" },
  { value: 76, label: "C++ (Clang)",   monaco: "cpp",        extension: "cpp",        judge0Name: "C++ (Clang 7.0.1)" },
  { value: 48, label: "C (GCC 7.4)",   monaco: "c",          extension: "c",          judge0Name: "C (GCC 7.4.0)" },
  { value: 52, label: "C++ (GCC 7.4)", monaco: "cpp",        extension: "cpp",        judge0Name: "C++ (GCC 7.4.0)" },
  { value: 49, label: "C (GCC 8.3)",   monaco: "c",          extension: "c",          judge0Name: "C (GCC 8.3.0)" },
  { value: 53, label: "C++ (GCC 8.3)", monaco: "cpp",        extension: "cpp",        judge0Name: "C++ (GCC 8.3.0)" },
  { value: 50, label: "C (GCC 9.2)",   monaco: "c",          extension: "c",          judge0Name: "C (GCC 9.2.0)" },
  { value: 54, label: "C++ (GCC 9.2)", monaco: "cpp",        extension: "cpp",        judge0Name: "C++ (GCC 9.2.0)" },

  { value: 86, label: "Clojure",       monaco: "clojure",    extension: "clj",        judge0Name: "Clojure (1.10.1)" },
  { value: 51, label: "C#",            monaco: "csharp",     extension: "cs",         judge0Name: "C# (Mono 6.6.0.161)" },
  { value: 77, label: "COBOL",         monaco: "plaintext",  extension: "cob",        judge0Name: "COBOL (GnuCOBOL 2.2)" },
  { value: 55, label: "Common Lisp",   monaco: "lisp",       extension: "lisp",       judge0Name: "Common Lisp (SBCL 2.0.0)" },
  { value: 56, label: "D",             monaco: "plaintext",  extension: "d",          judge0Name: "D (DMD 2.089.1)" },
  { value: 57, label: "Elixir",        monaco: "plaintext",  extension: "ex",         judge0Name: "Elixir (1.9.4)" },
  { value: 58, label: "Erlang",        monaco: "erlang",     extension: "erl",        judge0Name: "Erlang (OTP 22.2)" },

  { value: 44, label: "Executable",    monaco: "plaintext",  extension: "",           judge0Name: "Executable" },

  { value: 87, label: "F#",            monaco: "fsharp",     extension: "fs",         judge0Name: "F# (.NET Core SDK 3.1.202)" },
  { value: 59, label: "Fortran",       monaco: "plaintext",  extension: "f90",        judge0Name: "Fortran (GFortran 9.2.0)" },
  { value: 60, label: "Go",            monaco: "go",         extension: "go",         judge0Name: "Go (1.13.5)" },
  { value: 88, label: "Groovy",        monaco: "groovy",     extension: "groovy",     judge0Name: "Groovy (3.0.3)" },
  { value: 61, label: "Haskell",       monaco: "haskell",    extension: "hs",         judge0Name: "Haskell (GHC 8.8.1)" },

  { value: 62, label: "Java",          monaco: "java",       extension: "java",       judge0Name: "Java (OpenJDK 13.0.1)" },
  { value: 63, label: "JavaScript",    monaco: "javascript", extension: "js",         judge0Name: "JavaScript (Node.js 12.14.0)" },
  { value: 78, label: "Kotlin",        monaco: "kotlin",     extension: "kt",         judge0Name: "Kotlin (1.3.70)" },
  { value: 64, label: "Lua",           monaco: "lua",        extension: "lua",        judge0Name: "Lua (5.3.5)" },

  { value: 89, label: "Multi-file",    monaco: "plaintext",  extension: "",           judge0Name: "Multi-file program" },

  { value: 79, label: "Objective-C",   monaco: "objective-c",extension: "m",          judge0Name: "Objective-C (Clang 7.0.1)" },
  { value: 65, label: "OCaml",         monaco: "ocaml",      extension: "ml",         judge0Name: "OCaml (4.09.0)" },
  { value: 66, label: "Octave",        monaco: "plaintext",  extension: "m",          judge0Name: "Octave (5.1.0)" },
  { value: 67, label: "Pascal",        monaco: "pascal",     extension: "pas",        judge0Name: "Pascal (FPC 3.0.4)" },
  { value: 85, label: "Perl",          monaco: "perl",       extension: "pl",         judge0Name: "Perl (5.28.1)" },
  { value: 68, label: "PHP",           monaco: "php",        extension: "php",        judge0Name: "PHP (7.4.1)" },

  { value: 43, label: "Plain Text",    monaco: "plaintext",  extension: "txt",        judge0Name: "Plain Text" },

  { value: 69, label: "Prolog",        monaco: "plaintext",  extension: "pl",         judge0Name: "Prolog (GNU Prolog 1.4.5)" },
  { value: 70, label: "Python 2",      monaco: "python",     extension: "py",         judge0Name: "Python (2.7.17)" },
  { value: 71, label: "Python 3",      monaco: "python",     extension: "py",         judge0Name: "Python (3.8.1)" },
  { value: 80, label: "R",             monaco: "r",          extension: "r",          judge0Name: "R (4.0.0)" },
  { value: 72, label: "Ruby",          monaco: "ruby",       extension: "rb",         judge0Name: "Ruby (2.7.0)" },
  { value: 73, label: "Rust",          monaco: "rust",       extension: "rs",         judge0Name: "Rust (1.40.0)" },
  { value: 81, label: "Scala",         monaco: "scala",      extension: "scala",      judge0Name: "Scala (2.13.2)" },
  { value: 82, label: "SQL",           monaco: "sql",        extension: "sql",        judge0Name: "SQL (SQLite 3.27.2)" },
  { value: 83, label: "Swift",         monaco: "swift",      extension: "swift",      judge0Name: "Swift (5.2.3)" },
  { value: 74, label: "TypeScript",    monaco: "typescript", extension: "ts",         judge0Name: "TypeScript (3.7.4)" },
  { value: 84, label: "Visual Basic",  monaco: "vb",         extension: "vb",         judge0Name: "Visual Basic.Net (vbnc 0.0.0.5943)" },
];

/**
 * Languages commonly used in Competitive Programming
 * Includes: C, C++, Java, Python, and other popular CP languages
 */
export const CP_LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 54, label: "C++ (GCC 9.2)", monaco: "cpp",  extension: "cpp", judge0Name: "C++ (GCC 9.2.0)" },
  { value: 53, label: "C++ (GCC 8.3)", monaco: "cpp",  extension: "cpp", judge0Name: "C++ (GCC 8.3.0)" },
  { value: 52, label: "C++ (GCC 7.4)", monaco: "cpp",  extension: "cpp", judge0Name: "C++ (GCC 7.4.0)" },
  { value: 76, label: "C++ (Clang)",   monaco: "cpp",  extension: "cpp", judge0Name: "C++ (Clang 7.0.1)" },
  { value: 50, label: "C (GCC 9.2)",   monaco: "c",    extension: "c",   judge0Name: "C (GCC 9.2.0)" },
  { value: 49, label: "C (GCC 8.3)",   monaco: "c",    extension: "c",   judge0Name: "C (GCC 8.3.0)" },
  { value: 48, label: "C (GCC 7.4)",   monaco: "c",    extension: "c",   judge0Name: "C (GCC 7.4.0)" },
  { value: 75, label: "C (Clang)",     monaco: "c",    extension: "c",   judge0Name: "C (Clang 7.0.1)" },
  { value: 71, label: "Python 3",      monaco: "python", extension: "py", judge0Name: "Python (3.8.1)" },
  { value: 70, label: "Python 2",      monaco: "python", extension: "py", judge0Name: "Python (2.7.17)" },
  { value: 62, label: "Java",          monaco: "java", extension: "java", judge0Name: "Java (OpenJDK 13.0.1)" },
  { value: 74, label: "TypeScript",    monaco: "typescript", extension: "ts", judge0Name: "TypeScript (3.7.4)" },
  { value: 63, label: "JavaScript",    monaco: "javascript", extension: "js", judge0Name: "JavaScript (Node.js 12.14.0)" },
  { value: 73, label: "Rust",          monaco: "rust", extension: "rs", judge0Name: "Rust (1.40.0)" },
  { value: 60, label: "Go",            monaco: "go",   extension: "go",  judge0Name: "Go (1.13.5)" },
  { value: 78, label: "Kotlin",        monaco: "kotlin", extension: "kt", judge0Name: "Kotlin (1.3.70)" },
  { value: 51, label: "C#",            monaco: "csharp", extension: "cs", judge0Name: "C# (Mono 6.6.0.161)" },
  { value: 72, label: "Ruby",          monaco: "ruby", extension: "rb", judge0Name: "Ruby (2.7.0)" },
];
/** Default language ID (C++ - Judge0 id 54) */
export const DEFAULT_LANGUAGE_ID = 54;

/**
 * Default code templates keyed by Monaco language identifier.
 * When switching languages, the Monaco identifier is used to look up the template.
 */
export const DEFAULT_CODE: Record<string, string> = {
  javascript: `function solve() {\n    // Write your code here\n}\n\nsolve();`,
  python: `def solve():\n    pass\n\nif __name__ == '__main__':\n    t = 1\n    # t = int(input())\n    for _ in range(t):\n        solve()`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    int n, k;\n    cin >> n >> k;\n    cout << "Ready." << endl;\n}\n\nsigned main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    \n    int t = 1;\n    // cin >> t;\n    while (t--) {\n        solve();\n    }\n    return 0;\n}`,
  java: `import java.util.*;\n\npublic class Main {\n    static void solve() {\n        // Write your code here\n    }\n\n    public static void main(String[] args) {\n        solve();\n    }\n}`,
};

export const DEFAULT_INPUT = `7 2\n`;

/** Helper: find LanguageOption by Judge0 id */
export function getLanguageOptionById(id: number): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find((l) => l.value === id);
}

/** Helper: find LanguageOption by Judge0 name */
export function getLanguageOptionByName(name: string): LanguageOption | undefined {
  return LANGUAGE_OPTIONS.find(
    (l) => l.judge0Name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Map of Judge0 language names to our static config IDs.
 * Used to merge dynamic API responses with static config.
 */
export const LANGUAGE_NAME_TO_ID: Record<string, number> = Object.fromEntries(
  LANGUAGE_OPTIONS.map((l) => [l.judge0Name.toLowerCase(), l.value])
);
