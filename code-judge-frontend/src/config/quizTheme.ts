/**
 * Premium Pink Theme — Quiz / Assessment Module
 *
 * Dark Theme
 * ----------
 * Background: #09090B
 * Surface:    #111217
 * Cards:      #171923
 * Primary Pink:   #EC4899
 * Dark Pink:      #BE185D
 * Accent Pink:    #F472B6
 * Hover Pink:     #DB2777
 * Border:         rgba(255,255,255,.08)
 *
 * Text
 * Primary:    #FFFFFF
 * Secondary:  #A1A1AA
 *
 * Success: #22C55E
 * Warning: #F59E0B
 * Danger:  #EF4444
 *
 * Light Theme
 * ------------
 * Background: #FAFAFB
 * Surface:    #FFFFFF
 * Cards:      #FFFFFF
 * Primary Pink:   #EC4899
 * Secondary Pink: #F9A8D4
 * Border:         #E5E7EB
 * Primary Text:   #111827
 * Secondary Text: #6B7280
 */

export const quizTheme = {
  dark: {
    background: "#09090B",
    surface: "#111217",
    card: "#171923",
    cardHover: "#1E2030",
    border: "rgba(255,255,255,0.08)",
    borderHover: "rgba(255,255,255,0.14)",
    primary: "#EC4899",
    darkPink: "#BE185D",
    accent: "#F472B6",
    hover: "#DB2777",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    textMuted: "#71717A",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
  light: {
    background: "#FAFAFB",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    cardHover: "#FDF2F8",
    border: "#E5E7EB",
    borderHover: "#F9A8D4",
    primary: "#EC4899",
    darkPink: "#BE185D",
    accent: "#F472B6",
    hover: "#DB2777",
    secondaryPink: "#F9A8D4",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
  },
} as const;

/** Primary pink gradient used for hero sections and CTAs */
export const pinkGradient = "from-[#EC4899] to-[#BE185D]";
export const pinkGradientSoft = "from-[#EC4899]/20 to-[#F472B6]/10";
export const pinkGradientAccent = "from-[#F472B6] to-[#EC4899]";

/** Difficulty badge colors */
export const difficultyColors: Record<string, { bg: string; text: string; border: string }> = {
  Easy: { bg: "rgba(34,197,94,0.10)", text: "#22C55E", border: "rgba(34,197,94,0.25)" },
  Medium: { bg: "rgba(245,158,11,0.10)", text: "#F59E0B", border: "rgba(245,158,11,0.25)" },
  Hard: { bg: "rgba(239,68,68,0.10)", text: "#EF4444", border: "rgba(239,68,68,0.25)" },
  Expert: { bg: "rgba(236,72,153,0.10)", text: "#EC4899", border: "rgba(236,72,153,0.25)" },
};

/** Option card colors (Quizizz-style colorful answer cards) */
export const optionColors = [
  { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", text: "#3B82F6", solid: "#3B82F6" },
  { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", text: "#22C55E", solid: "#22C55E" },
  { bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.25)", text: "#F97316", solid: "#F97316" },
  { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.25)", text: "#EC4899", solid: "#EC4899" },
  { bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.25)", text: "#8B5CF6", solid: "#8B5CF6" },
  { bg: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.25)", text: "#0EA5E9", solid: "#0EA5E9" },
  { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)", text: "#EAB308", solid: "#EAB308" },
  { bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.25)", text: "#14B8A6", solid: "#14B8A6" },
];

/** Question type metadata for the picker grid */
export interface QuestionTypeMeta {
  id: string;
  label: string;
  description: string;
  category: "Basic" | "Text" | "Programming" | "Math" | "Interactive" | "Media";
  icon: string;
  color: string;
}

export const QUESTION_TYPE_META: QuestionTypeMeta[] = [
  // Basic
  { id: "single_choice", label: "Multiple Choice", description: "Single correct answer", category: "Basic", icon: "CircleDot", color: "#3B82F6" },
  { id: "multiple_choice", label: "Multiple Select", description: "Multiple correct answers", category: "Basic", icon: "ListChecks", color: "#22C55E" },
  { id: "true_false", label: "True / False", description: "Binary choice", category: "Basic", icon: "ToggleRight", color: "#F59E0B" },
  { id: "text", label: "Short Answer", description: "Text response", category: "Text", icon: "Type", color: "#EC4899" },
  { id: "paragraph", label: "Paragraph", description: "Long text response", category: "Text", icon: "AlignLeft", color: "#8B5CF6" },
  { id: "fill_blanks", label: "Fill in Blanks", description: "Complete the text", category: "Text", icon: "FileText", color: "#14B8A6" },
  { id: "table_fill", label: "Table Fill", description: "Fill table cells", category: "Text", icon: "Table", color: "#F97316" },
  // Programming
  { id: "code_output", label: "Programming", description: "Code evaluation (future)", category: "Programming", icon: "Code2", color: "#06B6D4" },
  // Math
  { id: "math", label: "Math", description: "Mathematical expression", category: "Math", icon: "Sigma", color: "#EC4899" },
  { id: "graph", label: "Graph", description: "Graph-based question", category: "Math", icon: "LineChart", color: "#8B5CF6" },
  { id: "formula", label: "Formula", description: "Formula-based answer", category: "Math", icon: "FunctionSquare", color: "#F59E0B" },
  // Interactive
  { id: "matching", label: "Match", description: "Pair items", category: "Interactive", icon: "Link2", color: "#3B82F6" },
  { id: "ordering", label: "Reorder", description: "Sequence items", category: "Interactive", icon: "ListOrdered", color: "#22C55E" },
  { id: "drag_drop", label: "Drag & Drop", description: "Move items", category: "Interactive", icon: "Move", color: "#F97316" },
  { id: "categorize", label: "Categorize", description: "Group items", category: "Interactive", icon: "FolderTree", color: "#EC4899" },
  { id: "hotspot", label: "Hotspot", description: "Click on image", category: "Interactive", icon: "MousePointerClick", color: "#14B8A6" },
  // Media
  { id: "image_label", label: "Image Label", description: "Label image parts", category: "Media", icon: "Image", color: "#8B5CF6" },
  { id: "drawing", label: "Drawing", description: "Draw response", category: "Media", icon: "PenTool", color: "#F59E0B" },
  { id: "video_response", label: "Video Response", description: "Record video", category: "Media", icon: "Video", color: "#EF4444" },
  { id: "audio_response", label: "Audio Response", description: "Record audio", category: "Media", icon: "Mic", color: "#3B82F6" },
  { id: "poll", label: "Poll", description: "Instant poll", category: "Media", icon: "BarChart3", color: "#22C55E" },
  { id: "word_cloud", label: "Word Cloud", description: "Word responses", category: "Media", icon: "Cloud", color: "#EC4899" },
];

/** Question type icon mapping for lucide-react */
export const QUESTION_TYPE_ICONS: Record<string, string> = {
  CircleDot: "CircleDot",
  ListChecks: "ListChecks",
  ToggleRight: "ToggleRight",
  Type: "Type",
  AlignLeft: "AlignLeft",
  FileText: "FileText",
  Table: "Table",
  Code2: "Code2",
  Sigma: "Sigma",
  LineChart: "LineChart",
  FunctionSquare: "FunctionSquare",
  Link2: "Link2",
  ListOrdered: "ListOrdered",
  Move: "Move",
  FolderTree: "FolderTree",
  MousePointerClick: "MousePointerClick",
  Image: "Image",
  PenTool: "PenTool",
  Video: "Video",
  Mic: "Mic",
  BarChart3: "BarChart3",
  Cloud: "Cloud",
};