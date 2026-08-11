"use client";

/**
 * Structured code edits produced by the AI, compatible with Monaco.
 *
 * Coordinates are 1-based (Monaco convention): `startLine`/`startColumn` are
 * the inclusive start of the region to replace; `endLine`/`endColumn` are the
 * inclusive end. Replacing with `newText` swaps that region out.
 */

export interface AIEdit {
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
  newText: string;
}

export interface SuggestedEdits {
  /** What the model wants to change. Rendered above the diff preview. */
  explanation: string;
  /** One or more independent edits. */
  edits: AIEdit[];
}

/**
 * Delimiters the model wraps its machine-readable edit block in. The block is
 * extracted from the streamed content, parsed, and removed before the message
 * is shown in the chat, so the raw JSON never reaches the user.
 */
export const EDITS_OPEN = "<<<BYTECLASH_EDITS>>>";
export const EDITS_CLOSE = "<<<END_BYTECLASH_EDITS>>>";

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const isInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n) && Number.isInteger(n);

/** Validate a single proposed edit's shape. */
const isValidEdit = (e: unknown): e is AIEdit => {
  if (!e || typeof e !== "object") return false;
  const x = e as Record<string, unknown>;
  return (
    isInt(x.startLine) &&
    isInt(x.startColumn) &&
    isInt(x.endLine) &&
    isInt(x.endColumn) &&
    typeof x.newText === "string"
  );
};

/**
 * Extract machine-readable edits from a raw AI response.
 *
 * The AI is instructed (via the system prompt) to present changes as a compact
 * **unified diff** (a standard, LLM-friendly format) wrapped in a fenced
 * ```diff block. A unified diff is far more likely to be produced correctly by
 * a local model than bespoke JSON, so this is the primary contract.
 *
 * We also keep a fallback that accepts structured JSON (object/array with
 * startLine/endLine/newText) for providers that reliably emit it.
 */
export function parseEditsFromResponse(
  raw: string
): { content: string; edits: SuggestedEdits[] } {
  // 1) Primary: a fenced unified diff block.
  const diffFence = /```(?:diff|udiff)?\s*\n?([\s\S]*?)\n?```/i.exec(raw);
  if (diffFence) {
    const parsed = parseUnifiedDiff(diffFence[1]);
    if (parsed.length > 0) {
      const content = raw
        .replace(diffFence[0], "")
        .replace(/^.*?\n/, "")
        .trim();
      return { content, edits: parsed };
    }
  }

  // 2) Legacy: delimited custom JSON block.
  const openIdx = raw.indexOf(EDITS_OPEN);
  const closeIdx = raw.lastIndexOf(EDITS_CLOSE);
  if (openIdx !== -1 && closeIdx > openIdx) {
    const content = (raw.slice(0, openIdx) + raw.slice(closeIdx + EDITS_CLOSE.length)).trim();
    const block = raw.slice(openIdx + EDITS_OPEN.length, closeIdx).trim();
    const edits = parseEditJson(block);
    if (edits) return { content, edits };
    return { content, edits: [] };
  }

  // 3) Fallback: scan the whole response for an embedded JSON object/array.
  const edits = scanEditJson(raw);
  if (edits) {
    const content = stripRawJson(raw);
    return { content, edits };
  }

  return { content: raw, edits: [] };
}

/**
 * Parse a unified diff body into per-hunk edit suggestions.
 *
 * Each contiguous removed-then-added run within a hunk becomes one suggested
 * edit (so the user can accept/reject each change individually). Line numbers
 * come from the `@@` headers, which makes the produced Monaco ranges accurate.
 */
