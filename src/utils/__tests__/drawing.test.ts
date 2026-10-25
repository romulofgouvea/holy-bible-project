import { DrawingStroke } from "../../models";
import {
  colorAtRatio,
  findStrokeAt,
  getVerseDrawingKey,
  hslToHex,
  pointsToPath,
  simplifyPoints,
  toStoredPoint,
} from "../drawing";

const stroke = (points: number[]): DrawingStroke => ({
  id: "s1",
  tool: "pen",
  color: "#FF3B30",
  width: 4,
  points,
});

describe("drawing utils", () => {
  it("builds verse keys", () => {
    expect(getVerseDrawingKey("ACF", "gn", 1, 3)).toBe("ACF-gn-1-3");
  });

  it("normalizes x by width and rounds y", () => {
    expect(toStoredPoint(150, 12.345, 300)).toEqual([0.5, 12.3]);
    expect(toStoredPoint(10, 5, 0)).toEqual([0, 5]);
  });

  it("drops points closer than the minimum distance and keeps the ends", () => {
    const pts = [0, 0, 0.001, 0, 0.002, 0, 0.5, 0, 1, 0];
    const result = simplifyPoints(pts, 100);
    expect(result.slice(0, 2)).toEqual([0, 0]);
    expect(result.slice(-2)).toEqual([1, 0]);
    expect(result.length).toBeLessThan(pts.length);
  });

  it("creates svg paths scaled to the width", () => {
    expect(pointsToPath([0, 0, 0.5, 10, 1, 0], 100)).toBe(
      "M 0 0 Q 50 10 75 5 L 100 0",
    );
    expect(pointsToPath([], 100)).toBe("");
  });

  it("finds the topmost stroke near a point", () => {
    const strokes = [stroke([0, 10, 1, 10])];
    expect(findStrokeAt(strokes, 50, 12, 100)?.id).toBe("s1");
    expect(findStrokeAt(strokes, 50, 80, 100)).toBeUndefined();
  });

  it("converts hsl to hex", () => {
    expect(hslToHex(0, 100, 50)).toBe("#FF0000");
    expect(hslToHex(120, 100, 50)).toBe("#00FF00");
    expect(hslToHex(0, 0, 100)).toBe("#FFFFFF");
  });

  it("maps slider ratios to colors", () => {
    expect(colorAtRatio(0)).toBe("#FFFFFF");
    expect(colorAtRatio(0.1)).toBe("#FF0000");
    expect(colorAtRatio(-1)).toBe("#FFFFFF");
    expect(colorAtRatio(2)).toMatch(/^#[0-9A-F]{6}$/);
  });
});
