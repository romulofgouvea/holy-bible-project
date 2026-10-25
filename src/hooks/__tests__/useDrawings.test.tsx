import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";
import { STORAGE_KEYS } from "../../constants/storage";
import { DrawingStroke, VerseReference } from "../../models";
import { DrawingProvider, useDrawings } from "../useDrawings";
import { ThemeProvider } from "../useTheme";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>
    <DrawingProvider>{children}</DrawingProvider>
  </ThemeProvider>
);

const stroke = (id: string): DrawingStroke => ({
  id,
  tool: "pen",
  color: "#FF3B30",
  width: 6,
  points: [0, 0, 1, 10],
});

const ref = (
  chapter: number,
  verse: number,
  version = "ACF",
): VerseReference => ({
  version,
  bookAbbrev: "gn",
  bookName: "Gênesis",
  chapter,
  verse,
});

describe("useDrawings", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("adds, persists and undoes strokes", async () => {
    const { result } = renderHook(() => useDrawings(), { wrapper });
    await act(async () => {});

    act(() => result.current.addStroke(ref(1, 1), stroke("a")));
    expect(result.current.drawings["ACF-gn-1-1"].strokes).toHaveLength(1);
    expect(result.current.canUndo).toBe(true);

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DRAWINGS);
      const list = JSON.parse(raw as string);
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        version: "ACF",
        bookAbbrev: "gn",
        bookName: "Gênesis",
        chapter: 1,
        verse: 1,
      });
      expect(typeof list[0].timestamp).toBe("number");
      expect(list[0].strokes).toHaveLength(1);
    });

    act(() => result.current.undo());
    expect(result.current.drawings["ACF-gn-1-1"]).toBeUndefined();
    expect(result.current.canUndo).toBe(false);
  });

  it("keeps drawings separate per version", async () => {
    const { result } = renderHook(() => useDrawings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.addStroke(ref(1, 1, "ACF"), stroke("a"));
      result.current.addStroke(ref(1, 1, "ARA"), stroke("b"));
    });

    expect(result.current.drawings["ACF-gn-1-1"].strokes[0].id).toBe("a");
    expect(result.current.drawings["ARA-gn-1-1"].strokes[0].id).toBe("b");
  });

  it("clears only the given verses of the given version", async () => {
    const { result } = renderHook(() => useDrawings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.addStroke(ref(1, 1, "ACF"), stroke("a"));
      result.current.addStroke(ref(1, 2, "ACF"), stroke("b"));
      result.current.addStroke(ref(1, 3, "ACF"), stroke("c"));
      result.current.addStroke(ref(2, 1, "ACF"), stroke("d"));
      result.current.addStroke(ref(1, 1, "ARA"), stroke("e"));
    });
    act(() => result.current.clearVerses("ACF", "gn", 1, [1, 2]));

    expect(result.current.drawings["ACF-gn-1-1"]).toBeUndefined();
    expect(result.current.drawings["ACF-gn-1-2"]).toBeUndefined();
    expect(result.current.drawings["ACF-gn-1-3"]).toBeDefined();
    expect(result.current.drawings["ACF-gn-2-1"]).toBeDefined();
    expect(result.current.drawings["ARA-gn-1-1"]).toBeDefined();
  });

  it("keeps undo for strokes that were not cleared", async () => {
    const { result } = renderHook(() => useDrawings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.addStroke(ref(1, 1), stroke("a"));
      result.current.addStroke(ref(1, 2), stroke("b"));
    });
    act(() => result.current.clearVerses("ACF", "gn", 1, [1]));
    act(() => result.current.undo());

    expect(result.current.drawings["ACF-gn-1-2"]).toBeUndefined();
    expect(result.current.canUndo).toBe(false);
  });

  it("removes a single stroke", async () => {
    const { result } = renderHook(() => useDrawings(), { wrapper });
    await act(async () => {});

    act(() => {
      result.current.addStroke(ref(1, 1), stroke("a"));
      result.current.addStroke(ref(1, 1), stroke("b"));
    });
    act(() => result.current.removeStroke("ACF-gn-1-1", "a"));

    expect(
      result.current.drawings["ACF-gn-1-1"].strokes.map((s) => s.id),
    ).toEqual(["b"]);
  });

  it("ignores stored data in an unknown format", async () => {
    await AsyncStorage.setItem(
      STORAGE_KEYS.DRAWINGS,
      JSON.stringify({ "gn-1-1": [stroke("x")] }),
    );
    const { result } = renderHook(() => useDrawings(), { wrapper });
    await act(async () => {});

    expect(result.current.drawings).toEqual({});
  });
});
