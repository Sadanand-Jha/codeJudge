"use client";

import dynamic from "next/dynamic";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { CSSProperties } from "react";
import type { editor } from "monaco-editor";
import { SUBLIME_BG, BORDER_COLOR } from "@/config/editor";
import { useTheme } from "@/context/ThemeContext";

/**
 * Monaco is served from a same-origin static build (`public/monaco/vs`)
 * instead of the default remote CDN (https://cdn.jsdelivr.net/...).
 *
 * The default CDN load races against client-side navigation: on a cold cache
 * or a slow/blocked CDN, Monaco never finishes initializing and the editor
 * stays a black/blank screen until a full page reload (F5) warms the cache.
 *
 * Configuring the loader to use the locally-copied `min/vs` build makes
 * initialization deterministic on the first visit and during client-side
 * navigation, and loads Monaco's web workers from the same origin.
 *
 * This factory only runs on the client (ssr: false), and the loader is
 * configured BEFORE the Editor component mounts, so there is no race between
 * the Editor's internal `loader.init()` and our config.
 */
const MonacoEditor = dynamic(
  async () => {
    const { default: Editor, loader } = await import("@monaco-editor/react");
    loader.config({ paths: { vs: "/monaco/vs" } });
    return Editor;
  },
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-white dark:bg-[#272822]" />,
  },
);

export interface MonacoEditorWrapperHandle {
  getValue: () => string;
  setValue: (code: string) => void;
  setLanguage: (language: string) => void;
  getEditor: () => editor.IStandaloneCodeEditor | null;
  getMonaco: () => typeof import("monaco-editor") | null;
}

interface MonacoEditorWrapperProps {
  language: string;
  defaultValue?: string;
  onMount?: (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof import("monaco-editor"),
  ) => void;
  options?: editor.IStandaloneEditorConstructionOptions;
  theme?: string;
}

type ThemeData = {
  base: "vs" | "vs-dark" | "hc-black" | "hc-light";
  inherit: boolean;
  rules: Array<{ token: string; foreground?: string; fontStyle?: string }>;
  colors: Record<string, string>;
};

// PERFORMANCE OPTIMIZATION: Themes are defined once and reused across every
// editor instance. Each theme name is tracked so later mounts skip redefining.
const createdThemesRef = { current: new Set<string>() };

// Module-scope tracker for the MAIN editor's theme. Monaco's theme is global
// and this build has no `editor.getTheme()` to read it back, so every editor
// instance records which theme it applied. The review overlay uses this to
// restore the base theme when it unmounts.
let activeBaseTheme = "vs";

const MonacoEditorWrapper = forwardRef<
  MonacoEditorWrapperHandle,
  MonacoEditorWrapperProps
