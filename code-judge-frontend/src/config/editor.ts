import type { editor } from "monaco-editor";

export const SUBLIME_BG = "#272822";
export const UI_BG = "#1e1e1e";
export const BORDER_COLOR = "#333333";

export const DEFAULT_RIGHT_WIDTH = 450;
export const MIN_RIGHT_WIDTH = 200;
export const DEFAULT_INPUT_HEIGHT = 250;
export const MIN_INPUT_HEIGHT = 100;

export const commonEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: false,
  fontFamily: '"Consolas", "Courier New", monospace',
  fontSize: 14,
  lineHeight: 21,
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  cursorBlinking: "smooth",
  renderLineHighlight: "all",
  minimap: { enabled: false },
};

export const mainEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  ...commonEditorOptions,
  minimap: { enabled: true, renderCharacters: false, scale: 0.75 },
  matchBrackets: "always",
  bracketPairColorization: { enabled: true },
  guides: { indentation: true },
};