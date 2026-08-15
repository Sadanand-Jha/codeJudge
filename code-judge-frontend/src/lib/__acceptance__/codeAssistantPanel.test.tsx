// ── jsdom globals BEFORE any React import ───────────────────────────────
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
const { window } = dom;

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

const g = globalThis as unknown as Record<string, unknown>;
g.window = window;
g.document = window.document;
try {
  Object.defineProperty(g, "navigator", {
    value: { userAgent: "node", language: "en" },
    configurable: true,
  });
} catch {
  g.navigator = { userAgent: "node", language: "en" };
}
g.HTMLElement = window.HTMLElement;
g.SVGElement = window.SVGElement;
g.Element = window.Element;
g.MouseEvent = window.MouseEvent;
g.Node = window.Node;
g.MutationObserver = window.MutationObserver;
g.getComputedStyle = window.getComputedStyle;
g.requestAnimationFrame = (cb: FrameRequestCallback) =>
  setTimeout(() => cb(Date.now()), 0) as unknown as number;
g.cancelAnimationFrame = (id: number) => clearTimeout(id);
if (typeof window.Element !== "undefined" && !window.Element.prototype.scrollIntoView) {
  window.Element.prototype.scrollIntoView = () => {};
}
// jsdom lacks the legacy attachEvent/detachEvent APIs that React 19's
// change-event polyfill calls on focusin/focusout — stub them to silence it.
if (typeof window.Element !== "undefined") {
  const proto = window.Element.prototype as unknown as Record<string, unknown>;
  if (typeof proto.attachEvent !== "function") proto.attachEvent = () => {};
  if (typeof proto.detachEvent !== "function") proto.detachEvent = () => {};
}
// Monaco (loaded lazily by the review overlay) uses matchMedia for the layout.
if (typeof window.matchMedia !== "function") {
  g.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
  window.matchMedia = g.matchMedia as typeof window.matchMedia;
}
// Monaco's editor host observes size changes with ResizeObserver.
if (typeof g.ResizeObserver !== "function") {
  const RO = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  g.ResizeObserver = RO;
  window.ResizeObserver = RO;
}
// framer-motion v12 drives transform/opacity through the Web Animations API,
// which jsdom doesn't implement. Without it, AnimatePresence exit animations
// never complete and the review overlay never unmounts.
if (typeof window.Element !== "undefined" && typeof window.Element.prototype.animate !== "function") {
  window.Element.prototype.animate = function (this: Element) {
    return {
      cancel: () => {},
      finish: () => {},
      pause: () => {},
      play: () => {},
      reverse: () => {},
      commitStyles: () => {},
      currentTime: 0,
      finished: Promise.resolve(),
      ready: Promise.resolve(),
      effect: null,
      onfinish: null,
      oncancel: null,
      playbackRate: 1,
      playState: "finished",
      startTime: 0,
      updatePlaybackRate: () => {},
    } as unknown as Animation;
  };
}
g.IS_REACT_ACT_ENVIRONMENT = true;

// ── dependencies factotem ───────────────────────────────────────────────
import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

// ── mock the AI service by stubbing fetch with a fake SSE body ──────────
import { useAIEditorStore } from "@/store/aiEditorStore";
import { useCodeAssistantStore } from "@/store/codeAssistantStore";

/** The minimal request payload the panel now sends to `/ai/chat`. */
interface ChatRequest {
  message?: string;
  mode?: string;
  problemId?: string;
  code?: string;
  language?: string;
  filename?: string;
  selection?: string;
  selectionRange?: unknown;
  conversationId?: string;
}

/** Build-mode reply: explanation prose + the COMPLETE updated file (last fenced block). */
const COMPLETE_FILE_REPLY =
  "Add a variable.\n\n```cpp\nlet x = 1;\nlet y = 2;\n```";

/** Build-mode reply where the complete file changes two separate lines. */
const COMPLETE_FILE_REPLY_MULTI =
  "Replace two lines.\n\n```cpp\nline1\nline2new\nline3\nline4new\n```";

/** Emit SSE payloads as a fake `fetch` Response for `streamChat`. */
function stubAiWithContent(
  content: string,
  onRequest?: (req: ChatRequest) => void
) {
  const sse = [
    `data: ${JSON.stringify({ type: "content", chunk: content })}\n`,
    `data: ${JSON.stringify({ type: "done" })}\n`,
  ];
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of sse) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: unknown, init?: unknown) => {
    const body = typeof init === "object" && init && "body" in init
      ? (init as { body: unknown }).body
      : "";
    let parsed: ChatRequest = {};
    try {
      parsed = JSON.parse(typeof body === "string" ? body : "{}");
    } catch {
      parsed = {};
    }
    onRequest?.(parsed);
    return {
      ok: true,
      status: 200,
      body: stream,
      json: async () => ({}),
    } as unknown as Response;
  }) as typeof fetch;
  return () => {
    globalThis.fetch = originalFetch;
  };
}

