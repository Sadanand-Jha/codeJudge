"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#272822]" />,
});

type Language = "javascript" | "python" | "cpp" | "java";

const LANGUAGE_OPTIONS: Array<{ value: Language; label: string; extension: string }> = [
  { value: "cpp", label: "C++", extension: "cpp" },
  { value: "python", label: "Python", extension: "py" },
  { value: "java", label: "Java", extension: "java" },
  { value: "javascript", label: "JavaScript", extension: "js" },
];

const DEFAULT_CODE: Record<Language, string> = {
  javascript: `function solve() {\n    // Write your code here\n}\n\nsolve();`,
  python: `def solve():\n    pass\n\nif __name__ == '__main__':\n    t = 1\n    # t = int(input())\n    for _ in range(t):\n        solve()`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solve() {\n    int n, k;\n    cin >> n >> k;\n    cout << "Ready." << endl;\n}\n\nsigned main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    \n    int t = 1;\n    // cin >> t;\n    while (t--) {\n        solve();\n    }\n    return 0;\n}`,
  java: `import java.util.*;\n\npublic class Main {\n    static void solve() {\n        // Write your code here\n    }\n\n    public static void main(String[] args) {\n        solve();\n    }\n}`,
};

const DEFAULT_INPUT = `7 2\n`;
const DEFAULT_RIGHT_WIDTH = 450;
const MIN_RIGHT_WIDTH = 200;

