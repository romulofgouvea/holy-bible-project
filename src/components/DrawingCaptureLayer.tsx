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
  ERASE_RADIUS,
  findStrokeAt,
  makeStrokeId,
  simplifyPoints,
  splitPointsByRect,
  splitStrokeAt,
} from "../utils/drawing";
import {
  MeasuredLayer,
  measureVerseLayers,
  ViewHandle,
} from "../utils/drawingRegistry";
import { impactLight } from "../utils/haptics";
import { StrokePath } from "./VerseDrawingLayer";

export const DrawingCaptureLayer = React.memo(() => {
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

  const eraseAt = useCallback(
    (x: number, y: number) => {
      layersRef.current.forEach((layer) => {
        if (
          y < layer.y - ERASE_RADIUS ||
          y > layer.y + layer.height + ERASE_RADIUS
        )
          return;
        const strokes = drawingsRef.current[layer.key]?.strokes;
        if (!strokes) return;
        const lx = x - layer.x;
        const ly = y - layer.y;
        const hit = findStrokeAt(strokes, lx, ly, layer.width);
        if (!hit) return;
        impactLight();
        replaceStroke(
          layer.key,
          hit.id,
          splitStrokeAt(hit, lx, ly, layer.width, makeStrokeId),
        );
      });
    },
    [replaceStroke],
  );

  const handleStart = useCallback(
    (e: GestureResponderEvent) => {
      const { locationX, locationY, pageX, pageY } = e.nativeEvent;
      originRef.current = { x: pageX - locationX, y: pageY - locationY };
      measure();
      if (isErasing) {
        eraseAt(locationX, locationY);
        return;
      }
      impactLight();
      liveRef.current = [locationX, locationY];
      setLivePoints(liveRef.current);
    },
    [isErasing, measure, eraseAt],
  );

  const handleMove = useCallback(
    (e: GestureResponderEvent) => {
      const x = e.nativeEvent.pageX - originRef.current.x;
      const y = e.nativeEvent.pageY - originRef.current.y;
      if (isErasing) {
        eraseAt(x, y);
        return;
      }
      if (liveRef.current.length === 0) return;
      liveRef.current = [...liveRef.current, x, y];
      setLivePoints(liveRef.current);
    },
    [isErasing, eraseAt],
  );

  const handleEnd = useCallback(() => {
    const points = liveRef.current;
    liveRef.current = [];
    setLivePoints([]);
    if (isErasing || points.length < 2) return;
    const items = splitPointsByRect(points, layersRef.current).map(
      ({ rect, points: local }) => ({
        ref: rect.ref,
        stroke: {
          id: makeStrokeId(),
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
