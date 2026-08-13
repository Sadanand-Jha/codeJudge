"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
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

interface MonacoEditorWrapperProps {
  language: string;
  value: string;
  onChange?: (value: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: any) => void;
  options?: editor.IStandaloneEditorConstructionOptions;
  theme?: string;
}

// PERFORMANCE OPTIMIZATION: Memoize the theme creation function with empty deps
// Theme is created once and reused
const themeCreatedRef = { current: false };

export default function MonacoEditorWrapper({
  language,
  value,
  onChange,
  onMount,
  options,
  theme,
}: MonacoEditorWrapperProps) {
  const { theme: appTheme } = useTheme();
  const isLight = appTheme === "light";
  const editorTheme = theme ?? (isLight ? "vs" : "sublime-monokai");
  const lineHeight =
    options?.lineHeight ?? Math.round((options?.fontSize ?? 14) * 1.5);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const onMountCallbackRef = useRef(onMount);

  // Keep the onMount callback ref up to date without causing re-renders
  useEffect(() => {
    onMountCallbackRef.current = onMount;
  }, [onMount]);

  const createEditorTheme = useCallback((monaco: any) => {
    // Only create theme once
    if (themeCreatedRef.current) return;
    themeCreatedRef.current = true;

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
  }, []);

  const handleMount = useCallback(
    (editorInstance: editor.IStandaloneCodeEditor, monaco: any) => {
      editorRef.current = editorInstance;
      createEditorTheme(monaco);
      onMountCallbackRef.current?.(editorInstance, monaco);
    },
    [createEditorTheme],
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
        value={value}
        theme={editorTheme}
        options={{
          ...options,
          // Explicitly disable automaticLayout since we use ResizeObserver
          automaticLayout: false,
        }}
        onChange={(v) => onChange?.(v ?? "")}
        onMount={handleMount}
      />
    </div>
  );
}