interface MockModel {
  text: string;
  version: number;
}

function makeMockModel(text: string): MockModel {
  return { text, version: 1 };
}

function makeEditor(model: MockModel) {
  const widgets: unknown[] = [];
  const decorations: string[] = [];
  const editor: Record<string, unknown> = {
    widgets,
    decorations,
    getModel: () => ({
      getValue: () => model.text,
      getLineCount: () => model.text.split("\n").length,
      getLineContent: (i: number) => model.text.split("\n")[i - 1] ?? "",
      getLineMaxColumn: (i: number) =>
        (model.text.split("\n")[i - 1] ?? "").length + 1,
      getVersionId: () => model.version,
      pushStackElement: () => {},
    }),
    getPosition: () => ({ lineNumber: 1, column: 1 }),
    getSelection: () => ({ isEmpty: () => true }),
    deltaDecorations: (oldIds: string[], newDecs: unknown[]) => {
      for (const o of oldIds) {
        const i = decorations.indexOf(o);
        if (i !== -1) decorations.splice(i, 1);
      }
      const ids = newDecs.map((_, i) => `dec-${i}-${Math.random()}`);
      decorations.push(...ids);
      return ids;
    },
    addContentWidget: (w: unknown) => widgets.push(w),
    removeContentWidget: (w: unknown) => {
      const i = widgets.indexOf(w);
      if (i !== -1) widgets.splice(i, 1);
    },
    executeEdits: (
      _source: string,
      ranges: { range: unknown; text: string }[]
    ) => {
      for (const r of ranges) {
        const ran = r.range as {
          startLineNumber: number;
          startColumn: number;
          endLineNumber: number;
          endColumn: number;
        };
        const lines = model.text.split("\n");
        const startOff =
          lines.slice(0, ran.startLineNumber - 1).join("\n").length +
          (ran.startLineNumber > 1 ? 1 : 0) +
          (ran.startColumn - 1);
        const endOff =
          lines.slice(0, ran.endLineNumber - 1).join("\n").length +
          (ran.endLineNumber > 1 ? 1 : 0) +
          (ran.endColumn - 1);
        model.text = model.text.slice(0, startOff) + r.text + model.text.slice(endOff);
        model.version++;
      }
      return null;
    },
    setPosition: () => {},
    focus: () => {},
    addCommand: () => 1,
    removeCommand: () => {},
    layout: () => {},
  };
  return editor as any;
}

const monacoMock = {
  Range: class {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    constructor(sl: number, sc: number, el: number, ec: number) {
      this.startLineNumber = sl;
      this.startColumn = sc;
      this.endLineNumber = el;
      this.endColumn = ec;
    }
  },
  KeyMod: { Alt: 1 },
  KeyCode: { BracketLeft: 2, BracketRight: 3 },
};

// counter for distinct ids between tests
let idSeq = 0;

function resetStore() {
  useAIEditorStore.setState({
    open: false,
    request: null,
    preparing: false,
  });
  useCodeAssistantStore.setState({
    conversationId: `conv-test-${++idSeq}`,
    messages: [],
  });
}

// Track mounted roots so failing tests still clean up the DOM.
const mountedRoots: { root: Root; container: HTMLDivElement }[] = [];
async function unmountAll() {
  await act(async () => {
    for (const { root, container } of mountedRoots.splice(0)) {
      root.unmount();
      container.remove();
    }
  });
}

// Sequential harness (React's act() forbids overlapping calls, so tests must
// run one at a time and await each other).
const results: { name: string; ok: boolean; detail?: string }[] = [];
const queue: { name: string; fn: () => void | Promise<void> }[] = [];
function test(name: string, fn: () => void | Promise<void>) {
  queue.push({ name, fn });
}

async function passed() {
  for (const { name, fn } of queue) {
    const rec = { name, ok: false, detail: "" };
    results.push(rec);
    try {
      await fn();
      rec.ok = true;
      console.log(`✓ ${name}`);
    } catch (e) {
      rec.detail = e instanceof Error ? e.message : String(e);
      console.log(`✗ ${name}\n    ${rec.detail}`);
    }
    await unmountAll();
  }
  const bad = results.filter((r) => !r.ok);
  const ok = results.length - bad.length;
  console.log(`\n${ok} passed, ${bad.length} failed.`);
  if (bad.length > 0) {
    for (const b of bad) console.log(`  ✗ ${b.name}`);
    process.exit(1);
  }
}

