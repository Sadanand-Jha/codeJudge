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

  // Ref-based tracking for values that change during drag (avoid stale closures)
  // These refs are updated immediately during drag, and only sync to state when drag ends
  const rightPanelWidthRef = useRef(DEFAULT_RIGHT_WIDTH);
  const inputPanelHeightRef = useRef(DEFAULT_INPUT_HEIGHT);
  const pendingStateUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch dynamic languages from Judge0 API on mount
  useEffect(() => {
    let mounted = true;
    fetchAndMergeLanguages().then((langs) => {
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
      setOutput(data.stdout || data.message || "Something went wrong.");
    } catch (error) {
      console.error("Error running code:", error);
      setOutput("Error: Failed to compile/run the code.");
    } finally {
      setIsCompiling(false);
    }
  }, [code, input, languageId]);

  // High-performance drag resize handlers using RAF + throttled state updates
  useEffect(() => {
    let rafId: number | null = null;
    let lastUpdate = 0;
    const UPDATE_INTERVAL = 1000 / 60; // 60 FPS throttle

    const handleMove = (event: PointerEvent) => {
      if (!dragStateRef.current) return;

      // Cancel previous RAF to coalesce events
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        rafId = null;
        const state = dragStateRef.current;
        if (!state) return;

        if (state.kind === "left-right" && workspaceRef.current) {
          const bounds = workspaceRef.current.getBoundingClientRect();
          const nextWidth = bounds.width - (event.clientX - bounds.left);
          const clamped = Math.max(MIN_RIGHT_WIDTH, Math.min(nextWidth, bounds.width - 300));
          rightPanelWidthRef.current = clamped;
          
          // Throttle state updates to 60 FPS to avoid excessive re-renders
          const now = performance.now();
          if (now - lastUpdate >= UPDATE_INTERVAL || pendingStateUpdateRef.current === null) {
            lastUpdate = now;
            setRightPanelWidth(clamped);
          } else {
            // Use RAF to batch the pending update
            if (pendingStateUpdateRef.current) {
              clearTimeout(pendingStateUpdateRef.current);
            }
            pendingStateUpdateRef.current = setTimeout(() => {
              setRightPanelWidth(rightPanelWidthRef.current);
              pendingStateUpdateRef.current = null;
            }, UPDATE_INTERVAL);
          }
        } else if (state.kind === "input-output") {
          const delta = event.clientY - state.startY!;
          const clamped = Math.max(MIN_INPUT_HEIGHT, state.startInputHeight! + delta);
          inputPanelHeightRef.current = clamped;
          
          // Throttle state updates to 60 FPS
          const now = performance.now();
          if (now - lastUpdate >= UPDATE_INTERVAL || pendingStateUpdateRef.current === null) {
            lastUpdate = now;
            setInputPanelHeight(clamped);
          } else {
            if (pendingStateUpdateRef.current) {
              clearTimeout(pendingStateUpdateRef.current);
            }
            pendingStateUpdateRef.current = setTimeout(() => {
              setInputPanelHeight(inputPanelHeightRef.current);
              pendingStateUpdateRef.current = null;
            }, UPDATE_INTERVAL);
          }
        }
      });
    };

    const handleUp = () => {
      // Flush final state update on drag end
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (pendingStateUpdateRef.current !== null) {
        clearTimeout(pendingStateUpdateRef.current);
        pendingStateUpdateRef.current = null;
      }
      
      // Commit final values to state (in case last RAF update was skipped)
      setRightPanelWidth(rightPanelWidthRef.current);
      setInputPanelHeight(inputPanelHeightRef.current);
      
      dragStateRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    window.addEventListener("pointerup", handleUp);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (pendingStateUpdateRef.current !== null) {
        clearTimeout(pendingStateUpdateRef.current);
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, []);

  const currentLangObj = availableLanguages.find((l) => l.value === languageId)
    ?? getLanguageOptionById(languageId);
  const monacoLanguage = currentLangObj?.monaco || "cpp";
  const activeFileName = `code.${currentLangObj?.extension || "cpp"}`;

  // Sync refs with state for external access (runs after state changes)
  useEffect(() => {
    rightPanelWidthRef.current = rightPanelWidth;
  }, [rightPanelWidth]);

  useEffect(() => {
    inputPanelHeightRef.current = inputPanelHeight;
  }, [inputPanelHeight]);

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