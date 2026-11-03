import React, { useCallback, useEffect, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { useDrawings } from "../hooks/useDrawings";
import { DrawingStroke } from "../models";
import { getVerseDrawingKey, pointsToPath } from "../utils/drawing";
import { registerVerseLayer, ViewHandle } from "../utils/drawingRegistry";

const MARKER_OPACITY = 0.4;
const DRAWING_OVERFLOW = 64;

export const StrokePath = React.memo(
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
    const { drawings, isDrawMode, showDrawings } = useDrawings();
    const viewRef = useRef<ViewHandle>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

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

    useEffect(() => {
      if (!isDrawMode) return;
      return registerVerseLayer(verseKey, {
        view: viewRef,
        ref: { version, bookAbbrev, bookName, chapter, verse },
      });
    }, [isDrawMode, verseKey, version, bookAbbrev, bookName, chapter, verse]);

    const isVisible = showDrawings || isDrawMode;
    if (!isDrawMode && (!isVisible || !hasStrokes)) return null;

    return (
      <View
        ref={viewRef}
        collapsable={false}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        onLayout={onLayout}
      >
        {size.width > 0 && (
          <Svg
            width={size.width}
            height={size.height + DRAWING_OVERFLOW * 2}
            style={{ position: "absolute", top: -DRAWING_OVERFLOW, left: 0 }}
            pointerEvents="none"
          >
            <G y={DRAWING_OVERFLOW}>
              {isVisible &&
                strokes?.map((s) => (
                  <StrokePath key={s.id} stroke={s} width={size.width} />
                ))}
            </G>
          </Svg>
        )}
      </View>
    );
  },
);
