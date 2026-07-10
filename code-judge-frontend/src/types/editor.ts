export interface Judge0Language {
  id: number;
  name: string;
}

export interface LanguageOption {
  value: number;       // Judge0 language id
  label: string;       // Display name
  monaco: string;      // Monaco editor language identifier
  extension: string;   // File extension
  judge0Name: string;  // Name as returned by Judge0 /languages API
}

export interface EditorState {
  languageId: number;
  code: string;
  input: string;
  output: string;
  cursorPosition: string;
  isCompiling: boolean;
  rightPanelWidth: number;
  inputPanelHeight: number;
}

export interface EditorTheme {
  bg: string;
  uiBg: string;
  borderColor: string;
}

export type DragState = {
  kind: "left-right" | "input-output";
  startX?: number;
  startY?: number;
  startWidth?: number;
  startInputHeight?: number;
} | null;