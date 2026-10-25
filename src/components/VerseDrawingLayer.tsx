import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useDrawings } from "../hooks/useDrawings";
import { DrawingStroke } from "../models";
import {
  findStrokeAt,
  getVerseDrawingKey,
  makeStrokeId,
  pointsToPath,
  simplifyPoints,
  toStoredPoint,
} from "../utils/drawing";
import { impactLight } from "../utils/haptics";

const MARKER_OPACITY = 0.4;

const StrokePath = React.memo(
  ({ stroke, width }: { stroke: DrawingStroke; width: number }) => (
    <Path
      d={pointsToPath(stroke.points, width)}
      stroke={stroke.color}
      strokeWidth={stroke.width}
      strokeOpacity={stroke.tool === "marker" ? MARKER_OPACITY : 1}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  ),
);

type Props = {
  version: string;
  bookAbbrev: string;
  bookName: string;
  chapter: number;
  verse: number;
};

export const VerseDrawingLayer = React.memo(
  ({ version, bookAbbrev, bookName, chapter, verse }: Props) => {
    const verseKey = getVerseDrawingKey(version, bookAbbrev, chapter, verse);
    const {
      drawings,
      isDrawMode,
      isErasing,
      tool,
      color,
      strokeWidth,
      showDrawings,
      addStroke,
      removeStroke,
    } = useDrawings();
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [livePoints, setLivePoints] = useState<number[]>([]);
    const liveRef = useRef<number[]>([]);

    const strokes = drawings[verseKey]?.strokes;
    const hasStrokes = !!strokes && strokes.length > 0;

    const onLayout = useCallback((e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    }, []);

    const eraseAt = useCallback(
      (x: number, y: number) => {
        if (!strokes) return;
        const hit = findStrokeAt(strokes, x, y, size.width);
        if (hit) {
          impactLight();
          removeStroke(verseKey, hit.id);
        }
      },
      [strokes, size.width, removeStroke, verseKey],
    );

    const handleStart = useCallback(
      (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        if (isErasing) {
          eraseAt(locationX, locationY);
          return;
        }
        impactLight();
        liveRef.current = toStoredPoint(locationX, locationY, size.width);
        setLivePoints(liveRef.current);
      },
      [isErasing, eraseAt, size.width],
    );

    const handleMove = useCallback(
      (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        if (isErasing) {
          eraseAt(locationX, locationY);
          return;
        }
        if (liveRef.current.length === 0) return;
        liveRef.current = [
          ...liveRef.current,
          ...toStoredPoint(locationX, locationY, size.width),
        ];
        setLivePoints(liveRef.current);
      },
      [isErasing, eraseAt, size.width],
    );

    const handleEnd = useCallback(() => {
      const points = liveRef.current;
      liveRef.current = [];
      setLivePoints([]);
      if (isErasing || points.length < 2) return;
      addStroke(
        { version, bookAbbrev, bookName, chapter, verse },
        {
          id: makeStrokeId(),
          tool,
          color,
          width: strokeWidth,
          points: simplifyPoints(points, size.width),
        },
      );
    }, [
      isErasing,
      addStroke,
      version,
      bookAbbrev,
      bookName,
      chapter,
      verse,
      tool,
      color,
      strokeWidth,
      size.width,
    ]);

    const liveStroke = useMemo<DrawingStroke | null>(
      () =>
        livePoints.length >= 2
          ? { id: "live", tool, color, width: strokeWidth, points: livePoints }
          : null,
      [livePoints, tool, color, strokeWidth],
    );

    const isVisible = showDrawings || isDrawMode;
    if (!isDrawMode && (!isVisible || !hasStrokes)) return null;

    return (
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={isDrawMode ? "auto" : "none"}
        onLayout={onLayout}
        onStartShouldSetResponder={() => isDrawMode}
        onMoveShouldSetResponder={() => isDrawMode}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleStart}
        onResponderMove={handleMove}
        onResponderRelease={handleEnd}
        onResponderTerminate={handleEnd}
      >
        {size.width > 0 && (
          <Svg width={size.width} height={size.height} pointerEvents="none">
            {isVisible &&
              strokes?.map((s) => (
                <StrokePath key={s.id} stroke={s} width={size.width} />
              ))}
            {liveStroke && (
              <StrokePath stroke={liveStroke} width={size.width} />
            )}
          </Svg>
        )}
      </View>
    );
  },
);