export default function Editor() {
  const [language, setLanguage] = useState<Language>("cpp");
  const [code, setCode] = useState(DEFAULT_CODE.cpp);
  const [inputCode, setInputCode] = useState(DEFAULT_INPUT);
  const [outputCode, setOutputCode] = useState("");
  
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [inputHeight, setInputHeight] = useState(250);
  
  const [cursorPosition, setCursorPosition] = useState("Line 1, Column 1");
  const [isCompiling, setIsCompiling] = useState(false);

  const monacoRef = useRef<any>(null);
  const mainEditorRef = useRef<any>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    kind: "left-right" | "input-output";
    startX?: number;
    startY?: number;
    startWidth?: number;
    startInputHeight?: number;
  } | null>(null);

  // Sublime Monokai Theme Colors
  const SUBLIME_BG = "#272822";
  const UI_BG = "#1e1e1e";
  const BORDER_COLOR = "#333333";

  const createEditorTheme = () => {
    if (!monacoRef.current) return;

    monacoRef.current.editor.defineTheme("sublime-monokai", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "75715E" },
        { token: "string", foreground: "E6DB74" },
        { token: "number", foreground: "AE81FF" },
        { token: "keyword", foreground: "F92672" },
        { token: "identifier", foreground: "F8F8F2" },
        { token: "type", foreground: "66D9EF", fontStyle: "italic" },
        { token: "function", foreground: "A6E22E" },
      ],
      colors: {
        "editor.background": SUBLIME_BG,
        "editor.foreground": "#F8F8F2",
        "editor.lineHighlightBackground": "#3E3D32",
        "editor.lineHighlightBorder": "#3E3D32",
        "editorLineNumber.foreground": "#90908A",
        "editorLineNumber.activeForeground": "#C4C4B5",
        "editorCursor.foreground": "#F8F8F0",
        "editor.selectionBackground": "#49483E",
        "editorIndentGuide.background": "#49483E",
        "editorIndentGuide.activeBackground": "#75715E",
        "editorOverviewRuler.border": BORDER_COLOR,
        "scrollbarSlider.background": "#49483E80",
        "scrollbarSlider.hoverBackground": "#49483Ecc",
        "scrollbarSlider.activeBackground": "#75715Ecc",
      },
    });

    monacoRef.current.editor.setTheme("sublime-monokai");
  };

  const commonEditorOptions = {
    automaticLayout: true,
    fontFamily: '"Consolas", "Courier New", monospace',
    fontSize: 14,
    lineHeight: 21,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth" as const,
    renderLineHighlight: "all" as const,
    minimap: { enabled: false },
  };

  const mainEditorOptions = {
    ...commonEditorOptions,
    minimap: { enabled: true, renderCharacters: false, scale: 0.75 }, // Small minimap like Sublime
    matchBrackets: "always" as const,
    bracketPairColorization: { enabled: true },
    guides: { indentation: true },
  };

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragStateRef.current) return;

      if (dragStateRef.current.kind === "left-right" && workspaceRef.current) {
        const bounds = workspaceRef.current.getBoundingClientRect();
        const nextWidth = bounds.width - (event.clientX - bounds.left);
        setRightWidth(Math.max(MIN_RIGHT_WIDTH, Math.min(nextWidth, bounds.width - 300)));
      } else if (dragStateRef.current.kind === "input-output") {
        const delta = event.clientY - dragStateRef.current.startY!;
        setInputHeight(Math.max(100, dragStateRef.current.startInputHeight! + delta));
      }
    };

    const handleUp = () => {
      dragStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const runSimulation = () => {
    setIsCompiling(true);
    setOutputCode("Compiling...\n");
    
    // Simulate network/execution delay
    setTimeout(() => {
      setIsCompiling(false);
      setOutputCode("2\n7 2\n\n[Finished in 42ms]");
    }, 800);
  };

  const currentLangObj = LANGUAGE_OPTIONS.find(l => l.value === language);
  const activeFileName = `code.${currentLangObj?.extension || "cpp"}`;

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#1a1a1a] text-[#b0b0b0] font-sans selection:bg-[#49483E]">
      
      {/* Sublime Text Classic Menu Bar */}
      <header className="flex h-7 shrink-0 items-center justify-between px-3 text-[13px] border-b border-[#222] bg-[#1a1a1a]">
        <div className="flex items-center gap-4">
          <span className="hover:text-white cursor-default">File</span>
          <span className="hover:text-white cursor-default">Edit</span>
          <span className="hover:text-white cursor-default">Selection</span>
          <span className="hover:text-white cursor-default">Find</span>
          <span className="hover:text-white cursor-default">View</span>
          <span className="hover:text-white cursor-default">Goto</span>
          <span className="hover:text-white cursor-default">Tools</span>
          <span className="hover:text-white cursor-default">Project</span>
          <span className="hover:text-white cursor-default">Preferences</span>
          <span className="hover:text-white cursor-default">Help</span>
        </div>
        
        {/* Actions tucked away cleanly */}
        <div className="flex items-center gap-4 text-[12px]">
          <select 
            value={language}
            onChange={(e) => {
                const newLang = e.target.value as Language;
                setLanguage(newLang);
                setCode(DEFAULT_CODE[newLang]);
            }}
            className="bg-transparent outline-none hover:text-white cursor-pointer"
          >
            {LANGUAGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value} className="bg-[#1a1a1a]">{opt.label}</option>)}
          </select>
          <button 
            onClick={runSimulation} 
            disabled={isCompiling}
            className="text-[#A6E22E] hover:text-white font-medium"
          >
            {isCompiling ? "Building..." : "Build (Ctrl+B)"}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div ref={workspaceRef} className="flex min-h-0 flex-1 relative bg-[#1e1e1e]">
        
        {/* Left Pane (Code) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-[#111]">
          {/* Tab */}
          <div className="flex h-9 bg-[#1e1e1e] items-end px-2 gap-1 select-none">
            <div className="flex h-[32px] min-w-[120px] max-w-[200px] items-center justify-between bg-[#272822] px-3 text-[13px] text-[#e0e0e0] rounded-t-sm">
              <span>{activeFileName}</span>
              <span className="text-[14px] text-[#75715e] hover:text-[#f8f8f2] cursor-pointer ml-3">×</span>
            </div>
          </div>

          <div className="flex-1 bg-[#272822]">
            <MonacoEditor
              language={language}
              value={code}
              options={mainEditorOptions}
              onChange={(v) => setCode(v ?? "")}
              onMount={(editor, monaco) => {
                mainEditorRef.current = editor;
                monacoRef.current = monaco;
                createEditorTheme();
                editor.onDidChangeCursorPosition((e) => {
                  setCursorPosition(`Line ${e.position.lineNumber}, Column ${e.position.column}`);
                });
              }}
            />
          </div>
        </div>

        {/* Resizer Vertical */}
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            dragStateRef.current = { kind: "left-right", startX: e.clientX, startWidth: rightWidth };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="w-1.5 z-10 shrink-0 cursor-col-resize hover:bg-[#49483E] transition-colors"
        />

        {/* Right Pane (Input/Output Stack) */}
        <div className="flex min-h-0 flex-col bg-[#1e1e1e]" style={{ width: rightWidth }}>
          
          {/* Top Right: Input */}
          <div className="flex flex-col" style={{ height: inputHeight }}>
            <div className="flex h-9 bg-[#1e1e1e] items-end px-2 gap-1 select-none border-b border-[#272822]">
              <div className="flex h-[32px] min-w-[100px] items-center justify-between bg-[#272822] px-3 text-[13px] text-[#e0e0e0] rounded-t-sm">
                <span>input.in</span>
              </div>
            </div>
            <div className="flex-1 bg-[#272822]">
              <MonacoEditor
                language="plaintext"
                value={inputCode}
                options={commonEditorOptions}
                onChange={(v) => setInputCode(v ?? "")}
                onMount={() => createEditorTheme()}
              />
            </div>
          </div>

          {/* Resizer Horizontal */}
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              dragStateRef.current = { kind: "input-output", startY: e.clientY, startInputHeight: inputHeight };
              document.body.style.cursor = "row-resize";
              document.body.style.userSelect = "none";
            }}
            className="h-1.5 z-10 shrink-0 cursor-row-resize bg-[#1e1e1e] border-y border-[#111] hover:bg-[#49483E] transition-colors"
          />

          {/* Bottom Right: Output */}
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex h-9 bg-[#1e1e1e] items-end px-2 gap-1 select-none border-b border-[#272822]">
              <div className="flex h-[32px] min-w-[100px] items-center justify-between bg-[#272822] px-3 text-[13px] text-[#e0e0e0] rounded-t-sm">
                <span>output.in</span>
              </div>
            </div>
            <div className="flex-1 bg-[#272822]">
              <MonacoEditor
                language="plaintext"
                value={outputCode}
                options={{ ...commonEditorOptions, readOnly: true }}
                onMount={() => createEditorTheme()}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Classic Sublime Status Bar */}
      <footer className="flex h-6 shrink-0 items-center justify-between px-4 text-[12px] bg-[#1e1e1e] text-[#90908A] border-t border-[#111]">
        <div>{cursorPosition}</div>
        <div className="flex gap-6">
          <span>Spaces: 4</span>
          <span>{currentLangObj?.label || "C++"}</span>
        </div>
      </footer>
    </div>
  );
}