async function mountPanel(editor: any, monaco: any, open = true) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const editorRef = { current: editor };
  const monacoRef = { current: monaco };

  const CodeAssistantPanel = (await import("@/components/editor/CodeAssistantPanel"))
    .default;
  const { ThemeProvider } = await import("@/context/ThemeContext");

  await act(async () => {
    useAIEditorStore.setState({
      open,
      request: {
        context: {
          type: "current_file",
          language: "cpp",
          filename: "main.cpp",
          content: "let x = 1;\n",
        },
      },
      preparing: false,
    });
    root.render(
      React.createElement(ThemeProvider, null,
        React.createElement(CodeAssistantPanel, { editorRef, monacoRef })
      )
    );
  });

  mountedRoots.push({ root, container });
  return { root, container, editorRef, monacoRef };
}

async function sendMessage(editor: any) {
  // Find the "Ask AI" send button and click it, keeping all async work (SSE
  // stream + throttled UI flush) inside ONE act so React's act() does not
  // throw "overlapping act() calls".
  const buttons = Array.from(document.querySelectorAll("button"));
  const send = buttons.find(
    (b) => b.textContent && b.textContent.includes("Ask AI")
  );
  if (!send) throw new Error("send button not found");
  await act(async () => {
    send.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 120));
  });
}

function getOverlayButtons() {
  const modal = document.querySelector("[data-review-modal]") as HTMLElement | null;
  if (!modal) return { accept: null, reject: null };
  const buttons = Array.from(modal.querySelectorAll("button"));
  const accept = buttons.find((b) => b.textContent?.trim() === "Accept changes") ?? null;
  const reject = buttons.find((b) => b.textContent?.trim() === "Reject") ?? null;
  return { accept, reject };
}

async function waitForOverlayClosed(timeout = 3000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (getOverlayButtons().accept === null) return;
    await new Promise((r) => setTimeout(r, 25));
  }
}

const fileText = async (editor: any) => editor.getModel().getValue();

test("accepting a build suggestion replaces the file with the complete proposed code", async () => {
  resetStore();
  const restore = stubAiWithContent(COMPLETE_FILE_REPLY);
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    await sendMessage(editor);

    const { accept } = getOverlayButtons();
    if (!accept) throw new Error("review overlay did not open after send");

    await act(async () => {
      accept.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
    });

    const text = await fileText(editor);
    if (!text.includes("let y = 2;")) {
      throw new Error(`applied text missing added line: ${JSON.stringify(text)}`);
    }
    // Wait out the overlay's exit animation before asserting it is gone.
    await act(async () => {
      await waitForOverlayClosed();
    });
    if (getOverlayButtons().accept !== null) {
      throw new Error("overlay still open after accept");
    }
  } finally {
    restore();
    await unmountAll();
  }
});

test("accepting a build suggestion replaces the WHOLE file, keeping every change", async () => {
  resetStore();
  const restore = stubAiWithContent(COMPLETE_FILE_REPLY_MULTI);
  try {
    const model = makeMockModel("line1\nline2\nline3\nline4\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    await sendMessage(editor);

    const { accept } = getOverlayButtons();
    if (!accept) throw new Error("review overlay did not open after send");

    await act(async () => {
      accept.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
    });

    const text = await fileText(editor);
    if (!text.includes("line2new")) {
      throw new Error(`first change missing: ${JSON.stringify(text)}`);
    }
    if (!text.includes("line4new")) {
      throw new Error(`second change missing: ${JSON.stringify(text)}`);
    }
    if (text.includes("line2\n")) {
      throw new Error(`old line2 not removed (expected full replace): ${JSON.stringify(text)}`);
    }
    // Wait out the overlay's exit animation before asserting it is gone.
    await act(async () => {
      await waitForOverlayClosed();
    });
    if (getOverlayButtons().accept !== null) {
      throw new Error("overlay still open after accept");
    }
  } finally {
    restore();
    await unmountAll();
  }
});

test("plan mode asks the AI without opening the review overlay", async () => {
  resetStore();
  let seenMode = "";
  const restore = stubAiWithContent(COMPLETE_FILE_REPLY, (req) => (seenMode = req.mode ?? ""));
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    await mountPanel(editor, monacoMock);

    const planBtn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Plan"
    );
    if (!planBtn) throw new Error("Plan toggle not found");
    await act(async () => {
      planBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
    });

    await sendMessage(editor);

    if (seenMode !== "plan") {
      throw new Error(`expected mode "plan", got "${seenMode}"`);
    }
    // Even though the AI emits a complete-file code block, plan mode must NOT
    // open the overlay.
    if (getOverlayButtons().accept !== null) {
      throw new Error("review overlay opened in plan mode");
    }
  } finally {
    restore();
    await unmountAll();
  }
});