export function parseUnifiedDiff(diffBody: string): SuggestedEdits[] {
  const lines = diffBody.split("\n");
  const suggestions: SuggestedEdits[] = [];
  let explanation = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip file headers.
    if (/^(---|\+\+\+|diff --git|index |new file|deleted file)/.test(line)) continue;

    // Parse hunk header: @@ -oldStart[,oldCount] +newStart[,newCount] @@
    const hunk = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)/.exec(line);
    if (!hunk) {
      if (line.startsWith("+") || line.startsWith("-")) explanation = line.slice(1).trim();
      continue;
    }

    let oldLine = Number(hunk[1]);

    // Collect the runs within this hunk.
    let run: { removed: string[]; added: string[]; startLine: number } | null = null;

    const flushRun = () => {
      if (run && (run.removed.length > 0 || run.added.length > 0)) {
        const removedCount = run.removed.length;
        const newText = run.added.length > 0 ? run.added.join("\n") + "\n" : "";
        if (removedCount > 0) {
          // Replace the full removed lines (covering their trailing newline).
          suggestions.push({
            explanation: explanation || "Suggested change",
            edits: [
              {
                startLine: run.startLine,
                startColumn: 1,
                endLine: run.startLine + removedCount,
                endColumn: 1,
                newText,
              },
            ],
          });
        } else {
          // Pure insertion at a point.
          suggestions.push({
            explanation: explanation || "Suggested change",
            edits: [
              {
                startLine: run.startLine,
                startColumn: 1,
                endLine: run.startLine,
                endColumn: 1,
                newText,
              },
            ],
          });
        }
      }
      run = null;
    };

    for (; i < lines.length; i++) {
      const l = lines[i];
      if (/^@@/.test(l)) { i--; break; }
      if (l.startsWith("-") && !l.startsWith("---")) {
        if (!run) run = { removed: [], added: [], startLine: oldLine };
        run.removed.push(l.slice(1));
        oldLine++;
      } else if (l.startsWith("+") && !l.startsWith("+++")) {
        if (!run) run = { removed: [], added: [], startLine: oldLine };
        run.added.push(l.slice(1));
      } else {
        // Context line — flush the current run so changes stay independent.
        flushRun();
        oldLine++;
      }
    }
    flushRun();
  }

  return suggestions;
}

/** Parse a JSON string that is either an object or an array of edits. */
function parseEditJson(block: string): SuggestedEdits[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(block);
  } catch {
    return null;
  }

  const asSuggestions = (list: unknown[]): SuggestedEdits[] | null => {
    const clean = list.filter((e): e is AIEdit => isValidEdit(e));
    if (clean.length === 0) return null;
    return [explanationsFor(clean, list)];
  };

  if (Array.isArray(parsed)) return asSuggestions(parsed);

  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.edits)) return asSuggestions(obj.edits);
    // A single edit object.
    if (isValidEdit(parsed)) return [{ explanation: "", edits: [parsed as AIEdit] }];
  }

  return null;
}

const explanationsFor = (clean: AIEdit[], raw: unknown[]): SuggestedEdits => {
  // Prefer an explanation supplied on the object/array; otherwise derive a
  // terse label from the first edit's new text.
  const src = raw.find((e): e is { explanation?: unknown } =>
    !!e && typeof e === "object" && "explanation" in (e as object)
  );
  return {
    explanation:
      typeof src?.explanation === "string" && src.explanation.trim()
        ? src.explanation.trim()
        : shortLabel(clean[0]),
    edits: clean,
  };
};

const shortLabel = (e: AIEdit): string => {
  const add = e.newText.trim();
  if (!add) return "Suggested change";
  const firstLine = add.split("\n")[0].trim().slice(0, 60);
  return firstLine ? `Change around: ${firstLine}…` : "Suggested change";
};

/** Best-effort: find any JSON object or array that looks like edits in prose. */
function scanEditJson(raw: string): SuggestedEdits[] | null {
  const candidates: string[] = [];
  // Fenced json blocks first.
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(raw))) candidates.push(m[1]);
  // Also the last balanced {...} block in the string.
  const braceStart = raw.lastIndexOf("{");
  const braceEnd = raw.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    candidates.push(raw.slice(braceStart, braceEnd + 1));
  }

  for (const c of candidates) {
    const edits = parseEditJson(c);
    if (edits) return edits;
  }
  return null;
}

/** Remove embedded raw JSON (fenced blocks / {...}) from the visible content. */
function stripRawJson(raw: string): string {
  return raw
    .replace(/```(?:json)?\s*[\s\S]*?```/g, "")
    .replace(/\{[^{}]*\{[^{}]*\}[^{}]*\}/g, (b) =>
      /"startLine"|"edits"/.test(b) ? "" : b
    )
    .replace(/<<<BYTECLASH_EDITS>>>[\s\S]*?<<<END_BYTECLASH_EDITS>>>/g, "")
    .trim();
}

/** A resolved diff line for display in the preview. */
export interface DiffLine {
  type: "context" | "add" | "remove";
  text: string;
}

/**
 * Build a compact before/after diff for a single edit given the current model
 * content. Removed lines are whatever currently occupies the range; added
 * lines are the replacement text. Used for the "Suggested changes" preview.
 */
