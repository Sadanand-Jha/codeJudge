# Editor Component Architecture

## Overview

The editor is a LeetCode/Sublime-inspired code editor with language selection, code editing, input/output panels, resizable panes, and code execution. It is refactored from a single monolithic component (~298 lines) into 11 focused components with supporting infrastructure.

## File Structure

```
src/
├── types/editor.ts                    # TypeScript type definitions
├── constants/languages.ts             # Language options & default code templates
├── config/editor.ts                   # Theme colors, dimensions, Monaco options
├── context/EditorContext.tsx          # React context (EditorProvider + useEditorContext)
├── store/editorStore.ts               # Zustand store stub (unused — context/hook pattern used)
├── hooks/useEditor.ts                 # Custom hook — all state & logic
├── services/editor.ts                 # API service functions (runCode, getAllLanguages)
└── components/editor/
    ├── README.md                      # This file
    ├── index.ts                       # Barrel exports
    ├── CodeEditor.tsx                 # 🏠 Parent orchestrator (entry point)
    ├── EditorHeader.tsx               # 📋 Header bar (language selector + action buttons)
    ├── EditorToolbar.tsx              # 📂 File tab bar (code.cpp tab)
    ├── EditorFooter.tsx               # 📊 Status bar (cursor position, language label)
    ├── LanguageSelector.tsx           # 🔽 Language dropdown
    ├── RunButton.tsx                  # ▶️ Run button with play icon
    ├── SubmitButton.tsx               # 📤 Submit button
    ├── MonacoEditor.tsx               # ✏️ Monaco editor wrapper with Sublime Monokai theme
    ├── ConsolePanel.tsx               # 📟 Right panel (input + output with resizer)
    ├── TestcasePanel.tsx              # 📝 Input/testcase panel
    ├── OutputPanel.tsx                # 📤 Output display panel
```

## Component Tree

```
EditorPage (page.tsx)
└── CodeEditor                              ← Entry point, orchestrates everything
    ├── EditorHeader                        ← Header bar
    │   ├── LanguageSelector                ← Language dropdown (left side)
    │   ├── SubmitButton                    ← Submit button (right side, optional)
    │   └── RunButton                       ▶️ Run with Play icon (right side)
    ├── [Workspace Container]
    │   ├── [Left Pane]
    │   │   ├── EditorToolbar               ← File tab bar (code.cpp)
    │   │   └── MonacoEditor                ← Main code editor
    │   ├── [Vertical Resizer]              ← Drag to resize left-right panes
    │   └── ConsolePanel                    ← Right panel
    │       ├── TestcasePanel               ← Input editor (plaintext)
    │       ├── [Horizontal Resizer]        ← Drag to resize input-output
    │       └── OutputPanel                 ← Output display
    └── EditorFooter                        ← Status bar (cursor pos, language)
```

## Data Flow

### State Management

All state lives in the `useEditor()` hook (`src/hooks/useEditor.ts`). It is NOT lifted to a global store — the hook is called once in `CodeEditor` and state is passed down via props to child components.

```
useEditor() Hook
├── State
│   ├── language         → LanguageSelector, EditorHeader, MonacoEditor, EditorFooter
│   ├── code             → MonacoEditor
│   ├── input            → TestcasePanel (via ConsolePanel)
│   ├── output           → OutputPanel (via ConsolePanel)
│   ├── cursorPosition   → EditorFooter
│   ├── isCompiling      → EditorHeader → RunButton
│   ├── rightPanelWidth  → ConsolePanel (style)
│   └── inputPanelHeight → ConsolePanel (style)
│
├── Refs
│   ├── monacoRef        → MonacoEditor (Monaco API instance)
│   ├── mainEditorRef    → MonacoEditor (editor instance)
│   ├── workspaceRef     → Container div (for resize calculations)
│   └── dragStateRef     → ConsolePanel + Vertical Resizer (drag tracking)
│
├── Actions
│   ├── handleLanguageChange   → EditorHeader → LanguageSelector
│   ├── handleCodeChange       → MonacoEditor
│   ├── handleCursorChange     → MonacoEditor (onMount callback)
│   ├── runCode                → EditorHeader → RunButton
│   └── setInput               → ConsolePanel → TestcasePanel
│
└── Derived
    ├── currentLangObj  → EditorFooter
    └── activeFileName  → EditorToolbar
```

### API Call Flow

```
RunButton (click)
  → EditorHeader.onRun()
    → CodeEditor.runCode()
      → useEditor().runCode()
        → services/editor.ts: runCodeService(code, input)
          → userDirectApi (NEXT_JUDGE0_URL) POST /api/run
            → Response: { stdout, message, ... }
              → setOutput(data.stdout || data.message || error)
```

### Resize Drag Flow

```
Vertical Resizer (onPointerDown)
  → dragStateRef.current = { kind: "left-right", startX, startWidth }
  → window "pointermove" handler
    → Calculates rightPanelWidth from mouse X
    → setRightPanelWidth(clamped value)
  → window "pointerup" handler
    → dragStateRef.current = null
    → Resets cursor & user-select

ConsolePanel Horizontal Resizer (onPointerDown)
  → dragStateRef.current = { kind: "input-output", startY, startInputHeight }
  → window "pointermove" handler
    → Calculates inputPanelHeight from mouse Y delta
    → setInputPanelHeight(clamped value)
  → window "pointerup" handler (shared)
    → Cleans up
```

## Component Props Reference

| Component | Props | Source |
|-----------|-------|--------|
| `CodeEditor` | *(none — uses useEditor hook internally)* | Page entry point |
| `EditorHeader` | `language`, `options`, `onLanguageChange`, `onRun`, `isCompiling`, `onSubmit?`, `isSubmitting?` | CodeEditor |
| `EditorToolbar` | `fileName` | CodeEditor (`activeFileName`) |
| `EditorFooter` | `cursorPosition`, `languageLabel` | CodeEditor |
| `LanguageSelector` | `language`, `options`, `onChange` | EditorHeader |
| `RunButton` | `onClick`, `isCompiling` | EditorHeader |
| `SubmitButton` | `onClick`, `isSubmitting` | EditorHeader |
| `MonacoEditor` | `language`, `value`, `onChange?`, `onMount?`, `options?` | CodeEditor |
| `ConsolePanel` | `input`, `output`, `onInputChange`, `inputHeight`, `rightPanelWidth`, `dragStateRef` | CodeEditor |
| `TestcasePanel` | `input`, `onChange` | ConsolePanel |
| `OutputPanel` | `output` | ConsolePanel |

## Theme

The Sublime Monokai theme is defined in `MonacoEditor.tsx` via `monaco.editor.defineTheme("sublime-monokai", ...)` and is applied on editor mount. Colors reference:

- Background: `#272822` (SUBLIME_BG)
- UI Background: `#1e1e1e` (UI_BG)
- Border: `#333333` (BORDER_COLOR)
- Keyword: `#F92672`
- String: `#E6DB74`
- Function: `#A6E22E`
- Number: `#AE81FF`
- Comment: `#75715E`
- Type: `#66D9EF`

## Constants & Config

- **`src/constants/languages.ts`** — `LANGUAGE_OPTIONS` (cpp, python, java, javascript), `DEFAULT_CODE` per language, `DEFAULT_INPUT`
- **`src/config/editor.ts`** — `SUBLIME_BG`, `UI_BG`, `BORDER_COLOR`, `DEFAULT_RIGHT_WIDTH` (450), `MIN_RIGHT_WIDTH` (200), `DEFAULT_INPUT_HEIGHT` (250), `MIN_INPUT_HEIGHT` (100), `commonEditorOptions`, `mainEditorOptions`