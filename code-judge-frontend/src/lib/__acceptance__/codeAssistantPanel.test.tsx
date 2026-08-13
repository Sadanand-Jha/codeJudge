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
g.IS_REACT_ACT_ENVIRONMENT = true;

// ── dependencies factotem ───────────────────────────────────────────────
import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";

// ── mock the AI service by stubbing fetch with a fake SSE body ──────────
import { useAIEditorStore } from "@/store/aiEditorStore";
import {
  useCodeAssistantStore,
  CODE_ASSISTANT_SYSTEM_ID,
} from "@/store/codeAssistantStore";

const RAW_DIFF =
  "Add a variable.\n\n```diff\n@@ -1,1 +1,2 @@\n let x = 1;\n+let y = 2;\n```";

/** Emit SSE payloads as a fake `fetch` Response for `streamChat`. */
function stubAiWithContent(
  content: string,
  onSystem?: (sys: string) => void,
  onMessages?: (msgs: { role: string; content: string }[]) => void
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
    let parsed: { messages?: { role: string; content: string }[] } = {};
    try {
      parsed = JSON.parse(typeof body === "string" ? body : "{}");
    } catch {
      parsed = {};
    }
    const msgs = parsed.messages ?? [];
    onSystem?.(msgs.find((m) => m.role === "system")?.content ?? "");
    onMessages?.(msgs);
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

// counters for distinct ids between tests
let idSeq = 0;
const makeId = () => `id-${++idSeq}`;

function resetStore() {
  useAIEditorStore.setState({
    open: false,
    request: null,
    preparing: false,
  });
  useCodeAssistantStore.setState({
    messages: [
      { id: CODE_ASSISTANT_SYSTEM_ID, role: "system", content: "" },
    ],
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
      React.createElement(CodeAssistantPanel, { editorRef, monacoRef })
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

function getWidget(editor: any) {
  return editor.__byteclashInlineWidget as {
    getDomNode: () => HTMLElement;
  } | null;
}

const fileText = async (editor: any) => editor.getModel().getValue();

test("accepting a suggestion removes the inline widget and decorations", async () => {
  resetStore();
  const restore = stubAiWithContent(RAW_DIFF);
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    await sendMessage(editor);

    const widget = getWidget(editor);
    if (!widget) throw new Error("inline widget was not attached after send");

    const dom = widget.getDomNode();
    const applyBtn = Array.from(dom.querySelectorAll("button")).find(
      (b) => b.textContent === "Apply"
    );
    if (!applyBtn) throw new Error("Apply button not present in widget");

    await act(async () => {
      applyBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
    });

    if (getWidget(editor) !== null) {
      throw new Error("inline widget still attached after accept");
    }
    if ((editor.widgets as unknown[]).length !== 0) {
      throw new Error("content widget still registered after accept");
    }
    const text = await fileText(editor);
    if (!text.includes("let y = 2;")) {
      throw new Error(`applied text missing added line: ${JSON.stringify(text)}`);
    }
    // decoration ids are cleared
    if ((editor.decorations as string[]).length !== 0) {
      throw new Error("ghost decorations still present after accept");
    }
  } finally {
    restore();
    await unmountAll();
  }
});

test("rejecting a suggestion removes the inline widget without editing the file", async () => {
  resetStore();
  const restore = stubAiWithContent(RAW_DIFF);
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    await sendMessage(editor);

    const widget = getWidget(editor);
    if (!widget) throw new Error("inline widget was not attached after send");

    const dom = widget.getDomNode();
    const rejectBtn = Array.from(dom.querySelectorAll("button")).find(
      (b) => b.textContent === "Reject"
    );
    if (!rejectBtn) throw new Error("Reject button not present in widget");

    await act(async () => {
      rejectBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 0));
    });

    if (getWidget(editor) !== null) {
      throw new Error("inline widget still attached after reject");
    }
    const text = await fileText(editor);
    if (text.includes("let y = 2;")) {
      throw new Error(`file was modified on reject: ${JSON.stringify(text)}`);
    }
  } finally {
    restore();
    await unmountAll();
  }
});

test("code sent to the AI is the live editor content, not a stale snapshot", async () => {
  resetStore();
  // instrument the fetch stub to record what context reached the model
  let seenSystem = "";
  const restore = stubAiWithContent(RAW_DIFF, (sys) => (seenSystem = sys));
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    // simulate the user typing in the editor before sending (this replaces the
    // snapshot the panel captured when it opened).
    model.text = "let x = 1;\nlet userEdit = 1;\n";
    model.version++;

    await sendMessage(editor);

    if (!seenSystem.includes("let userEdit = 1;")) {
      throw new Error(
        "AI did not receive latest editor content: " + seenSystem.slice(0, 200)
      );
    }
    if (seenSystem.includes("let x = 1;") === false) {
      throw new Error("system message lost the file content");
    }
  } finally {
    restore();
    await unmountAll();
  }
});

function typePrompt(text: string) {
  const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
  if (!ta) throw new Error("textarea not found");
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  setter?.call(ta, text);
  ta.dispatchEvent(new window.Event("input", { bubbles: true }));
}

test("conversation context persists across turns (full history is resent)", async () => {
  resetStore();
  const historyByTurn: string[][] = [];
  const restore = stubAiWithContent(RAW_DIFF, undefined, (msgs) => {
    historyByTurn.push(msgs.map((m) => `${m.role}: ${m.content.slice(0, 30)}`));
  });
  try {
    const model = makeMockModel("let x = 1;\n");
    const editor = makeEditor(model);
    const { root } = await mountPanel(editor, monacoMock);

    await sendMessage(editor); // turn 1
    typePrompt("and now optimize it");
    const send2 = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent && b.textContent.includes("Ask AI")
    );
    const ta = document.querySelector("textarea") as HTMLTextAreaElement | null;
    console.log(
      "DEBUG send2.disabled:",
      send2?.disabled,
      "ta.value:",
      JSON.stringify(ta?.value)
    );
    await sendMessage(editor); // turn 2

    if (historyByTurn.length !== 2) {
      throw new Error(`expected 2 AI calls, got ${historyByTurn.length}`);
    }
    const turn2 = historyByTurn[1];
    const userCount = turn2.filter((m) => m.startsWith("user:")).length;
    const assistantCount = turn2.filter((m) => m.startsWith("assistant:")).length;
    const systemCount = turn2.filter((m) => m.startsWith("system:")).length;
    if (userCount !== 2) {
      throw new Error(
        `turn 2 has ${userCount} user messages, expected 2 (prior + current)`
      );
    }
    if (assistantCount !== 1) {
      throw new Error(
        `turn 2 has ${assistantCount} assistant messages, expected 1`
      );
    }
    if (systemCount !== 1) {
      throw new Error(
        `turn 2 has ${systemCount} system messages, expected 1`
      );
    }
    if (!turn2.some((m) => m.includes("optimize"))) {
      throw new Error("turn 2 user prompt missing from history");
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