export function buildEditDiff(
  modelValue: string,
  edit: AIEdit
): DiffLine[] {
  const lines = modelValue.split("\n");
  const removed: string[] = [];
  const fromLine = clamp(edit.startLine, 1, Math.max(1, lines.length));
  const toLine = clamp(edit.endLine, 1, Math.max(1, lines.length));

  // Whole-line convention produced by the unified-diff parser: the range spans
  // from `startLine` and consumes lines up to, but not including, `endLine`
  // (it replaces full lines plus their trailing newline).
  const wholeLines = edit.endColumn === 1 && toLine > fromLine;

  if (wholeLines) {
    // Removed = lines fromLine .. toLine-1 (inclusive).
    for (let i = fromLine - 1; i < toLine - 1; i++) {
      const ln = lines[i];
      if (ln !== undefined) removed.push(ln);
    }
  } else if (fromLine === toLine) {
    const full = lines[fromLine - 1] ?? "";
    const start = clamp(edit.startColumn - 1, 0, full.length);
    const end = clamp(edit.endColumn - 1, start, full.length);
    const removedText = full.slice(start, end);
    if (removedText.trim()) removed.push(removedText);
  } else {
    for (let i = fromLine - 1; i < toLine; i++) {
      const ln = lines[i];
      if (ln !== undefined) removed.push(ln);
    }
  }

  const added = (edit.newText || "").split("\n");
  if (added.length > 0 && added[added.length - 1] === "") added.pop();

  const diff: DiffLine[] = [];

  // A context anchor so a pure insertion shows where the change lands.
  if (removed.length === 0 && added.length > 0) {
    const anchor = lines[fromLine - 1] ?? "";
    const startCol = clamp(edit.startColumn - 1, 0, anchor.length);
    diff.push({ type: "context", text: anchor.slice(0, startCol) });
  }

  removed.forEach((r) => diff.push({ type: "remove", text: r }));
  added.forEach((a) => diff.push({ type: "add", text: a }));
  return diff;
}

/* ═══════════════════ Monaco integration (client-only) ═══════════════════ */

export interface EditorSnapshot {
  /** Monaco model version at proposal time, for staleness checks. */
  versionId: number;
  /** Full model text at proposal time. */
  content: string;
}

/**
 * Capture the current model + version so we can refuse to apply stale edits
 * if the user edited the file while the AI was generating.
 */
export function captureEditorSnapshot(
  editor: any
): EditorSnapshot | null {
  const model = editor?.getModel?.();
  if (!model) return null;
  return { versionId: model.getVersionId(), content: model.getValue() };
}

/** True if the model has not changed since the snapshot was taken. */
export function isEditorUnchanged(
  editor: any,
  snapshot: EditorSnapshot | null
): boolean {
  if (!snapshot) return false;
  const model = editor?.getModel?.();
  if (!model) return false;
  return model.getVersionId() === snapshot.versionId;
}

/**
 * Validate edits against the live model before applying: coordinates must be
 * within bounds, non-empty ranges, and non-overlapping.
 */
export function validateEditsAgainstModel(
  editor: any,
  edits: AIEdit[]
): { valid: boolean; reason?: string } {
  const model = editor?.getModel?.();
  if (!model) return { valid: false, reason: "Editor is not available." };
  if (edits.length === 0) return { valid: false, reason: "No edits to apply." };

  const lineCount = model.getLineCount();

  // Normalize + sort so overlap detection is reliable.
  const sorted = edits
    .map((e) => ({
      startLine: clamp(Math.round(e.startLine), 1, lineCount),
      startColumn: Math.max(1, Math.round(e.startColumn)),
      endLine: clamp(Math.round(e.endLine), 1, lineCount),
      endColumn: Math.max(1, Math.round(e.endColumn)),
      newText: e.newText,
    }))
    .sort((a, b) =>
      a.startLine - b.startLine || a.startColumn - b.startColumn
    );

  // Column bounds per line.
  for (const e of sorted) {
    const maxCol = model.getLineMaxColumn(e.startLine);
    const endMaxCol =
      e.endLine === e.startLine
        ? maxCol
        : model.getLineMaxColumn(e.endLine);
    if (e.startColumn > maxCol) {
      return {
        valid: false,
        reason: `Edit starts past the end of line ${e.startLine}.`,
      };
    }
    if (
      e.startLine === e.endLine &&
      e.startColumn > e.endColumn
    ) {
      return { valid: false, reason: "Edit has an invalid range." };
    }
    void endMaxCol;
  }

  // Overlap / out-of-order detection on sorted edits.
  let prevEnd = { line: -1, col: -1 };
  for (const e of sorted) {
    const start = { line: e.startLine, col: e.startColumn };
    if (
      start.line < prevEnd.line ||
      (start.line === prevEnd.line && start.col < prevEnd.col)
    ) {
      return { valid: false, reason: "Proposed edits overlap." };
    }
    prevEnd = { line: e.endLine, col: e.endColumn };
  }

  return { valid: true };
}

