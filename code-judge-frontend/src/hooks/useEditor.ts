"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragState, LanguageOption } from "@/types/editor";
import {
  LANGUAGE_OPTIONS as STATIC_LANG_OPTIONS,
  DEFAULT_CODE,
  DEFAULT_INPUT,
  DEFAULT_LANGUAGE_ID,
  getLanguageOptionById,
} from "@/constants/languages";
import { DEFAULT_RIGHT_WIDTH, MIN_RIGHT_WIDTH, DEFAULT_INPUT_HEIGHT, MIN_INPUT_HEIGHT } from "@/config/editor";
import { runCode as runCodeService, fetchAndMergeLanguages } from "@/services/editor";

export function useEditor() {
  const [languageId, setLanguageId] = useState<number>(DEFAULT_LANGUAGE_ID);
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>(STATIC_LANG_OPTIONS);
  const [code, setCode] = useState(DEFAULT_CODE.cpp);
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [output, setOutput] = useState("");
  const [cursorPosition, setCursorPosition] = useState("Line 1, Column 1");
  const [isCompiling, setIsCompiling] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [inputPanelHeight, setInputPanelHeight] = useState(DEFAULT_INPUT_HEIGHT);

  const monacoRef = useRef<any>(null);
  const mainEditorRef = useRef<any>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState>(null);

  // Fetch dynamic languages from Judge0 API on mount
  useEffect(() => {
    let mounted = true;
    fetchAndMergeLanguages().then((langs) => {
      console.log("Fetched and merged languages:", langs);
      if (mounted) setAvailableLanguages(langs);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleLanguageChange = useCallback((id: number) => {
    setLanguageId(id);
    const lang = getLanguageOptionById(id);
    if (lang) {
      setCode(DEFAULT_CODE[lang.monaco] || "");
    }
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    setCode(value);
  }, []);

  const handleCursorChange = useCallback((position: string) => {
    setCursorPosition(position);
  }, []);

  const runCode = useCallback(async () => {
    setIsCompiling(true);
    setOutput("Compiling...\n");

    try {
      const data = await runCodeService(code, input, languageId);
      console.log("Response:", data.stdout);
      setOutput(data.stdout || data.message || "Something went wrong.");
    } catch (error) {
      console.error("Error running code:", error);
      setOutput("Error: Failed to compile/run the code.");
    } finally {
      setIsCompiling(false);
    }
  }, [code, input, languageId]);

  // Pointer event handlers for drag resize
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragStateRef.current) return;

      if (dragStateRef.current.kind === "left-right" && workspaceRef.current) {
        const bounds = workspaceRef.current.getBoundingClientRect();
        const nextWidth = bounds.width - (event.clientX - bounds.left);
        setRightPanelWidth(Math.max(MIN_RIGHT_WIDTH, Math.min(nextWidth, bounds.width - 300)));
      } else if (dragStateRef.current.kind === "input-output") {
        const delta = event.clientY - dragStateRef.current.startY!;
        setInputPanelHeight(Math.max(MIN_INPUT_HEIGHT, dragStateRef.current.startInputHeight! + delta));
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

  const currentLangObj = availableLanguages.find((l) => l.value === languageId)
    ?? getLanguageOptionById(languageId);
  const monacoLanguage = currentLangObj?.monaco || "cpp";
  const activeFileName = `code.${currentLangObj?.extension || "cpp"}`;

  return {
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
    setLanguageId,
    setCode,
    setInput,
    setOutput,
    setCursorPosition,
    setIsCompiling,
    setRightPanelWidth,
    setInputPanelHeight,
    handleLanguageChange,
    handleCodeChange,
    handleCursorChange,
    runCode,
  };
}