test("build mode is the default and requests coding_coach", async () => {
  resetStore();
  let seenMode = "";
  const restore = stubAiWithContent(COMPLETE_FILE_REPLY, (req) => (seenMode = req.mode ?? ""));
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    await mountPanel(editor, monacoMock);

    await sendMessage(editor);

    if (seenMode !== "coding_coach") {
      throw new Error(`expected mode "coding_coach", got "${seenMode}"`);
    }
  } finally {
    restore();
    await unmountAll();
  }
});

test("rejecting a suggestion closes the overlay without editing the file", async () => {
  resetStore();
  const restore = stubAiWithContent(COMPLETE_FILE_REPLY);
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    await sendMessage(editor);

    const { reject } = getOverlayButtons();
    if (!reject) throw new Error("review overlay did not open after send");

    await act(async () => {
      reject.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
    });

    const text = await fileText(editor);
    if (text.includes("let y = 2;")) {
      throw new Error(`file was modified on reject: ${JSON.stringify(text)}`);
    }
    // Wait out the overlay's exit animation before asserting it is gone.
    await act(async () => {
      await waitForOverlayClosed();
    });
    if (getOverlayButtons().accept !== null) {
      throw new Error("overlay still open after reject");
    }
  } finally {
    restore();
    await unmountAll();
  }
});

test("code sent to the AI is the live editor content, not a stale snapshot", async () => {
  resetStore();
  // instrument the fetch stub to record what reached the backend
  let seenCode = "";
  const restore = stubAiWithContent(COMPLETE_FILE_REPLY, (req) => (seenCode = req.code ?? ""));
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    // simulate the user typing in the editor before sending (this replaces the
    // snapshot the panel captured when it opened).
    model.text = "let x = 1;\nlet userEdit = 1;\n";
    model.version++;

    await sendMessage(editor);

    if (!seenCode.includes("let userEdit = 1;")) {
      throw new Error(
        "AI did not receive latest editor content: " + seenCode.slice(0, 200)
      );
    }
    if (seenCode.includes("let x = 1;") === false) {
      throw new Error("request lost the file content");
    }
  } finally {
    restore();
    await unmountAll();
  }
});

function typePrompt(text: string) {
  const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
  if (!ta) throw new Error("textarea not found");
  // jsdom reports the native `input` event as unsupported, so React 19 wires
  // textarea onChange through the legacy polyfill: focusin activates the
  // element, then keyup re-checks the value. Define an OWN `value` property
  // (shadowing React's patched prototype setter) so the value change is seen.
  ta.dispatchEvent(new window.FocusEvent("focusin", { bubbles: true }));
  Object.defineProperty(ta, "value", { value: text, configurable: true, writable: true });
  ta.dispatchEvent(new window.KeyboardEvent("keyup", { bubbles: true }));
}

test("conversation context persists across turns (stable conversationId, fresh code)", async () => {
  resetStore();
  const bodies: ChatRequest[] = [];
  const restore = stubAiWithContent(COMPLETE_FILE_REPLY, (req) => bodies.push(req));
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    await sendMessage(editor); // turn 1
    // Type the follow-up prompt; React must process the polyfilled input
    // events inside act() so the prompt state commits before the next click.
    await act(async () => {
      typePrompt("and now optimize it");
      await new Promise((r) => setTimeout(r, 0));
    });
    await sendMessage(editor); // turn 2

    if (bodies.length !== 2) {
      throw new Error(`expected 2 AI calls, got ${bodies.length}`);
    }
    const [turn1, turn2] = bodies;

    if (!turn1.conversationId) {
      throw new Error("turn 1 is missing a conversationId");
    }
    if (turn1.conversationId !== turn2.conversationId) {
      throw new Error(
        `conversationId changed across turns: ${turn1.conversationId} -> ${turn2.conversationId}`
      );
    }
    if (turn1.mode !== "coding_coach") {
      throw new Error(`expected coding_coach mode, got ${turn1.mode}`);
    }
    if (turn2.message?.includes("optimize") === false) {
      throw new Error("turn 2 user prompt missing from request");
    }
    // The full file is resent (freshly) on every turn so the backend always
    // has the latest code — the frontend never sends a system prompt.
    if (turn1.code?.includes("let x = 1;") === false) {
      throw new Error("turn 1 request missing the file content");
    }
    if (turn2.code?.includes("let x = 1;") === false) {
      throw new Error("turn 2 request missing the file content");
    }
  } finally {
    restore();
    await unmountAll();
  }
});

console.log("\n── CodeAssistantPanel regression tests ──");
setTimeout(() => {
  passed().finally(() => process.exit(0));
}, 50);