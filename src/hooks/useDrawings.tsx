import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, DeviceEventEmitter } from "react-native";
import { STORAGE_KEYS } from "../constants/storage";
import {
  DrawingEntry,
  DrawingStroke,
  DrawingTool,
  VerseDrawings,
  VerseReference,
} from "../models";
import { BACKUP_RESTORED_EVENT, writeAutoBackupFile } from "../utils/backup";
import { getVerseDrawingKey, isDrawingEntry } from "../utils/drawing";
import { useTheme } from "./useTheme";

export const MIN_STROKE_WIDTH = 2;
export const MAX_STROKE_WIDTH = 14;
export const DEFAULT_STROKE_WIDTH = 6;
export const MARKER_OPACITY = 0.4;
export const MARKER_WIDTH_FACTOR = 3;
export const MAX_RECENT_COLORS = 5;
const PERSIST_DELAY = 400;

type StrokeItem = { ref: VerseReference; stroke: DrawingStroke };
type UndoGroup = { key: string; id: string }[];

type DrawingContextType = {
  drawings: VerseDrawings;
  isDrawMode: boolean;
  isErasing: boolean;
  tool: DrawingTool;
  color: string;
  recentColors: string[];
  baseWidth: number;
  strokeWidth: number;
  showDrawings: boolean;
  canUndo: boolean;
  canRedo: boolean;
  startDrawMode: () => void;
  stopDrawMode: () => void;
  setTool: (tool: DrawingTool) => void;
  setIsErasing: (value: boolean) => void;
  setColor: (color: string) => void;
  setBaseWidth: (value: number) => void;
  setShowDrawings: (value: boolean) => void;
  addStroke: (ref: VerseReference, stroke: DrawingStroke) => void;
  addStrokes: (items: StrokeItem[]) => void;
  removeStroke: (key: string, id: string) => void;
  replaceStroke: (key: string, id: string, pieces: DrawingStroke[]) => void;
  undo: () => void;
  redo: () => void;
  clearVerses: (
    version: string,
    bookAbbrev: string,
    chapter: number,
    verses: number[],
  ) => void;
};

const DrawingContext = createContext<DrawingContextType | null>(null);

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDrawings: VerseDrawings | null = null;

const flushDrawings = () => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  if (pendingDrawings) writeDrawings(pendingDrawings);
  pendingDrawings = null;
};

const persist = (next: VerseDrawings) => {
  pendingDrawings = next;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(flushDrawings, PERSIST_DELAY);
};

const writeDrawings = (next: VerseDrawings) => {
  AsyncStorage.setItem(
    STORAGE_KEYS.DRAWINGS,
    JSON.stringify(Object.values(next)),
  )
    .then(() => AsyncStorage.getItem(STORAGE_KEYS.AUTO_BACKUP))
    .then((val) => {
      if (val === "true") writeAutoBackupFile().catch(() => {});
    })
    .catch(() => {});
};

const keyOf = (ref: VerseReference) =>
  getVerseDrawingKey(ref.version, ref.bookAbbrev, ref.chapter, ref.verse);

