"use client";

import { create } from "zustand";

export interface CodeSelectionRange {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/**
 * Context describing the current file that the AI should receive as hidden
 * background context (never rendered in the chat UI, like Copilot's current
 * file). `selection` is included only when text is selected in the editor.
 */
export interface CodeContext {
  type: "current_file";
  language: string;
  filename: string;
  content: string;
  /** Selected text, when the user highlighted a region. */
  selection?: string;
  /** The Monaco selection range, when present, so the AI can target it. */
  selectionRange?: CodeSelectionRange;
}

/**
 * A request to ask the AI about the current code.
 *
 * `prompt` is optional: when omitted, the AI panel uses whatever the user has
 * already typed, falling back to a sensible default.
 */
export interface AskCodeRequest {
  context: CodeContext;
}

interface CodeAssistantState {
  /** Whether the AI assistant panel is open. */
  open: boolean;
  /** A pending "ask about code" request, or null. */
  request: AskCodeRequest | null;
  /** Whether the AI is actively generating/editing (drives the scan overlay). */
  preparing: boolean;
  setOpen: (open: boolean) => void;
  requestAsk: (request: AskCodeRequest) => void;
  setPreparing: (preparing: boolean) => void;
  /** Returns and clears the pending request. */
  consumeRequest: () => AskCodeRequest | null;
}

/**
 * Coordinates the "Ask AI about this code" feature between the code editor on
 * the /editor page and the AI assistant panel. The panel is mounted by
 * CodeEditor; the editor triggers a request here, which both opens the panel
 * and hands it the hidden file context.
 */
export const useAIEditorStore = create<CodeAssistantState>((set, get) => ({
  open: false,
  request: null,
  preparing: false,
  setOpen: (open) => set({ open }),
  requestAsk: (request) => set({ request, open: true }),
  setPreparing: (preparing) => set({ preparing }),
  consumeRequest: () => {
    const request = get().request;
    set({ request: null });
    return request;
  },
}));

/** Default prompt used when the user asks about the code without typing one. */
export const DEFAULT_ASK_PROMPT =
  "Analyze the current file: explain what it does, identify any issues, and suggest concrete improvements.";
