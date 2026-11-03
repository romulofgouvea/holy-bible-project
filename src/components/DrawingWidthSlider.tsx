import React, { useCallback, useMemo, useRef } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";
import {
  MARKER_OPACITY,
  MARKER_WIDTH_FACTOR,
  MAX_STROKE_WIDTH,
  MIN_STROKE_WIDTH,
  useDrawings,
} from "../hooks/useDrawings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { clampRatio } from "../utils/drawing";
import { impactLight } from "../utils/haptics";

type Props = {
  bottom: number;
  left: number;
  onDone: () => void;
};

const ratioFromWidth = (width: number) =>
  (width - MIN_STROKE_WIDTH) / (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH);

const widthFromRatio = (ratio: number) =>
  MIN_STROKE_WIDTH + ratio * (MAX_STROKE_WIDTH - MIN_STROKE_WIDTH);

export const DrawingWidthSlider = React.memo(
  ({ bottom, left, onDone }: Props) => {
    const { ms, DESIGN } = useResponsive();
    const { colors } = useTheme();
    const { baseWidth, setBaseWidth, color, tool } = useDrawings();
    const trackHeightRef = useRef(0);
    const thumbRef = useRef<React.ElementRef<typeof View>>(null);
    const sampleRef = useRef<React.ElementRef<typeof View>>(null);
    const ratioRef = useRef(ratioFromWidth(baseWidth));
    const trackTopRef = useRef(0);

    const thumbSize = ms(DESIGN.icon.md);
    const sampleLimit = ms(DESIGN.icon.xl) - 2;
    const isMarker = tool === "marker";
    const factor = isMarker ? MARKER_WIDTH_FACTOR : 1;

    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: {
            position: "absolute",
            width: ms(DESIGN.icon.xl),
            alignItems: "center",
            paddingVertical: ms(DESIGN.spacing.md),
            borderRadius: ms(DESIGN.borderRadius.full),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            elevation: 24,
          },
          sample: {
            width: ms(DESIGN.icon.xl),
            height: ms(DESIGN.icon.xl),
            alignItems: "center",
            justifyContent: "center",
          },
          touchArea: {
            height: ms(DESIGN.icon.xl * 3),
            width: ms(DESIGN.icon.xl),
            alignItems: "center",
          },
          track: {
            width: ms(DESIGN.spacing.xs),
            flex: 1,
            borderRadius: ms(DESIGN.borderRadius.full),
            backgroundColor: colors.border,
          },
          thumb: {
            position: "absolute",
            top: 0,
            width: thumbSize,
            height: thumbSize,
            borderRadius: ms(DESIGN.borderRadius.full),
            backgroundColor: colors.primary,
            elevation: 6,
          },
        }),
      [ms, DESIGN, colors.border, colors.background, colors.primary, thumbSize],
    );

    const sizeAt = useCallback(
      (ratio: number) =>
        Math.min(widthFromRatio(ratio) * factor, sampleLimit),
      [factor, sampleLimit],
    );

    const onLayout = useCallback(
      (e: LayoutChangeEvent) => {
        trackHeightRef.current = e.nativeEvent.layout.height;
        thumbRef.current?.setNativeProps({
          style: {
            opacity: 1,
            transform: [
              {
                translateY:
                  (1 - ratioRef.current) *
                  Math.max(trackHeightRef.current - thumbSize, 0),
              },
            ],
          },
        });
      },
      [thumbSize],
    );

    const move = useCallback(
      (e: GestureResponderEvent) => {
        const usable = trackHeightRef.current - thumbSize;
        if (usable <= 0) return;
        const fromTop = clampRatio(
          (e.nativeEvent.pageY - trackTopRef.current - thumbSize / 2) / usable,
        );
        const next = 1 - fromTop;
        ratioRef.current = next;
        thumbRef.current?.setNativeProps({
          style: { transform: [{ translateY: fromTop * usable }] },
        });
        const size = sizeAt(next);
        sampleRef.current?.setNativeProps({
          style: { width: size, height: size },
        });
      },
      [thumbSize, sizeAt],
    );

    const handleGrant = useCallback(
      (e: GestureResponderEvent) => {
        impactLight();
        trackTopRef.current = e.nativeEvent.pageY - e.nativeEvent.locationY;
        move(e);
      },
      [move],
    );

    const handleRelease = useCallback(() => {
      setBaseWidth(Math.round(widthFromRatio(ratioRef.current)));
      onDone();
    }, [setBaseWidth, onDone]);

    const initialSize = sizeAt(ratioRef.current);

    return (
      <View
        style={[styles.container, { bottom, left }]}
        testID="drawing-width-slider"
      >
        <View style={styles.sample} pointerEvents="none">
          <View
            ref={sampleRef}
            style={{
              width: initialSize,
              height: initialSize,
              borderRadius: sampleLimit,
              backgroundColor: color,
              opacity: isMarker ? MARKER_OPACITY : 1,
            }}
          />
        </View>
        <View
          style={styles.touchArea}
          onLayout={onLayout}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={handleGrant}
          onResponderMove={move}
          onResponderRelease={handleRelease}
          onResponderTerminate={handleRelease}
        >
          <View style={styles.track} pointerEvents="none" />
          <View
            ref={thumbRef}
            pointerEvents="none"
            style={[styles.thumb, { opacity: 0 }]}
          />
        </View>
      </View>
    );
  },
);