/**
 * Build Monaco `Range` objects for each edit. Returns null if Monaco isn't ready.
 */
function toRanges(monaco: any, edits: AIEdit[]): { range: any; text: string }[] {
  if (!monaco?.Range) return [];
  return edits.map((e) => ({
    range: new monaco.Range(
      clamp(Math.round(e.startLine), 1, 999999),
      Math.max(1, Math.round(e.startColumn)),
      clamp(Math.round(e.endLine), 1, 999999),
      Math.max(1, Math.round(e.endColumn))
    ),
    text: e.newText,
  }));
}

/**
 * Apply edits to the Monaco model as a SINGLE undoable operation, preserving
 * the cursor position as best as possible. Returns true on success.
 */
export function applyEditsToEditor(
  editor: any,
  monaco: any,
  edits: AIEdit[]
): boolean {
  const model = editor?.getModel?.();
  if (!model || !monaco?.Range) return false;

  const ranges = toRanges(monaco, edits);
  if (ranges.length === 0) return false;

  const prevPosition = editor.getPosition?.();

  // pushUndoStop before so the user's prior edits stay separate, then the
  // pushEditOperations applies everything as one undoable transaction.
  model.pushStackElement();
  const endCursor = editor.executeEdits("byteclash-ai", ranges);
  model.pushStackElement();

  // Restore/derived cursor: prefer the explicit returned one, else clamp.
  if (prevPosition && (!endCursor || !endCursor[0])) {
    const line = clamp(prevPosition.lineNumber, 1, model.getLineCount());
    const col = clamp(prevPosition.column, 1, model.getLineMaxColumn(line));
    editor.setPosition({ lineNumber: line, column: col });
  } else if (endCursor && endCursor[0]) {
    editor.setPosition(endCursor[0].getStartPosition?.() ?? endCursor[0]);
  }

  editor.focus?.();
  return true;
}

/**
 * Highlight the affected lines in Monaco with a subtle purple glow so the user
 * can see exactly what will change BEFORE applying. Returns decoration IDs that
 * must be passed to `clearEditDecorations` to remove them.
 */
export function addEditDecorations(
  editor: any,
  edits: AIEdit[]
): string[] | null {
  const model = editor?.getModel?.();
  if (!model) return null;

  const prevDecorations = (editor.__byteclashAiDecorations as string[] | undefined) ?? [];

  const opts = edits.map((e) => {
    const line = clamp(Math.round(e.startLine), 1, model.getLineCount());
    const range = model.getLineRange?.(line) ?? null;
    return {
      range,
      options: {
        isWholeLine: false,
        className: "byteclash-ai-edit-line",
        glyphMarginClassName: "byteclash-ai-edit-glyph",
        linesDecorationsClassName: "byteclash-ai-edit-gutter",
        overviewRuler: {
          color: "rgba(167,139,250,0.5)",
          darkColor: "rgba(167,139,250,0.6)",
          position: 3,
        },
        hoverMessage: { value: "AI suggestion — click Apply to accept" },
      },
    };
  });

  const ids = editor.deltaDecorations(prevDecorations, opts);
  editor.__byteclashAiDecorations = ids;
  return ids;
}

/** Remove the AI suggestion decorations (on reject/apply/close). */
export function clearEditDecorations(editor: any): void {
  if (!editor) return;
  const ids = (editor.__byteclashAiDecorations as string[] | undefined) ?? [];
  if (ids.length > 0) {
    editor.deltaDecorations(ids, []);
  }
  editor.__byteclashAiDecorations = [];
}

/* ═══════════════ Inline (Copilot-style) suggestion in Monaco ═══════════════ */

