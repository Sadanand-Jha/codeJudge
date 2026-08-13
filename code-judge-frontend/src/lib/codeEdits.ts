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

    // Collect the runs within this hunk. `run.startLine` is the first removed
    // line; for pure insertions it is the line the insertion lands on.
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

    // Walk the hunk body, starting AFTER the @@ header line. When the next @@
    // header is reached, step back so the outer loop processes it next.
    for (i = i + 1; i < lines.length; i++) {
      const l = lines[i];
      if (/^@@/.test(l)) {
        i--;
        break;
      }
      if (l.startsWith("-") && !l.startsWith("---")) {
        if (!run) run = { removed: [], added: [], startLine: oldLine };
        run.removed.push(l.slice(1));
        oldLine++;
      } else if (l.startsWith("+") && !l.startsWith("+++")) {
        if (!run) run = { removed: [], added: [], startLine: oldLine };
        run.added.push(l.slice(1));
      } else {
        // Context line (or empty) — flush the current run so changes stay independent.
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

/** Cap ghost-text lines per edit so Monaco never renders an unbounded block. */
const MAX_GHOST_LINES = 60;
/** Cap rows rendered inside the inline suggestion widget. */
const MAX_WIDGET_LINES = 80;

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

/* ═══════════════════ Structural analysis (blocks & delimiters) ═══════════════════ */

interface IndentStyle {
  unit: "\t" | " ";
  /** Character width of one indentation level (used for tab conversion). */
  levelWidth: number;
}

/** The position (1-based line/col) of a closing delimiter in the source. */
export interface StructuralCloser {
  offset: number;
  line: number;
  col: number;
  type: "}" | ")" | "]";
}

export interface FileStructure {
  /** Base indent for code inserted at the START of each line (1-indexed). */
  indents: string[];
  /** Positions of closing delimiters that popped a matching opener. */
  closes: StructuralCloser[];
}

/** Opening delimiter for each closing delimiter. */
const OPENER_OF: Record<string, "{" | "(" | "["> = {
  "}": "{",
  ")": "(",
  "]": "[",
};

/** Closing delimiter for each opening delimiter. */
const CLOSER_OF: Record<string, "}" | ")" | "]"> = {
  "{": "}",
  "(": ")",
  "[": "]",
};

/**
 * Detect the file's dominant indentation style (tabs vs spaces + level width)
 * from its existing lines, so AI-proposed text matches the surrounding code.
 */
export function inferIndentStyle(fileText: string): IndentStyle {
  const lines = fileText.split("\n");
  let tabLines = 0;
  const spaceWidths: number[] = [];
  for (const l of lines) {
    if (/^\t/.test(l)) {
      tabLines++;
      continue;
    }
    const sp = /^( +)/.exec(l);
    if (sp && sp[1].length > 0) spaceWidths.push(sp[1].length);
  }
  if (tabLines > spaceWidths.length) {
    return { unit: "\t", levelWidth: 4 };
  }
  if (spaceWidths.length === 0) return { unit: " ", levelWidth: 4 };

  // The indent unit is the greatest common divisor of all observed line
  // indents (nested blocks indent by a fixed multiple), not the most common
  // absolute width — e.g. in a 2-level nested file the body indent is 8 but
  // the actual unit is 4.
  const gcd2 = (a: number, b: number): number => (b === 0 ? a : gcd2(b, a % b));
  const gcd = spaceWidths.reduce((acc, w) => gcd2(acc, w), spaceWidths[0]);
  let level = gcd;
  if (!level || level < 1) level = Math.min(...spaceWidths);
  return { unit: " ", levelWidth: Math.max(1, level) };
}

/** Leading whitespace (indentation) of a line, as-is. */
function leadingWhitespace(line: string): string {
  const m = /^[\t ]*/.exec(line);
  return m ? m[0] : "";
}

/**
 * Lexer-aware single pass over a source file:
 *  - tracks `{ }`, `( )`, `[ ]` while ignoring string/char/comment literals, so
 *    we can tell which block any insertion point sits inside;
 *  - records per line the indentation code inserted at that point should use
 *    (the enclosing `{` block's content indent);
 *  - records every closing delimiter that actually pops an opener.
 */
export function analyzeStructure(
  fileText: string,
  style: IndentStyle
): FileStructure {
  const unit = style.unit === "\t" ? "\t" : " ".repeat(style.levelWidth);
  const lines = fileText.split("\n");
  const indents: string[] = [];
  const closes: StructuralCloser[] = [];
  interface Entry {
    type: "{" | "(" | "[";
    indent: string;
  }
  const stack: Entry[] = [];

  let inStr = false;
  let inChr = false;
  let inBlockComment = false;
  let offset = 0;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    indents.push(stack.length ? stack[stack.length - 1].indent : "");
    let inLineComment = false;

    for (let ci = 0; ci < line.length; ci++) {
      const c = line[ci];
      const next = ci + 1 < line.length ? line[ci + 1] : undefined;

      if (inStr) {
        if (c === "\\" && next !== undefined) {
          ci++;
          offset++;
        } else if (c === '"') {
          inStr = false;
        }
        offset++;
        continue;
      }
      if (inChr) {
        if (c === "\\" && next !== undefined) {
          ci++;
          offset++;
        } else if (c === "'") {
          inChr = false;
        }
        offset++;
        continue;
      }
      if (inBlockComment) {
        if (c === "*" && next === "/") {
          inBlockComment = false;
          ci++;
          offset++;
        }
        offset++;
        continue;
      }
      if (inLineComment) {
        offset++;
        continue;
      }

      if (c === '"') {
        inStr = true;
        offset++;
        continue;
      }
      if (c === "'") {
        inChr = true;
        offset++;
        continue;
      }
      if (c === "/" && next === "/") {
        inLineComment = true;
        ci++;
        offset += 2;
        continue;
      }
      if (c === "/" && next === "*") {
        inBlockComment = true;
        ci++;
        offset += 2;
        continue;
      }
      if (c === "{" || c === "(" || c === "[") {
        stack.push({
          type: c,
          indent: leadingWhitespace(line) + (c === "{" ? unit : ""),
        });
        offset++;
        continue;
      }
      if (c === "}" || c === ")" || c === "]") {
        if (stack.length) {
          const need = OPENER_OF[c];
          const top = stack[stack.length - 1];
          if (top.type === need) {
            stack.pop();
          } else {
            for (let si = stack.length - 1; si >= 0; si--) {
              if (stack[si].type === need) {
                stack.splice(si, 1);
                break;
              }
            }
          }
          closes.push({ offset, line: li + 1, col: ci + 1, type: c });
        }
        offset++;
        continue;
      }
      offset++;
    }
    offset++; // the newline between lines
  }

  return { indents, closes };
}

/**
 * Re-indent AI-proposed text so it lines up with the code around it:
 *  - strips the LLM's own base indentation, then re-applies the target block's
 *    content indent plus the same relative depth per line;
 *  - blank lines stay blank (no trailing whitespace);
 *  - a trailing newline on `newText` is preserved.
 */
function reindentNewText(
  newText: string,
  baseIndent: string,
  style: IndentStyle
): string {
  const parts = newText.split("\n");
  if (parts.length === 0) return newText;
  const trailingNewline = parts[parts.length - 1] === "";
  if (trailingNewline) parts.pop();

  const nonBlank = parts.filter((l) => l.trim() !== "");
  if (nonBlank.length === 0) return trailingNewline ? newText : parts.join("\n");

  const width = (l: string) => leadingWhitespace(l).length;
  const minWidth = Math.min(...parts.filter((l) => l.trim() !== "").map(width));

  const out = parts.map((l) => {
    if (l.trim() === "") return "";
    const rel = Math.max(0, width(l) - minWidth);
    const indent =
      style.unit === "\t"
        ? baseIndent + "\t".repeat(Math.round(rel / style.levelWidth))
        : baseIndent + " ".repeat(rel);
    return indent + l.slice(leadingWhitespace(l).length);
  });

  if (trailingNewline) out.push("");
  return out.join("\n");
}

/**
 * Normalize every proposed edit's `newText` so inserted/modified lines keep the
 * exact indentation style (tabs vs spaces + nesting depth) of the surrounding
 * code. The model text is never modified — only the proposed replacement text.
 * Call AFTER `sanitizeStructuralEdits` so ranges already point at the right
 * block.
 */
export function normalizeEditIndentation(
  fileText: string,
  edits: AIEdit[]
): AIEdit[] {
  const style = inferIndentStyle(fileText);
  const structure = analyzeStructure(fileText, style);
  return edits.map((e) => {
    const anchorLine = clamp(
      Math.round(e.startLine),
      1,
      Math.max(1, structure.indents.length)
    );
    const baseIndent = structure.indents[anchorLine - 1] ?? "";
    return { ...e, newText: reindentNewText(e.newText, baseIndent, style) };
  });
}

/* ═══════════════════ Range math (Monaco-compatible, pure) ═══════════════════ */

/** 0-based char offset of a (1-based line, col) Monaco position. */
function offsetFor(fileText: string, line: number, col: number): number {
  if (line <= 1) return Math.max(0, col - 1);
  const lines = fileText.split("\n");
  const li = clamp(line - 1, 0, lines.length);
  let off = 0;
  for (let i = 0; i < li && i < lines.length; i++) off += lines[i].length + 1;
  if (li >= lines.length) return off;
  const maxCol = lines[li].length + 1;
  return off + clamp(col, 1, maxCol) - 1;
}

/** (1-based line, col) Monaco position for a 0-based char offset. */
function lineColAt(
  fileText: string,
  offset: number
): { line: number; col: number } {
  const lines = fileText.split("\n");
  let acc = 0;
  for (let li = 0; li < lines.length; li++) {
    const end = acc + lines[li].length;
    if (offset <= end) return { line: li + 1, col: offset - acc + 1 };
    acc = end + 1;
  }
  const last = lines.length ? lines.length - 1 : 0;
  return { line: lines.length || 1, col: (lines[last]?.length ?? 0) + 1 };
}

/** The exact substring Monaco would replace for this edit's range. */
function textInRange(fileText: string, edit: AIEdit): string {
  const s = offsetFor(fileText, edit.startLine, edit.startColumn);
  const e = offsetFor(fileText, edit.endLine, edit.endColumn);
  return fileText.slice(s, e);
}

/** Count opening/closing delimiters in a fragment (edit-local text). */
function delimCounts(text: string): {
  open: Record<string, number>;
  close: Record<string, number>;
} {
  const open: Record<string, number> = { "{": 0, "(": 0, "[": 0 };
  const close: Record<string, number> = { "}": 0, ")": 0, "]": 0 };
  for (const c of text) {
    if (c === "{" || c === "(" || c === "[") open[c]++;
    else if (c === "}" || c === ")" || c === "]") close[c]++;
  }
  return { open, close };
}

/**
 * Repair an edit that would delete a structural closing delimiter without the
 * model re-inserting it (e.g. a diff that replaced the function's trailing `}`
 * with the new statement). The deleted delimiters are kept, and the edit is
 * truncated to an insertion that lands immediately before them — so "end of
 * block" means "before the closing brace", never after it.
 */
export function repairDeletedDelimiters(
  fileText: string,
  edit: AIEdit
): AIEdit {
  const removed = textInRange(fileText, edit);
  const added = edit.newText;

  // Collect the trailing run of structural closers in the removed text
  // (`}`, `)`, `]`; a trailing `;` is ignored), skipping trailing whitespace.
  let scan = removed.length;
  while (scan > 0 && /\s/.test(removed[scan - 1])) scan--;
  const closers: ("}" | ")" | "]")[] = [];
  while (scan > 0 && /[})\];]/.test(removed[scan - 1])) {
    const c = removed[scan - 1];
    if (c === "}" || c === ")" || c === "]") closers.unshift(c);
    scan--;
  }
  if (closers.length === 0) return edit;

  const runStart = Math.max(0, scan);
  const removedCounts = delimCounts(removed);
  const addedCounts = delimCounts(added);

  // Only repair closer(s) the region truly "owns" (more closes than opens) and
  // that the added text does not bring back — never touch balanced deletion.
  const needsRepair = closers.some((c) => {
    const removedNet = removedCounts.close[c] - removedCounts.open[OPENER_OF[c]];
    const addedNet = addedCounts.close[c] - addedCounts.open[OPENER_OF[c]];
    return removedNet > 0 && addedNet < removedNet;
  });
  if (!needsRepair) return edit;

  // Keep the closer run (with the indentation right before it) in the document
  // and replace only the code ahead of it.
  const head = removed.slice(0, runStart);
  const keepPos = head.replace(/[\t ]+$/, "").length;

  const startOffset = offsetFor(fileText, edit.startLine, edit.startColumn);
  const endOffset = startOffset + keepPos;

  if (endOffset <= startOffset) {
    // The whole removed region was the closer — become a pure insertion that
    // lands immediately before it.
    return {
      ...edit,
      startColumn: edit.startColumn,
      endLine: edit.startLine,
      endColumn: edit.startColumn,
    };
  }
  const pos = lineColAt(fileText, endOffset);
  return { ...edit, endLine: pos.line, endColumn: pos.col };
}

