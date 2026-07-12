"use client";

import { useCallback, useMemo } from "react";
import { mainEditorOptions } from "@/config/editor";
import { useEditor } from "@/hooks/useEditor";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import EditorHeader from "./EditorHeader";
import EditorToolbar from "./EditorToolbar";
import MonacoEditorWrapper from "./MonacoEditor";
import ConsolePanel from "./ConsolePanel";
import EditorFooter from "./EditorFooter";

export default function CodeEditor() {
  const {
    languageId,
    code,
    input,
    output,
    cursorPosition,
    isCompiling,
    rightPanelWidth,
    inputPanelHeight,
    monacoRef,
    mainEditorRef,
    workspaceRef,
    dragStateRef,
    currentLangObj,
    monacoLanguage,
    activeFileName,
    availableLanguages,
    handleLanguageChange,
    handleCodeChange,
    handleCursorChange,
    setInput,
    runCode,
  } = useEditor();

  // Initialize autocomplete hook - passes refs to detect when editor/monaco are available
  // The hook internally uses polling to detect when refs are set
  useAutocomplete({
    monacoRef: monacoRef,
    editorRef: mainEditorRef,
    languageId: monacoLanguage,
  });

  // Keep the onMount callback stable - only depends on stable refs
  const handleEditorMount = useCallback(
    (editor: any, monaco: any) => {
      mainEditorRef.current = editor;
      monacoRef.current = monaco;

      // Subscribe to cursor position changes
      editor.onDidChangeCursorPosition((e: any) => {
        handleCursorChange(
          `Line ${e.position.lineNumber}, Column ${e.position.column}`
        );
      });
    },
    [mainEditorRef, monacoRef, handleCursorChange],
  );

  const handleCodeChangeCallback = useCallback(
    (value: string) => {
      handleCodeChange(value);
    },
    [handleCodeChange],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
    },
    [setInput],
  );

  // Memoize options to avoid recreating on every render
  const editorOptions = useMemo(() => mainEditorOptions, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#1a1a1a] text-[#b0b0b0] font-sans selection:bg-[#49483E]">
      <EditorHeader
        languageId={languageId}
        options={availableLanguages}
        onLanguageChange={handleLanguageChange}
        onRun={runCode}
        isCompiling={isCompiling}
      />

      {/* Main Workspace */}
      <div ref={workspaceRef} className="flex min-h-0 flex-1 relative bg-[#1e1e1e]">
        {/* Left Pane (Code) */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col border-r border-[#111]">
          <EditorToolbar fileName={activeFileName} />

          <div className="flex-1 bg-[#272822]">
            <MonacoEditorWrapper
              language={monacoLanguage}
              value={code}
              options={editorOptions}
              onChange={handleCodeChangeCallback}
              onMount={handleEditorMount}
            />
          </div>
        </div>

        {/* Resizer Vertical */}
        <div
          onPointerDown={(e) => {
            e.preventDefault();
            dragStateRef.current = {
              kind: "left-right",
              startX: e.clientX,
              startWidth: rightPanelWidth,
            };
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="w-1.5 z-10 shrink-0 cursor-col-resize hover:bg-[#49483E] transition-colors"
        />

        {/* Right Pane (Input/Output Stack) */}
        <ConsolePanel
          input={input}
          output={output}
          onInputChange={handleInputChange}
          inputHeight={inputPanelHeight}
          rightPanelWidth={rightPanelWidth}
          dragStateRef={dragStateRef}
        />
      </div>

      <EditorFooter
        cursorPosition={cursorPosition}
        languageLabel={currentLangObj?.label || "C++"}
      />
    </div>
  );
}