export function DrawingProvider({ children }: { children: React.ReactNode }) {
  const [drawings, setDrawings] = useState<VerseDrawings>({});
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [tool, setToolState] = useState<DrawingTool>("pen");
  const { colors } = useTheme();
  const [storedColor, setStoredColor] = useState<string | null>(null);
  const color = storedColor ?? colors.primary;
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [baseWidth, setBaseWidthState] = useState(DEFAULT_STROKE_WIDTH);
  const [showDrawings, setShowDrawingsState] = useState(true);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const undoStackRef = useRef<UndoGroup[]>([]);
  const redoStackRef = useRef<StrokeItem[][]>([]);
  const drawingsRef = useRef<VerseDrawings>({});

  const apply = useCallback((next: VerseDrawings) => {
    drawingsRef.current = next;
    setDrawings(next);
    persist(next);
  }, []);

  const syncStacks = useCallback(() => {
    setUndoCount(undoStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
  }, []);

  const resetStacks = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncStacks();
  }, [syncStacks]);

  const load = useCallback(async () => {
    try {
      const [stored, show, savedColor, savedRecent, savedWidth] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.DRAWINGS),
          AsyncStorage.getItem(STORAGE_KEYS.SHOW_DRAWINGS),
          AsyncStorage.getItem(STORAGE_KEYS.DRAWING_COLOR),
          AsyncStorage.getItem(STORAGE_KEYS.DRAWING_RECENT_COLORS),
          AsyncStorage.getItem(STORAGE_KEYS.DRAWING_WIDTH),
        ]);
      const parsedWidth = Number(savedWidth);
      if (savedWidth !== null && Number.isFinite(parsedWidth)) {
        setBaseWidthState(
          Math.min(
            MAX_STROKE_WIDTH,
            Math.max(MIN_STROKE_WIDTH, Math.round(parsedWidth)),
          ),
        );
      }
      setStoredColor(savedColor);
      const recent = savedRecent ? JSON.parse(savedRecent) : [];
      setRecentColors(
        Array.isArray(recent)
          ? recent
              .filter((c) => typeof c === "string")
              .slice(0, MAX_RECENT_COLORS)
          : [],
      );
      const raw = stored ? JSON.parse(stored) : [];
      const parsed: VerseDrawings = {};
      if (Array.isArray(raw)) {
        raw.filter(isDrawingEntry).forEach((entry) => {
          parsed[
            getVerseDrawingKey(
              entry.version,
              entry.bookAbbrev,
              entry.chapter,
              entry.verse,
            )
          ] = entry;
        });
      }
      drawingsRef.current = parsed;
      setDrawings(parsed);
      setShowDrawingsState(show !== "false");
      resetStacks();
    } catch {
      drawingsRef.current = {};
      setDrawings({});
    }
  }, [resetStacks]);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(BACKUP_RESTORED_EVENT, load);
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state !== "active") flushDrawings();
    });
    return () => {
      sub.remove();
      appStateSub.remove();
    };
  }, [load]);

  const insertStrokes = useCallback(
    (items: StrokeItem[]) => {
      const next = { ...drawingsRef.current };
      const now = Date.now();
      items.forEach(({ ref, stroke }) => {
        const key = keyOf(ref);
        const entry: DrawingEntry = {
          ...ref,
          timestamp: now,
          strokes: [...(next[key]?.strokes ?? []), stroke],
        };
        next[key] = entry;
      });
      apply(next);
      undoStackRef.current = [
        ...undoStackRef.current,
        items.map(({ ref, stroke }) => ({ key: keyOf(ref), id: stroke.id })),
      ];
    },
    [apply],
  );

  const rememberColor = useCallback((value: string) => {
    setRecentColors((prev) => {
      const next = [value, ...prev.filter((c) => c !== value)].slice(
        0,
        MAX_RECENT_COLORS,
      );
      AsyncStorage.setItem(
        STORAGE_KEYS.DRAWING_RECENT_COLORS,
        JSON.stringify(next),
      ).catch(() => {});
      return next;
    });
  }, []);

  const addStrokes = useCallback(
    (items: StrokeItem[]) => {
      if (items.length === 0) return;
      redoStackRef.current = [];
      insertStrokes(items);
      syncStacks();
      rememberColor(items[0].stroke.color);
    },
    [insertStrokes, syncStacks, rememberColor],
  );

  const addStroke = useCallback(
    (ref: VerseReference, stroke: DrawingStroke) =>
      addStrokes([{ ref, stroke }]),
    [addStrokes],
  );

  const removeStroke = useCallback(
    (key: string, id: string) => {
      const current = drawingsRef.current;
      const entry = current[key];
      if (!entry) return;
      const filtered = entry.strokes.filter((s) => s.id !== id);
      const next = { ...current };
      if (filtered.length === 0) delete next[key];
      else next[key] = { ...entry, timestamp: Date.now(), strokes: filtered };
      apply(next);
    },
    [apply],
  );

  const replaceStroke = useCallback(
    (key: string, id: string, pieces: DrawingStroke[]) => {
      const current = drawingsRef.current;
      const entry = current[key];
      if (!entry) return;
      const strokes = entry.strokes.flatMap((s) =>
        s.id === id ? pieces : [s],
      );
      const next = { ...current };
      if (strokes.length === 0) delete next[key];
      else next[key] = { ...entry, timestamp: Date.now(), strokes };
      apply(next);
    },
    [apply],
  );

  const undo = useCallback(() => {
    const group = undoStackRef.current[undoStackRef.current.length - 1];
    if (!group) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    const next = { ...drawingsRef.current };
    const removed: StrokeItem[] = [];
    group.forEach(({ key, id }) => {
      const entry = next[key];
      const stroke = entry?.strokes.find((s) => s.id === id);
      if (!entry || !stroke) return;
      const { version, bookAbbrev, bookName, chapter, verse } = entry;
      removed.push({
        ref: { version, bookAbbrev, bookName, chapter, verse },
        stroke,
      });
      const rest = entry.strokes.filter((s) => s.id !== id);
      if (rest.length === 0) delete next[key];
      else next[key] = { ...entry, timestamp: Date.now(), strokes: rest };
    });
    apply(next);
    if (removed.length > 0) redoStackRef.current.push(removed);
    syncStacks();
  }, [apply, syncStacks]);

  const redo = useCallback(() => {
    const items = redoStackRef.current[redoStackRef.current.length - 1];
    if (!items) return;
    redoStackRef.current = redoStackRef.current.slice(0, -1);
    insertStrokes(items);
    syncStacks();
  }, [insertStrokes, syncStacks]);

  const clearVerses = useCallback(
    (
      version: string,
      bookAbbrev: string,
      chapter: number,
      verses: number[],
    ) => {
      const keys = new Set(
        verses.map((verse) =>
          getVerseDrawingKey(version, bookAbbrev, chapter, verse),
        ),
      );
      const current = drawingsRef.current;
      const next: VerseDrawings = {};
      Object.keys(current).forEach((k) => {
        if (!keys.has(k)) next[k] = current[k];
      });
      apply(next);
      undoStackRef.current = undoStackRef.current
        .map((group) => group.filter((entry) => !keys.has(entry.key)))
        .filter((group) => group.length > 0);
      redoStackRef.current = redoStackRef.current
        .map((items) => items.filter((item) => !keys.has(keyOf(item.ref))))
        .filter((items) => items.length > 0);
      syncStacks();
    },
    [apply, syncStacks],
  );

  const setColor = useCallback((value: string) => {
    setStoredColor(value);
    AsyncStorage.setItem(STORAGE_KEYS.DRAWING_COLOR, value).catch(() => {});
  }, []);

  const setTool = useCallback((value: DrawingTool) => {
    setToolState(value);
    setIsErasing(false);
  }, []);

  const setBaseWidth = useCallback((value: number) => {
    const next = Math.min(
      MAX_STROKE_WIDTH,
      Math.max(MIN_STROKE_WIDTH, Math.round(value)),
    );
    setBaseWidthState(next);
    AsyncStorage.setItem(STORAGE_KEYS.DRAWING_WIDTH, String(next)).catch(
      () => {},
    );
  }, []);

  const setShowDrawings = useCallback((value: boolean) => {
    setShowDrawingsState(value);
    AsyncStorage.setItem(STORAGE_KEYS.SHOW_DRAWINGS, String(value)).catch(
      () => {},
    );
  }, []);

  const startDrawMode = useCallback(() => {
    setIsErasing(false);
    resetStacks();
    setIsDrawMode(true);
    setShowDrawingsState(true);
  }, [resetStacks]);

  const stopDrawMode = useCallback(() => setIsDrawMode(false), []);

  const strokeWidth = baseWidth * (tool === "marker" ? MARKER_WIDTH_FACTOR : 1);

  const value = useMemo(
    () => ({
      drawings,
      isDrawMode,
      isErasing,
      tool,
      color,
      recentColors,
      baseWidth,
      strokeWidth,
      showDrawings,
      canUndo: undoCount > 0,
      canRedo: redoCount > 0,
      startDrawMode,
      stopDrawMode,
      setTool,
      setIsErasing,
      setColor,
      setBaseWidth,
      setShowDrawings,
      addStroke,
      addStrokes,
      removeStroke,
      replaceStroke,
      undo,
      redo,
      clearVerses,
    }),
    [
      drawings,
      isDrawMode,
      isErasing,
      tool,
      color,
      recentColors,
      baseWidth,
      strokeWidth,
      showDrawings,
      undoCount,
      redoCount,
      startDrawMode,
      stopDrawMode,
      setTool,
      setColor,
      setBaseWidth,
      setShowDrawings,
      addStroke,
      addStrokes,
      removeStroke,
      replaceStroke,
      undo,
      redo,
      clearVerses,
    ],
  );

  return (
    <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>
  );
}

export function useDrawings() {
  const ctx = useContext(DrawingContext);
  if (!ctx) throw new Error("useDrawings must be used within DrawingProvider");
  return ctx;
}
