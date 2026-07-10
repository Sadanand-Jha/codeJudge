"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LanguageOption } from "@/types/editor";

interface EditorContextValue {
  languageId: number;
  code: string;
  input: string;
  output: string;
  cursorPosition: string;
  isCompiling: boolean;
  rightPanelWidth: number;
  inputPanelHeight: number;
  setLanguageId: (id: number) => void;
  setCode: (code: string) => void;
  setInput: (input: string) => void;
  setOutput: (output: string) => void;
  setCursorPosition: (pos: string) => void;
  setIsCompiling: (compiling: boolean) => void;
  setRightPanelWidth: (width: number) => void;
  setInputPanelHeight: (height: number) => void;
  runCode: () => Promise<void>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error("useEditorContext must be used within an EditorProvider");
  }
  return ctx;
}

interface EditorProviderProps {
  value: EditorContextValue;
  children: ReactNode;
}

export function EditorProvider({ value, children }: EditorProviderProps) {
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
}