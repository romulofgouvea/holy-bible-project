import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";
import Svg from "react-native-svg";
import { useDrawings } from "../hooks/useDrawings";
import { DrawingStroke } from "../models";
import {
  findStrokeAt,
  makeStrokeId,
  simplifyPoints,
  splitPointsByRect,
} from "../utils/drawing";
import {
  MeasuredLayer,
  measureVerseLayers,
  ViewHandle,
} from "../utils/drawingRegistry";
import { impactLight } from "../utils/haptics";
import { StrokePath } from "./VerseDrawingLayer";

type Props = {
  onScrollBy?: (dy: number) => void;
};

export const DrawingCaptureLayer = React.memo(({ onScrollBy }: Props) => {
  const {
    drawings,
    isErasing,
    tool,
    color,
    strokeWidth,
    addStrokes,
    replaceStroke,
  } = useDrawings();
  const viewRef = useRef<ViewHandle>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const layersRef = useRef<MeasuredLayer[]>([]);
  const liveRef = useRef<number[]>([]);
  const drawingsRef = useRef(drawings);
  const isScrollingRef = useRef(false);
  const lastMidYRef = useRef(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [livePoints, setLivePoints] = useState<number[]>([]);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  const measure = useCallback(() => {
    const node = viewRef.current;
    if (!node) return;
    node.measureInWindow((ox, oy) => {
      measureVerseLayers().then((layers) => {
        layersRef.current = layers.map((l) => ({
          ...l,
          x: l.x - ox,
          y: l.y - oy,
        }));
      });
    });
  }, []);

  const eraseWholeAt = useCallback(
    (x: number, y: number) => {
      for (const layer of layersRef.current) {
        const strokes = drawingsRef.current[layer.key]?.strokes;
        if (!strokes) continue;
        const hit = findStrokeAt(
          strokes,
          x - layer.x,
          y - layer.y,
          layer.width,
        );
        if (!hit) continue;
        const targets = Object.entries(drawingsRef.current).flatMap(
          ([key, entry]) =>
            entry.strokes
              .filter((s) =>
                hit.groupId ? s.groupId === hit.groupId : s.id === hit.id,
              )
              .map((s) => ({ key, id: s.id })),
        );
        targets.forEach(({ key, id }) => replaceStroke(key, id, []));
        return;
      }
    },
    [replaceStroke],
  );

  const handleStart = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX, locationY, pageX, pageY } = e.nativeEvent;
      originRef.current = { x: pageX - locationX, y: pageY - locationY };
      measure();
      isScrollingRef.current = false;
      if (isErasing) {
        eraseWholeAt(locationX, locationY);
        return;
      }
      impactLight();
      liveRef.current = [locationX, locationY];
      setLivePoints(liveRef.current);
    },
    [isErasing, measure, eraseWholeAt],
  );

  const handleMove = useCallback(
    (e: GestureResponderEvent) => {
      const { touches } = e.nativeEvent;
      if (touches.length >= 2) {
        const midY = (touches[0].pageY + touches[1].pageY) / 2;
        if (isScrollingRef.current) onScrollBy?.(midY - lastMidYRef.current);
        else {
          isScrollingRef.current = true;
          liveRef.current = [];
          setLivePoints([]);
        }
        lastMidYRef.current = midY;
        return;
      }
      if (isScrollingRef.current) return;
      const x = e.nativeEvent.pageX - originRef.current.x;
      const y = e.nativeEvent.pageY - originRef.current.y;
      if (isErasing) {
        eraseWholeAt(x, y);
        return;
      }
      if (liveRef.current.length === 0) return;
      liveRef.current = [...liveRef.current, x, y];
      setLivePoints(liveRef.current);
    },
    [isErasing, eraseWholeAt, onScrollBy],
  );

  const handleEnd = useCallback(() => {
    const points = liveRef.current;
    liveRef.current = [];
    setLivePoints([]);
    const wasScrolling = isScrollingRef.current;
    isScrollingRef.current = false;
    if (isErasing || wasScrolling || points.length < 2) return;
    const groupId = makeStrokeId();
    const items = splitPointsByRect(points, layersRef.current).map(
      ({ rect, points: local }) => ({
        ref: rect.ref,
        stroke: {
          id: makeStrokeId(),
          groupId,
          tool,
          color,
          width: strokeWidth,
          points: simplifyPoints(local, rect.width),
        },
      }),
    );
    addStrokes(items);
  }, [isErasing, addStrokes, tool, color, strokeWidth]);

  const liveStroke = useMemo<DrawingStroke | null>(
    () =>
      livePoints.length >= 2
        ? { id: "live", tool, color, width: strokeWidth, points: livePoints }
        : null,
    [livePoints, tool, color, strokeWidth],
  );

  return (
    <View
      ref={viewRef}
      collapsable={false}
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleStart}
      onResponderMove={handleMove}
      onResponderRelease={handleEnd}
      onResponderTerminate={handleEnd}
    >
      {size.width > 0 && liveStroke && (
        <Svg width={size.width} height={size.height} pointerEvents="none">
          <StrokePath stroke={liveStroke} width={1} />
        </Svg>
      )}
    </View>
  );
});
