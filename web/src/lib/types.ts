export const NOTE_COLORS = [
  "#FFF59D",
  "#F8BBD0",
  "#BBDEFB",
  "#C8E6C9",
  "#FFE0B2",
] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export type Note = {
  id: string;
  pageKey: string;
  url: string;
  title: string;
  text: string;
  /** Rich-text HTML version of the note (bold/italic/bullets). `text` is kept
   * as a plain-text mirror of this for search, exports, and card previews. */
  html?: string | null;
  color: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minimized?: boolean;
  /** Universal note: shows on every page, not just pageKey's. */
  locked?: boolean;
  /** false once a note has been taken off every page (lives only in the bank). */
  stuck?: boolean;
  createdAt: number;
  updatedAt: number;
  projectId: string | null;
  tags: string[];
  archived: boolean;
  anchorText?: string | null;
  snapshotUrl?: string | null;
  /** Optional citation author (person or organization). Free to set; may be filled from page meta. */
  sourceAuthor?: string | null;
  /** Optional publication date as YYYY-MM-DD when known. */
  sourcePublishedAt?: string | null;
  /** Position on a PDF page. Ratios are fractions of that page's width and height. */
  pdfAnchor?: {
    page: number;
    xRatio: number;
    yRatio: number;
  } | null;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  summary: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

export type UserSettings = {
  syncEnabled: boolean;
  autoGroup: boolean;
  saveSnapshot: boolean;
};

export type UserProfile = {
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: number;
  settings: UserSettings;
};

export const DEFAULT_SETTINGS: UserSettings = {
  syncEnabled: true,
  autoGroup: false,
  saveSnapshot: false,
};

export type GroupBy = "project" | "site" | "date";
