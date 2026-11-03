import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { clampRatio } from "../utils/drawing";
import { selectionHaptic } from "../utils/haptics";

type Props = {
  value: number;
  min: number;
  max: number;
  step: number;
  onPreview?: (value: number) => void;
  onComplete: (value: number) => void;
  onDragChange?: (isDragging: boolean) => void;
  testID?: string;
};

type ViewHandle = React.ElementRef<typeof View>;

export const HorizontalSlider = React.memo(
  ({
    value,
    min,
    max,
    step,
    onPreview,
    onComplete,
    onDragChange,
    testID,
  }: Props) => {
    const { ms, DESIGN } = useResponsive();
    const { colors } = useTheme();
    const thumbRef = useRef<ViewHandle>(null);
    const fillRef = useRef<ViewHandle>(null);
    const trackWidthRef = useRef(0);
    const trackLeftRef = useRef(0);
    const ratioRef = useRef(clampRatio((value - min) / (max - min)));
    const valueRef = useRef(value);

    const thumbSize = ms(DESIGN.icon.md);
    const trackHeight = ms(DESIGN.spacing.xs);

    const styles = useMemo(
      () =>
        StyleSheet.create({
          touchArea: {
            height: ms(DESIGN.height.md),
            justifyContent: "center",
          },
          track: {
            height: trackHeight,
            borderRadius: ms(DESIGN.borderRadius.full),
            backgroundColor: colors.border,
            overflow: "hidden",
          },
          fill: {
            height: "100%",
            backgroundColor: colors.primary,
          },
          thumb: {
            position: "absolute",
            top: "50%",
            width: thumbSize,
            height: thumbSize,
            marginTop: -thumbSize / 2,
            borderRadius: ms(DESIGN.borderRadius.full),
            backgroundColor: colors.primary,
            borderWidth: 3,
            borderColor: colors.onPrimary,
            elevation: 4,
          },
        }),
      [ms, DESIGN, colors, thumbSize, trackHeight],
    );

    const apply = useCallback(
      (ratio: number) => {
        const usable = Math.max(trackWidthRef.current - thumbSize, 0);
        thumbRef.current?.setNativeProps({
          style: { opacity: 1, left: ratio * usable },
        });
        fillRef.current?.setNativeProps({
          style: { width: ratio * usable + thumbSize / 2 },
        });
      },
      [thumbSize],
    );

    useEffect(() => {
      ratioRef.current = clampRatio((value - min) / (max - min));
      valueRef.current = value;
      apply(ratioRef.current);
    }, [value, min, max, apply]);

    const onLayout = useCallback(
      (e: LayoutChangeEvent) => {
        trackWidthRef.current = e.nativeEvent.layout.width;
        apply(ratioRef.current);
      },
      [apply],
    );

    const move = useCallback(
      (e: GestureResponderEvent) => {
        const usable = trackWidthRef.current - thumbSize;
        if (usable <= 0) return;
        const ratio = clampRatio(
          (e.nativeEvent.pageX - trackLeftRef.current - thumbSize / 2) / usable,
        );
        const stepped = Math.min(
          Math.max(Math.round((min + ratio * (max - min)) / step) * step, min),
          max,
        );
        ratioRef.current = (stepped - min) / (max - min);
        apply(ratioRef.current);
        if (stepped !== valueRef.current) {
          valueRef.current = stepped;
          selectionHaptic();
          onPreview?.(stepped);
        }
      },
      [thumbSize, min, max, step, apply, onPreview],
    );

    const handleGrant = useCallback(
      (e: GestureResponderEvent) => {
        trackLeftRef.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        onDragChange?.(true);
        move(e);
      },
      [move, onDragChange],
    );

    const handleEnd = useCallback(() => {
      onDragChange?.(false);
      onComplete(valueRef.current);
    }, [onComplete, onDragChange]);

    return (
      <View
        style={styles.touchArea}
        onLayout={onLayout}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={handleGrant}
        onResponderMove={move}
        onResponderRelease={handleEnd}
        onResponderTerminate={handleEnd}
        testID={testID}
      >
        <View style={styles.track} pointerEvents="none">
          <View ref={fillRef} style={[styles.fill, { width: 0 }]} />
        </View>
        <View
          ref={thumbRef}
          pointerEvents="none"
          style={[styles.thumb, { opacity: 0 }]}
        />
      </View>
    );
  },
);
