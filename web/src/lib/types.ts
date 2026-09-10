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
  color: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minimized?: boolean;
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
