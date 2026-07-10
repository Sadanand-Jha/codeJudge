"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import type { editor } from "monaco-editor";
import { SUBLIME_BG, BORDER_COLOR } from "@/config/editor";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#272822]" />,
});

interface MonacoEditorWrapperProps {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: any) => void;
  options?: editor.IStandaloneEditorConstructionOptions;
  theme?: string;
}

export default function MonacoEditorWrapper({
  language,
  value,
  onChange,
  onMount,
  options,
}: MonacoEditorWrapperProps) {
  const monacoRef = useRef<any>(null);

  const createEditorTheme = useCallback((monaco: any) => {
    monaco.editor.defineTheme("sublime-monokai", {
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

    monaco.editor.setTheme("sublime-monokai");
  }, []);

  const handleMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: any) => {
      monacoRef.current = monaco;
      createEditorTheme(monaco);
      onMount?.(editor, monaco);
    },
    [createEditorTheme, onMount]
  );

  useEffect(() => {
    return () => {
      monacoRef.current = null;
    };
  }, []);

  return (
    <MonacoEditor
      language={language}
      value={value}
      options={options}
      onChange={(v) => onChange?.(v ?? "")}
      onMount={handleMount}
    />
  );
}