>(function MonacoEditorWrapper(
  { language, defaultValue, onMount, options, theme },
  ref,
) {
  const { theme: appTheme } = useTheme();
  const isLight = appTheme === "light";
  const editorTheme = theme ?? (isLight ? "vs" : "sublime-monokai");
  const lineHeight =
    options?.lineHeight ?? Math.round((options?.fontSize ?? 14) * 1.5);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onMountCallbackRef = useRef(onMount);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const themeAppliedRef = useRef<string>("");

  // Keep the onMount callback ref up to date without causing re-renders
  useEffect(() => {
    onMountCallbackRef.current = onMount;
  }, [onMount]);

  const defineThemeOnce = useCallback(
    (monaco: typeof import("monaco-editor"), name: string, data: ThemeData) => {
      if (createdThemesRef.current.has(name)) return;
      createdThemesRef.current.add(name);
      monaco.editor.defineTheme(name, data);
    },
    [],
  );

  const createEditorTheme = useCallback(
    (monaco: typeof import("monaco-editor")) => {
      defineThemeOnce(monaco, "sublime-monokai", {
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

      // Full color scheme for the review overlay: comments, keywords, strings,
      // types, operators and identifiers (function/variable names) each get a
      // distinct color, plus a separate editor background so it reads as a
      // dedicated review surface.
      defineThemeOnce(monaco, "review-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6A9955", fontStyle: "italic" },
          { token: "comment.doc", foreground: "6A9955", fontStyle: "italic" },
          { token: "string", foreground: "CE9178" },
          { token: "string.escape", foreground: "D7BA7D" },
          { token: "number", foreground: "B5CEA8" },
          { token: "keyword", foreground: "C586C0" },
          { token: "keyword.control", foreground: "C586C0", fontStyle: "bold" },
          { token: "keyword.directive", foreground: "C586C0" },
          { token: "keyword.directive.include", foreground: "C586C0" },
          { token: "type", foreground: "4EC9B0" },
          { token: "type.identifier", foreground: "4EC9B0" },
          { token: "function", foreground: "DCDCAA" },
          { token: "identifier", foreground: "9CDCFE" },
          { token: "constant", foreground: "569CD6" },
          { token: "operator", foreground: "D4D4D4" },
          { token: "delimiter", foreground: "D4D4D4" },
          { token: "annotation", foreground: "C586C0" },
          { token: "macro", foreground: "DCDCAA" },
        ],
        colors: {
          "editor.background": "#1E1E2E",
          "editor.foreground": "#CDD6F4",
          "editor.lineHighlightBackground": "#31324455",
          "editor.lineHighlightBorder": "#31324455",
          "editorLineNumber.foreground": "#585B70",
          "editorLineNumber.activeForeground": "#CDD6F4",
          "editorCursor.foreground": "#F5E0DC",
          "editor.selectionBackground": "#585B7099",
          "editor.inactiveSelectionBackground": "#585B7044",
          "editorIndentGuide.background": "#313244",
          "editorIndentGuide.activeBackground": "#585B70",
          "editorWhitespace.foreground": "#585B70",
          "editorOverviewRuler.border": "#11111B",
          "scrollbarSlider.background": "#585B7077",
          "scrollbarSlider.hoverBackground": "#6C708699",
          "scrollbarSlider.activeBackground": "#89B4FA99",
        },
      });

      // Light variant of the review surface. Reads as a modern light IDE:
      // near-white neutral background, clear line numbers, muted-but-vivid
      // syntax colors (lavender keywords, green strings, amber numbers).
      defineThemeOnce(monaco, "review-light", {
        base: "vs",
        inherit: true,
        rules: [
          { token: "comment", foreground: "6B7280", fontStyle: "italic" },
          { token: "comment.doc", foreground: "6B7280", fontStyle: "italic" },
          { token: "string", foreground: "15803D" },
          { token: "string.escape", foreground: "B45309" },
          { token: "number", foreground: "B45309" },
          { token: "keyword", foreground: "7C3AED" },
          { token: "keyword.control", foreground: "7C3AED", fontStyle: "bold" },
          { token: "keyword.directive", foreground: "7C3AED" },
          { token: "keyword.directive.include", foreground: "7C3AED" },
          { token: "type", foreground: "0E7490", fontStyle: "italic" },
          { token: "type.identifier", foreground: "0E7490", fontStyle: "italic" },
          { token: "function", foreground: "1D4ED8" },
          { token: "identifier", foreground: "1F2937" },
          { token: "constant", foreground: "B45309" },
          { token: "operator", foreground: "374151" },
          { token: "delimiter", foreground: "374151" },
          { token: "annotation", foreground: "7C3AED" },
          { token: "macro", foreground: "7C3AED" },
        ],
        colors: {
          "editor.background": "#F8F8FA",
          "editor.foreground": "#1F2937",
          "editor.lineHighlightBackground": "#EEEDF4",
          "editor.lineHighlightBorder": "#EEEDF4",
          "editorLineNumber.foreground": "#9CA3AF",
          "editorLineNumber.activeForeground": "#6B7280",
          "editorCursor.foreground": "#7C3AED",
          "editor.selectionBackground": "#7C3AED2E",
          "editor.inactiveSelectionBackground": "#7C3AED14",
          "editorIndentGuide.background": "#E7E5EE",
          "editorIndentGuide.activeBackground": "#C9C5D8",
          "editorWhitespace.foreground": "#D6D3E1",
          "editorOverviewRuler.border": "#E5E1EA",
          "scrollbarSlider.background": "#9CA3AF66",
          "scrollbarSlider.hoverBackground": "#9CA3AFAA",
          "scrollbarSlider.activeBackground": "#7C3AED99",
          "editorGutter.background": "#F8F8FA",
        },
      });
    },
    [defineThemeOnce],
  );

  const handleMount = useCallback(
    (
      editorInstance: editor.IStandaloneCodeEditor,
      monaco: typeof import("monaco-editor"),
    ) => {
      editorRef.current = editorInstance;
      monacoRef.current = monaco;
      createEditorTheme(monaco);
      // Monaco's theme is global and `@monaco-editor/react` calls setTheme
      // before our onMount runs, so force-apply here after defineTheme so the
      // custom colors actually take effect.
      if (!theme) activeBaseTheme = editorTheme;
      themeAppliedRef.current = editorTheme;
      monaco.editor.setTheme(editorTheme);
      onMountCallbackRef.current?.(editorInstance, monaco);
    },
    [createEditorTheme, editorTheme, theme],
  );

  // Dynamic language: update the existing model's language in place instead of
  // recreating the editor or swapping its value, so cursor/undo state survives.
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (model && model.getLanguageId() !== language) {
      monaco.editor.setModelLanguage(model, language);
    }
  }, [language]);

  // Dynamic theme: Monaco's theme is global, so switch it in place without
  // recreating the editor instance.
  useEffect(() => {
    if (!theme) activeBaseTheme = editorTheme;
    const monaco = monacoRef.current;
    if (monaco && themeAppliedRef.current !== editorTheme) {
      monaco.editor.setTheme(editorTheme);
      themeAppliedRef.current = editorTheme;
    }
  }, [editorTheme, theme]);

  // Imperative API: consumers only interact with the editor on explicit
  // actions (Run/Submit/Save/AI apply). No React state is synced per keystroke.
  useImperativeHandle(
    ref,
    () => ({
      getValue: () => editorRef.current?.getModel?.()?.getValue?.() ?? "",
      setValue: (value: string) => {
        const editor = editorRef.current;
        const model = editor?.getModel?.();
        if (!model || model.getValue() === value) return;
        model.setValue(value);
      },
      setLanguage: (lang: string) => {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const model = editor?.getModel?.();
        if (!model || !monaco || model.getLanguageId() === lang) return;
        monaco.editor.setModelLanguage(model, lang);
      },
      getEditor: () => editorRef.current,
      getMonaco: () => monacoRef.current,
    }),
    [],
  );

  // ResizeObserver to replace automaticLayout polling - layout() only called on actual resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let previousWidth = 0;
    let previousHeight = 0;
    let pendingLayout = false;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === previousWidth && height === previousHeight) return;
        previousWidth = width;
        previousHeight = height;

        if (!pendingLayout) {
          pendingLayout = true;
          rafRef.current = requestAnimationFrame(() => {
            if (editorRef.current) {
              editorRef.current.layout(undefined, false);
            }
            pendingLayout = false;
            rafRef.current = null;
          });
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Retry layout multiple times on mount to handle restored localStorage panel sizes
  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const delays = [0, 100, 300, 600, 1000];
    for (let i = 0; i < delays.length; i++) {
      const timer = setTimeout(() => {
        if (cancelled) return;
        if (editorRef.current && typeof editorRef.current.layout === "function") {
          editorRef.current.layout(undefined, false);
        }
      }, delays[i]);
      timers.push(timer);
    }
    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Keep the active base theme (main editor) in sync, since the library itself
  // applies light/dark theme switches and there's no getTheme() to read it.
  useEffect(() => {
    if (!theme) activeBaseTheme = editorTheme;
  }, [editorTheme, theme]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const editor = editorRef.current;
      if (editor) {
        // Dispose the editor model to prevent memory leaks
        const model = editor.getModel();
        if (model) {
          model.dispose();
        }
        editor.dispose();
        editorRef.current = null;
      }
      // Monaco's theme is global: when a non-base editor (e.g. the review
      // overlay) unmounts, put the main editor's theme back so it isn't left
      // stuck on the overlay's colors.
      if (monacoRef.current && activeBaseTheme !== themeAppliedRef.current) {
        monacoRef.current.editor.setTheme(activeBaseTheme);
      }
      monacoRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      data-monaco-theme={isLight ? "light" : "dark"}
      style={{ "--monaco-line-height": `${lineHeight}px` } as CSSProperties}
    >
      <MonacoEditor
        language={language}
        defaultValue={defaultValue ?? ""}
        theme={editorTheme}
        options={{
          ...options,
          // Explicitly disable automaticLayout since we use ResizeObserver
          automaticLayout: false,
        }}
        onMount={handleMount}
      />
    </div>
  );
});

export default MonacoEditorWrapper;