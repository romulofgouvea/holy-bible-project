/**
 * Centralized Domain Models for the Holy Bible application
 */

// Bible Domain Models
export type Book = {
  abbrev: string;
  name: string;
  chapters: string[][];
};

export type BibleVersionInfo = {
  name: string;
  sigla: string;
  year: number;
  publisher: string;
  language: string;
};

export interface HighlightItem {
  color: string;
  abbrev: string; // Replacing 'book' with 'abbrev' as requested
  chapter: number;
  verse: number;
}

export type DrawingTool = "pen" | "marker";

export interface DrawingStroke {
  id: string;
  tool: DrawingTool;
  color: string;
  width: number;
  points: number[];
}

export type VerseReference = {
  version: string;
  bookAbbrev: string;
  bookName: string;
  chapter: number;
  verse: number;
};

export type DrawingEntry = VerseReference & {
  timestamp: number;
  strokes: DrawingStroke[];
};

export type VerseDrawings = Record<string, DrawingEntry>;

export interface VerseNote {
  id: string;
  selectedVerses: Omit<SelectedVerse, "text">[];
  text: string;
  createdAt: number;
  updatedAt: number;
}

export type SelectedVerse = VerseReference & {
  text: string;
  compareText?: string;
  compareVersion?: string;
};

export type HistoryItem = VerseReference & {
  timestamp: number;
};

// Studies Domain Models
export type Study = {
  id: string;
  title: string;
  createdAt: string;
  timestamp?: number;
  content: string;
  isActive?: boolean;
  deletedAt?: number;
};

// Reading Plan Domain Models
export type ActiveBiblePlanDay = {
  isCompleted: boolean;
  completedAt?: number;
};

export type ActiveBiblePlan = {
  id: string;
  templateId: string;
  title: string;
  startedAt: number;
  completedDays: Record<string, ActiveBiblePlanDay>;
  completedChapters?: Record<string, ActiveBiblePlanDay>;
  pausedAt?: number;
  pausedMs?: number;
};

// Reader Settings Domain Models
export type ReaderTheme = "light" | "dark" | "sepia";
export type ReaderFont = "poppins" | "monospace";
export type TextAlign = "auto" | "left" | "right" | "center" | "justify";

// Bible Title Models
export interface VerseTitle {
  title: string;
  startVerse: number;
  endVerse: number;
  type: "section" | "subsection" | "speech" | string;
  positionIndex: number;
}

export interface ChapterTitle {
  number: number;
  titles: VerseTitle[];
}

export interface BookTitle {
  name: string;
  abbrev: string;
  chapters: ChapterTitle[];
}

export interface VersionTitle {
  version: string;
  books: BookTitle[];
}

// Bible Audio Models
export interface VerseAudioTiming {
  verse: number;
  start: number;
}

export interface ChapterAudioManifest {
  version: string;
  abbrev: string;
  chapter: number;
  duration: number;
  verses: VerseAudioTiming[];
}

export type BookDownloadSummary = {
  abbrev: string;
  name: string;
  totalChapters: number;
  downloadedChapters: number;
};
