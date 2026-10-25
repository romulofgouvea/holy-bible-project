import { DrawingEntry, DrawingStroke } from "../models";

export const hslToHex = (h: number, s: number, l: number) => {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const value = light - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`.toUpperCase();
};

export const GRAY_ZONE_RATIO = 0.1;
export const MAX_SLIDER_HUE = 320;

export const clampRatio = (ratio: number) => Math.max(0, Math.min(1, ratio));

export const colorAtRatio = (ratio: number) => {
  const r = clampRatio(ratio);
  if (r < GRAY_ZONE_RATIO) {
    const value = Math.round(255 * (1 - r / GRAY_ZONE_RATIO));
    const hex = value.toString(16).padStart(2, "0");
    return `#${hex}${hex}${hex}`.toUpperCase();
  }
  const hue = ((r - GRAY_ZONE_RATIO) / (1 - GRAY_ZONE_RATIO)) * MAX_SLIDER_HUE;
  return hslToHex(hue, 100, 50);
};

export const SLIDER_GRADIENT_STOPS = [
  { offset: 0, color: "#FFFFFF" },
  { offset: GRAY_ZONE_RATIO, color: "#000000" },
  ...[0, 60, 120, 180, 240, 300, MAX_SLIDER_HUE].map((hue) => ({
    offset: GRAY_ZONE_RATIO + (hue / MAX_SLIDER_HUE) * (1 - GRAY_ZONE_RATIO),
    color: hslToHex(hue, 100, 50),
  })),
];

export const MIN_POINT_DISTANCE = 2;
export const ERASE_RADIUS = 14;

export const getVerseDrawingKey = (
  version: string,
  abbrev: string,
  chapter: number,
  verse: number,
) => `${version}-${abbrev}-${chapter}-${verse}`;

export const isDrawingEntry = (value: unknown): value is DrawingEntry => {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DrawingEntry>;
  return (
    typeof v.version === "string" &&
    typeof v.bookAbbrev === "string" &&
    typeof v.chapter === "number" &&
    typeof v.verse === "number" &&
    Array.isArray(v.strokes)
  );
};

export const roundTo = (value: number, places: number) => {
  const factor = Math.pow(10, places);
  return Math.round(value * factor) / factor;
};

export const toStoredPoint = (x: number, y: number, width: number) => [
  roundTo(width > 0 ? x / width : 0, 4),
  roundTo(y, 1),
];

export const simplifyPoints = (
  points: number[],
  width: number,
  minDistance: number = MIN_POINT_DISTANCE,
) => {
  if (points.length <= 4) return points;
  const result: number[] = [points[0], points[1]];
  let lastX = points[0] * width;
  let lastY = points[1];
  for (let i = 2; i < points.length - 2; i += 2) {
    const px = points[i] * width;
    const py = points[i + 1];
    if (Math.hypot(px - lastX, py - lastY) >= minDistance) {
      result.push(points[i], points[i + 1]);
      lastX = px;
      lastY = py;
    }
  }
  result.push(points[points.length - 2], points[points.length - 1]);
  return result;
};

export const pointsToPath = (points: number[], width: number) => {
  if (points.length < 2) return "";
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    xs.push(roundTo(points[i] * width, 1));
    ys.push(points[i + 1]);
  }
  if (xs.length === 1) {
    return `M ${xs[0]} ${ys[0]} L ${xs[0] + 0.01} ${ys[0]}`;
  }
  let d = `M ${xs[0]} ${ys[0]}`;
  for (let i = 1; i < xs.length - 1; i++) {
    const midX = roundTo((xs[i] + xs[i + 1]) / 2, 1);
    const midY = roundTo((ys[i] + ys[i + 1]) / 2, 1);
    d += ` Q ${xs[i]} ${ys[i]} ${midX} ${midY}`;
  }
  d += ` L ${xs[xs.length - 1]} ${ys[ys.length - 1]}`;
  return d;
};

const distanceToSegment = (
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(
    0,
    Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared),
  );
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

export const strokeHitsPoint = (
  stroke: DrawingStroke,
  x: number,
  y: number,
  width: number,
  radius: number = ERASE_RADIUS,
) => {
  const reach = radius + stroke.width / 2;
  const pts = stroke.points;
  if (pts.length < 2) return false;
  if (pts.length === 2) {
    return Math.hypot(x - pts[0] * width, y - pts[1]) <= reach;
  }
  for (let i = 0; i < pts.length - 2; i += 2) {
    if (
      distanceToSegment(
        x,
        y,
        pts[i] * width,
        pts[i + 1],
        pts[i + 2] * width,
        pts[i + 3],
      ) <= reach
    ) {
      return true;
    }
  }
  return false;
};

export const findStrokeAt = (
  strokes: DrawingStroke[],
  x: number,
  y: number,
  width: number,
) => {
  for (let i = strokes.length - 1; i >= 0; i--) {
    if (strokeHitsPoint(strokes[i], x, y, width)) return strokes[i];
  }
  return undefined;
};

export const makeStrokeId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);