/** Split a newText into visible added lines (drops trailing empty line). */
function splitAddedLines(newText: string): string[] {
  const lines = (newText || "").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/**
 * Resolve an edit against a given file text into concrete removed/added lines.
 * Mirrors buildEditDiff's coordinate handling so the inline preview and the
 * chat diff always agree.
 */
export function resolveEditLines(
  fileText: string,
  edit: AIEdit
): { removed: string[]; added: string[] } {
  const lines = fileText.split("\n");
  const removed: string[] = [];
  const fromLine = clamp(edit.startLine, 1, Math.max(1, lines.length));
  const toLine = clamp(edit.endLine, 1, Math.max(1, lines.length));
  const wholeLines = edit.endColumn === 1 && toLine > fromLine;

  if (wholeLines) {
    for (let i = fromLine - 1; i < toLine - 1; i++) {
      const ln = lines[i];
      if (ln !== undefined) removed.push(ln);
    }
  } else if (fromLine === toLine) {
    const full = lines[fromLine - 1] ?? "";
    const start = clamp(edit.startColumn - 1, 0, full.length);
    const end = clamp(edit.endColumn - 1, start, full.length);
    const removedText = full.slice(start, end);
    if (removedText.trim()) removed.push(removedText);
  } else {
    for (let i = fromLine - 1; i < toLine; i++) {
      const ln = lines[i];
      if (ln !== undefined) removed.push(ln);
    }
  }

  return { removed, added: splitAddedLines(edit.newText) };
}

interface InlineSuggestionCallbacks {
  onApply: () => void;
  onReject: () => void;
  /** Optional extra label, e.g. the change explanation. */
  label?: string;
}

export interface InlineSuggestionHandle {
  /** Remove all decorations + the widget. Safe to call multiple times. */
  detach: () => void;
}

/**
 * Render a rich inline suggestion directly inside Monaco:
 *  - the actual (real) lines being removed get a red deletion background and a
 *    thin red gutter bar, without modifying the model;
 *  - the new lines are shown as injected "ghost text" immediately after, with a
 *    green/pink addition tint;
 *  - a compact content widget floats near the first changed line with the
 *    "✨ AI suggested change", [Reject] and [Apply] buttons.
 *
 * The model is NEVER modified here — only decorations + a widget are added.
 * Returns a handle whose `.detach()` removes everything.
 */
export function attachInlineSuggestion(
  editor: any,
  monaco: any,
  edits: AIEdit[],
  callbacks: InlineSuggestionCallbacks
): InlineSuggestionHandle {
  detachInlineSuggestion(editor);

  const model = editor?.getModel?.();
  if (!model || !monaco?.Range || edits.length === 0) {
    return {
      detach: () => {
        /* editor not ready; nothing to remove */
      },
    };
  }

  const fileText = model.getValue();
  const lineCount = model.getLineCount();
  const createdIds: string[] = [];
  let firstLine = Infinity;

  for (const edit of edits) {
    const { removed, added } = resolveEditLines(fileText, edit);
    const fromLine = clamp(Math.round(edit.startLine), 1, lineCount);

    let anchorLine = fromLine;

    // Decorate the REAL removed lines with a red deletion background + gutter.
    const removedCount =
      edit.endColumn === 1 && edit.endLine > edit.startLine
        ? edit.endLine - edit.startLine
        : removed.length;

    if (removedCount > 0) {
      const rStart = fromLine;
      const rEnd = Math.max(rStart, rStart + removedCount - 1);
      const ids = editor.deltaDecorations(
        [],
        [
          {
            range: new monaco.Range(rStart, 1, rEnd + 1, 1),
            options: {
              isWholeLine: true,
              className: "bcl-ai-inline-remove",
              linesDecorationsClassName: "bcl-ai-inline-remove-gutter",
              stickiness: 1,
            },
          },
        ]
      );
      createdIds.push(...(ids ?? []));
      anchorLine = rEnd;
    }

    // Inject the ADDED lines as ghost text with a green/pink tint, anchored to
    // just after the removed block (or at the insertion point).
    if (added.length > 0) {
      const anchor = removedCount > 0 ? anchorLine : fromLine;
      const ghost = added.join("\n") + "\n";
      const ghostRange =
        removedCount > 0
          ? new monaco.Range(anchor, 1, anchor, 1)
          : new monaco.Range(
              anchor,
              clamp(edit.startColumn, 1, model.getLineMaxColumn(anchor)),
              anchor,
              clamp(edit.startColumn, 1, model.getLineMaxColumn(anchor))
            );
      const ids = editor.deltaDecorations(
        [],
        [
          {
            range: ghostRange,
            options: {
              after: {
                content: ghost,
                inlineClassName: "bcl-ai-inline-add",
                cursorStops: 3, // None — don't trap the caret in ghost text
              },
              stickiness: 3,
            },
          },
        ]
      );
      createdIds.push(...(ids ?? []));
    }

    firstLine = Math.min(firstLine, fromLine);
  }

  // Track all created ids for teardown.
  editor.__byteclashInlineIds = createdIds;

  if (!Number.isFinite(firstLine)) firstLine = 1;
  firstLine = clamp(firstLine, 1, lineCount);

  // Compact, theme-consistent widget with Accept / Reject.
  let widgetDOM: HTMLDivElement | null = null;

  const buildWidget = () => {
    if (widgetDOM) return widgetDOM;
    const root = document.createElement("div");
    root.className = "bcl-ai-widget";

    const head = document.createElement("div");
    head.className = "bcl-ai-widget-head";
    head.innerHTML =
      '<span class="bcl-ai-widget-badge">✦</span><span class="bcl-ai-widget-label">AI suggested change</span>';
    root.appendChild(head);

    const body = document.createElement("div");
    body.className = "bcl-ai-widget-diff";
    const { removed, added } = edits.reduce<{
      removed: string[];
      added: string[];
    }>(
      (acc, e) => {
        const r = resolveEditLines(model.getValue(), e);
        acc.removed.push(...r.removed);
        acc.added.push(...r.added);
        return acc;
      },
      { removed: [], added: [] }
    );
    removed.forEach((t) => {
      const row = document.createElement("div");
      row.className = "bcl-ai-widget-row bcl-ai-widget-remove";
      row.innerHTML = `<span class="bcl-ai-widget-sign">−</span><code>${escapeHtml(t)}</code>`;
      body.appendChild(row);
    });
    added.forEach((t) => {
      const row = document.createElement("div");
      row.className = "bcl-ai-widget-row bcl-ai-widget-add";
      row.innerHTML = `<span class="bcl-ai-widget-sign">+</span><code>${escapeHtml(t)}</code>`;
      body.appendChild(row);
    });
    if (removed.length === 0 && added.length === 0) {
      const row = document.createElement("div");
      row.className = "bcl-ai-widget-row";
      row.textContent = callbacks.label || "Suggested change";
      body.appendChild(row);
    }
    root.appendChild(body);

    const actions = document.createElement("div");
    actions.className = "bcl-ai-widget-actions";
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "bcl-ai-widget-btn bcl-ai-widget-reject";
    reject.textContent = "Reject";
    reject.onclick = (ev) => {
      ev.stopPropagation();
      callbacks.onReject();
    };
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "bcl-ai-widget-btn bcl-ai-widget-apply";
    apply.textContent = "Apply";
    apply.onclick = (ev) => {
      ev.stopPropagation();
      callbacks.onApply();
    };
    actions.appendChild(reject);
    actions.appendChild(apply);
    root.appendChild(actions);

    widgetDOM = root;
    return root;
  };

  const widget = {
    getId: () => "byteclash-inline-suggestion",
    getDomNode: () => buildWidget(),
    getPosition: () => ({
      position: {
        lineNumber: firstLine,
        column: 1,
      },
      // Float the widget above the first changed line (Copilot-style).
      preference: 1,
    }),
    allowBeforeOverlapping: true,
    allowAfterOverlapping: true,
    suppressMouseDown: true,
  } as any;

  editor.addContentWidget(widget);
  editor.__byteclashInlineWidget = widget;

  return {
    detach: () => detachInlineSuggestion(editor),
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Remove inline suggestion decorations + widget. Idempotent. */
export function detachInlineSuggestion(editor: any): void {
  if (!editor) return;
  try {
    const ids = (editor.__byteclashInlineIds as string[] | undefined) ?? [];
    if (ids.length > 0) editor.deltaDecorations(ids, []);
  } catch {
    /* ignore */
  }
  try {
    const widget = editor.__byteclashInlineWidget as unknown;
    if (widget) editor.removeContentWidget(widget as any);
  } catch {
    /* ignore */
  }
  editor.__byteclashInlineIds = [];
  editor.__byteclashInlineWidget = null;
}