/**
 * Relocate a PURE insertion that the model placed at (or beyond) the file's
 * final structural closer — i.e. an "append to end of file" that semantically
 * means "end of the enclosing block". The insertion is moved to just before
 * that closing delimiter so the brace always survives.
 */
export function snapInsertionBeforeLastCloser(
  fileText: string,
  edit: AIEdit,
  closes: StructuralCloser[]
): AIEdit {
  if (edit.startLine !== edit.endLine || edit.startColumn !== edit.endColumn) {
    return edit;
  }
  const last = closes[closes.length - 1];
  if (!last) return edit;
  const insOffset = offsetFor(fileText, edit.startLine, edit.startColumn);
  if (insOffset >= last.offset) {
    return {
      ...edit,
      startLine: last.line,
      startColumn: last.col,
      endLine: last.line,
      endColumn: last.col,
    };
  }
  return edit;
}

/**
 * Make proposed edits structurally safe BEFORE they are displayed/applied:
 *  1. never delete a lone closing delimiter the model didn't re-insert;
 *  2. snap end-of-file insertions to land before the block's closing delimiter.
 */
export function sanitizeStructuralEdits(
  fileText: string,
  edits: AIEdit[]
): AIEdit[] {
  const style = inferIndentStyle(fileText);
  const structure = analyzeStructure(fileText, style);
  return edits.map((edit) => {
    const repaired = repairDeletedDelimiters(fileText, edit);
    return snapInsertionBeforeLastCloser(fileText, repaired, structure.closes);
  });
}

