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
import { DeviceEventEmitter } from "react-native";
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

export const DRAWING_WIDTHS = [3, 6, 10];
export const MARKER_WIDTH_FACTOR = 3;

type UndoEntry = { key: string; id: string };

type DrawingContextType = {
  drawings: VerseDrawings;
  isDrawMode: boolean;
  isErasing: boolean;
  tool: DrawingTool;
  color: string;
  widthIndex: number;
  strokeWidth: number;
  showDrawings: boolean;
  canUndo: boolean;
  startDrawMode: () => void;
  stopDrawMode: () => void;
  setTool: (tool: DrawingTool) => void;
  setIsErasing: (value: boolean) => void;
  setColor: (color: string) => void;
  cycleWidth: () => void;
  setShowDrawings: (value: boolean) => void;
  addStroke: (ref: VerseReference, stroke: DrawingStroke) => void;
  removeStroke: (key: string, id: string) => void;
  undo: () => void;
  clearVerses: (
    version: string,
    bookAbbrev: string,
    chapter: number,
    verses: number[],
  ) => void;
};

const DrawingContext = createContext<DrawingContextType | null>(null);

const persist = (next: VerseDrawings) => {
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

export function DrawingProvider({ children }: { children: React.ReactNode }) {
  const [drawings, setDrawings] = useState<VerseDrawings>({});
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [tool, setToolState] = useState<DrawingTool>("pen");
  const { colors } = useTheme();
  const [storedColor, setStoredColor] = useState<string | null>(null);
  const color = storedColor ?? colors.primary;
  const [widthIndex, setWidthIndex] = useState(1);
  const [showDrawings, setShowDrawingsState] = useState(true);
  const [undoCount, setUndoCount] = useState(0);
  const undoStackRef = useRef<UndoEntry[]>([]);
  const drawingsRef = useRef<VerseDrawings>({});

  const apply = useCallback((next: VerseDrawings) => {
    drawingsRef.current = next;
    setDrawings(next);
    persist(next);
  }, []);

  const load = useCallback(async () => {
    try {
      const [stored, show, savedColor] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DRAWINGS),
        AsyncStorage.getItem(STORAGE_KEYS.SHOW_DRAWINGS),
        AsyncStorage.getItem(STORAGE_KEYS.DRAWING_COLOR),
      ]);
      setStoredColor(savedColor);
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
      undoStackRef.current = [];
      setUndoCount(0);
    } catch {
      drawingsRef.current = {};
      setDrawings({});
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(BACKUP_RESTORED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  const addStroke = useCallback(
    (ref: VerseReference, stroke: DrawingStroke) => {
      const current = drawingsRef.current;
      const key = getVerseDrawingKey(
        ref.version,
        ref.bookAbbrev,
        ref.chapter,
        ref.verse,
      );
      const entry: DrawingEntry = {
        ...ref,
        timestamp: Date.now(),
        strokes: [...(current[key]?.strokes ?? []), stroke],
      };
      apply({ ...current, [key]: entry });
      undoStackRef.current = [...undoStackRef.current, { key, id: stroke.id }];
      setUndoCount(undoStackRef.current.length);
    },
    [apply],
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

  const undo = useCallback(() => {
    const last = undoStackRef.current[undoStackRef.current.length - 1];
    if (!last) return;
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setUndoCount(undoStackRef.current.length);
    removeStroke(last.key, last.id);
  }, [removeStroke]);

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
      undoStackRef.current = undoStackRef.current.filter(
        (entry) => !keys.has(entry.key),
      );
      setUndoCount(undoStackRef.current.length);
    },
    [apply],
  );

  const setColor = useCallback((value: string) => {
    setStoredColor(value);
    AsyncStorage.setItem(STORAGE_KEYS.DRAWING_COLOR, value).catch(() => {});
  }, []);

  const setTool = useCallback((value: DrawingTool) => {
    setToolState(value);
    setIsErasing(false);
  }, []);

  const cycleWidth = useCallback(
    () => setWidthIndex((prev) => (prev + 1) % DRAWING_WIDTHS.length),
    [],
  );

  const setShowDrawings = useCallback((value: boolean) => {
    setShowDrawingsState(value);
    AsyncStorage.setItem(STORAGE_KEYS.SHOW_DRAWINGS, String(value)).catch(
      () => {},
    );
  }, []);

  const startDrawMode = useCallback(() => {
    setIsErasing(false);
    undoStackRef.current = [];
    setUndoCount(0);
    setIsDrawMode(true);
    setShowDrawingsState(true);
  }, []);

  const stopDrawMode = useCallback(() => setIsDrawMode(false), []);

  const strokeWidth =
    DRAWING_WIDTHS[widthIndex] * (tool === "marker" ? MARKER_WIDTH_FACTOR : 1);

  const value = useMemo(
    () => ({
      drawings,
      isDrawMode,
      isErasing,
      tool,
      color,
      widthIndex,
      strokeWidth,
      showDrawings,
      canUndo: undoCount > 0,
      startDrawMode,
      stopDrawMode,
      setTool,
      setIsErasing,
      setColor,
      cycleWidth,
      setShowDrawings,
      addStroke,
      removeStroke,
      undo,
      clearVerses,
    }),
    [
      drawings,
      isDrawMode,
      isErasing,
      tool,
      color,
      widthIndex,
      strokeWidth,
      showDrawings,
      undoCount,
      startDrawMode,
      stopDrawMode,
      setTool,
      setColor,
      cycleWidth,
      setShowDrawings,
      addStroke,
      removeStroke,
      undo,
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
