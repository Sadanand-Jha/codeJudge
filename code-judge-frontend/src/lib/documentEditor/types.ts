export type PageSize = "A4" | "Letter" | "Legal";
export type Orientation = "portrait" | "landscape";
export type Placement = "flow" | "free";
export type BlockType =
  | "heading"
  | "text"
  | "instructions"
  | "section"
  | "question"
  | "table"
  | "divider"
  | "image"
  | "shape"
  | "freeText"
  | "field"
  | "equation"
  | "note"
  | "signature";

export type ListKind = "none" | "bullet" | "decimal" | "lower-alpha" | "upper-alpha" | "lower-roman" | "upper-roman";
export type TextAlign = "left" | "center" | "right" | "justify";

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface DocumentSettings {
  pageSize: PageSize;
  orientation: Orientation;
  margins: PageMargins;
  columns: 1 | 2;
  defaultFontFamily: string;
  defaultFontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  showMarginGuides: boolean;
}

export interface DocumentChrome {
  headerHtml: string;
  footerLeftHtml: string;
  showHeader: boolean;
  showFooter: boolean;
  showPageNumbers: boolean;
  showOnFirstPage: boolean;
}

export interface DocumentMeta {
  title: string;
  institution: string;
  subject: string;
  course: string;
  date: string;
  timeAllowed: string;
  maxMarks: number;
  setLabel: string;
}

export interface DocumentBlock {
  id: string;
  type: BlockType;
  placement: Placement;
  html: string;
  /** Millimetres from the page's top-left corner for free-positioned blocks. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  marks?: number;
  sectionId?: string;
  questionNumber?: number;
  level?: 1 | 2 | 3;
  align?: TextAlign;
  listKind?: ListKind;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  paragraphSpacing?: number;
  tabStops?: number[];
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  alt?: string;
  src?: string;
  shape?: "rectangle" | "ellipse" | "line";
  latex?: string;
  fieldLabel?: string;
  fieldValue?: string;
  whiteBackground?: boolean;
  /** Imported PDF text retains its original font-size and position. */
  imported?: boolean;
}

export interface DocumentComment {
  id: string;
  pageId: string;
  blockId: string;
  author: string;
  text: string;
  createdAt: string;
  resolved: boolean;
}

export interface DocumentChange {
  id: string;
  pageId: string;
  blockId: string;
  before: string;
  after: string;
  createdAt: string;
  status: "pending" | "accepted" | "rejected";
}

export interface StrokePoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  pageId: string;
  tool: "pen" | "highlighter";
  color: string;
  width: number;
  opacity: number;
  points: StrokePoint[];
}

export interface DocumentPage {
  id: string;
  blocks: DocumentBlock[];
  /** A rendered PDF page used as a non-destructive import backdrop. */
  background?: string;
  /** PDF imports hide the generated header/footer chrome. */
  chrome: boolean;
  kind: "flow" | "imported";
  drawings: DrawingStroke[];
}

export interface ShareSettings {
  role: "owner" | "editor" | "commenter" | "viewer";
  linkRole: "editor" | "commenter" | "viewer";
  allowComments: boolean;
  allowDownload: boolean;
}

export interface ExamDocument {
  id: string;
  title: string;
  meta: DocumentMeta;
  settings: DocumentSettings;
  chrome: DocumentChrome;
  pages: DocumentPage[];
  comments: DocumentComment[];
  changes: DocumentChange[];
  share: ShareSettings;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersion {
  id: string;
  label: string;
  createdAt: string;
  document: ExamDocument;
}

export interface FindOptions {
  query: string;
  replacement: string;
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface DocumentTotals {
  total: number;
  bySection: Record<string, number>;
  questionCount: number;
}

export type EditorTool = "select" | "text" | "pen" | "highlighter" | "eraser";

export const PAGE_DIMENSIONS_MM: Record<PageSize, { width: number; height: number }> = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
  Legal: { width: 215.9, height: 355.6 },
};

export const ptToMm = (points: number): number => points * 0.3527777778;
export const mmToPx = (mm: number): number => mm * 3.7795275591;

export function pageDimensions(settings: DocumentSettings): { width: number; height: number } {
  const base = PAGE_DIMENSIONS_MM[settings.pageSize];
  return settings.orientation === "landscape"
    ? { width: base.height, height: base.width }
    : { width: base.width, height: base.height };
}