/**
 * Apply edits to a source string with Monaco-equivalent range semantics, as a
 * single pure operation (used for validation and tests; the live editor uses
 * `applyEditsToEditor`).
 */
export function applyEditsToText(fileText: string, edits: AIEdit[]): string {
  const pairs = edits
    .map((e) => ({
      e,
      s: offsetFor(fileText, e.startLine, e.startColumn),
      t: offsetFor(fileText, e.endLine, e.endColumn),
    }))
    .sort((a, b) => b.s - a.s);
  let result = fileText;
  for (const { e, s, t } of pairs) {
    result = result.slice(0, s) + e.newText + result.slice(t);
  }
  return result;
}

/**
 * Validate that every structural delimiter (`{}`, `()`, `[]`) stays balanced
 * after the edits would be applied. The closing braces of the original document
 * may never silently disappear.
 */
export function validateStructuralBalance(
  fileText: string,
  edits: AIEdit[]
): { valid: boolean; unbalanced: ("{" | "(" | "[")[] } {
  const result = applyEditsToText(fileText, edits);
  const counts = delimCounts(result);
  const unbalanced: ("{" | "(" | "[")[] = [];
  for (const o of ["{", "(", "["] as const) {
    if (counts.open[o] !== counts.close[CLOSER_OF[o]]) unbalanced.push(o);
  }
  return { valid: unbalanced.length === 0, unbalanced };
}

