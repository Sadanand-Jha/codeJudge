import type { LanguageOption } from "@/types/editor";

/**
 * Static mapping of Judge0 language IDs to editor configuration.
 * This array serves as the source of truth for language options displayed in the editor,
 * mapping Judge0 API IDs to Monaco editor identifiers and file extensions.
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 54,  label: "C++",       monaco: "cpp",        extension: "cpp",  judge0Name: "C++" },
  { value: 62,  label: "Java",      monaco: "java",       extension: "java", judge0Name: "Java" },
  { value: 71,  label: "Python",    monaco: "python",     extension: "py",   judge0Name: "Python" },
  { value: 63,  label: "JavaScript", monaco: "javascript", extension: "js",   judge0Name: "JavaScript" },
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