interface InlineSuggestionCallbacks {
  onApply: () => void;
  onReject: () => void;
  /** Optional extra label, e.g. the change explanation. */
  label?: string;
  /** When provided, renders a "previous suggestion" control in the widget. */
  onPrev?: () => void;
  /** When provided, renders a "next suggestion" control in the widget. */
  onNext?: () => void;
  /** e.g. "1 / 3" — shown next to the nav controls when navigating. */
  positionLabel?: string;
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
      const shownAdded =
        added.length > MAX_GHOST_LINES ? added.slice(0, MAX_GHOST_LINES) : added;
      const ghost =
        shownAdded.join("\n") +
        (added.length > MAX_GHOST_LINES
          ? `\n… (+${added.length - MAX_GHOST_LINES} more)`
          : "") +
        "\n";
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
    const badge = document.createElement("span");
    badge.className = "bcl-ai-widget-badge";
    badge.textContent = "✦";
    head.appendChild(badge);
    const label = document.createElement("span");
    label.className = "bcl-ai-widget-label";
    label.textContent = "AI suggested change";
    head.appendChild(label);
    if (callbacks.onPrev || callbacks.onNext) {
      const nav = document.createElement("div");
      nav.className = "bcl-ai-widget-nav";
      if (callbacks.onPrev) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "bcl-ai-widget-navbtn";
        b.innerHTML = "‹";
        b.title = "Previous suggestion (Alt+[)";
        b.onclick = (ev) => {
          ev.stopPropagation();
          callbacks.onPrev?.();
        };
        nav.appendChild(b);
      }
      if (callbacks.positionLabel) {
        const pos = document.createElement("span");
        pos.className = "bcl-ai-widget-pos";
        pos.textContent = callbacks.positionLabel;
        nav.appendChild(pos);
      }
      if (callbacks.onNext) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "bcl-ai-widget-navbtn";
        b.innerHTML = "›";
        b.title = "Next suggestion (Alt+])";
        b.onclick = (ev) => {
          ev.stopPropagation();
          callbacks.onNext?.();
        };
        nav.appendChild(b);
      }
      head.appendChild(nav);
    }
    root.appendChild(head);

    const body = document.createElement("div");
    body.className = "bcl-ai-widget-diff";
    // Reuse the snapshot captured when the suggestion was attached instead of
    // re-reading the whole model for every edit.
    const { removed, added } = edits.reduce<{
      removed: string[];
      added: string[];
    }>(
      (acc, e) => {
        const r = resolveEditLines(fileText, e);
        acc.removed.push(...r.removed);
        acc.added.push(...r.added);
        return acc;
      },
      { removed: [], added: [] }
    );
    const allRows: { kind: "remove" | "add"; text: string }[] = [
      ...removed.map((t) => ({ kind: "remove" as const, text: t })),
      ...added.map((t) => ({ kind: "add" as const, text: t })),
    ];
    const overflow = allRows.length - MAX_WIDGET_LINES;
    const rows = overflow > 0 ? allRows.slice(0, MAX_WIDGET_LINES) : allRows;

    rows.forEach(({ kind, text }) => {
      const row = document.createElement("div");
      row.className = `bcl-ai-widget-row bcl-ai-widget-${kind}`;
      row.innerHTML = `<span class="bcl-ai-widget-sign">${
        kind === "remove" ? "−" : "+"
      }</span><code>${escapeHtml(text)}</code>`;
      body.appendChild(row);
    });
    if (overflow > 0) {
      const row = document.createElement("div");
      row.className = "bcl-ai-widget-row bcl-ai-widget-more";
      row.textContent = `… ${overflow} more line${overflow === 1 ? "" : "s"}`;
      body.appendChild(row);
    }
    if (rows.length === 0 && overflow <= 0) {
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
