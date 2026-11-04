import React, { useCallback, useMemo, useRef } from "react";
import {
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { useDrawings } from "../hooks/useDrawings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import {
  clampRatio,
  colorAtRatio,
  SLIDER_GRADIENT_STOPS,
} from "../utils/drawing";
import { applyNativeStyle } from "../utils/nativeStyle";
import { impactLight } from "../utils/haptics";

type Props = {
  bottom: number;
  left: number;
  onDone: () => void;
};

export const DrawingColorSlider = React.memo(
  ({ bottom, left, onDone }: Props) => {
    const { ms, DESIGN } = useResponsive();
    const { colors } = useTheme();
    const { setColor, setIsErasing } = useDrawings();
    const thumbRef = useRef<React.ElementRef<typeof View>>(null);
    const trackHeightRef = useRef(0);
    const positionRef = useRef<number | null>(null);
    const trackTopRef = useRef(0);

    const trackWidth = ms(DESIGN.spacing.md);
    const thumbSize = ms(DESIGN.icon.md);

    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: {
            position: "absolute",
            height: ms(DESIGN.icon.xl * 4),
            width: ms(DESIGN.icon.xl),
            alignItems: "center",
            paddingVertical: ms(DESIGN.spacing.md),
            borderRadius: ms(DESIGN.borderRadius.full),
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.background,
            elevation: 24,
          },
          touchArea: {
            flex: 1,
            width: ms(DESIGN.icon.xl),
            alignItems: "center",
          },
          track: {
            width: trackWidth,
            flex: 1,
            borderRadius: ms(DESIGN.borderRadius.full),
            overflow: "hidden",
          },
          thumb: {
            position: "absolute",
            width: thumbSize,
            height: thumbSize,
            borderRadius: ms(DESIGN.borderRadius.full),
            borderWidth: 3,
            borderColor: colors.onPrimary,
            elevation: 6,
          },
        }),
      [
        ms,
        DESIGN,
        colors.border,
        colors.background,
        colors.onPrimary,
        trackWidth,
        thumbSize,
      ],
    );

    const onLayout = useCallback((e: LayoutChangeEvent) => {
      trackHeightRef.current = e.nativeEvent.layout.height;
    }, []);

    const move = useCallback(
      (e: GestureResponderEvent) => {
        const height = trackHeightRef.current;
        if (height <= 0) return;
        const next = clampRatio(
          (e.nativeEvent.pageY - trackTopRef.current) / height,
        );
        positionRef.current = next;
        const translateY = Math.min(
          Math.max(next * height - thumbSize / 2, 0),
          Math.max(height - thumbSize, 0),
        );
        applyNativeStyle(thumbRef.current, {
          opacity: 1,
          backgroundColor: colorAtRatio(next),
          transform: [{ translateY }],
        });
      },
      [thumbSize],
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
      if (positionRef.current !== null) {
        setColor(colorAtRatio(positionRef.current));
        setIsErasing(false);
      }
      onDone();
    }, [setColor, setIsErasing, onDone]);

    return (
      <View
        style={[styles.container, { bottom, left }]}
        testID="drawing-color-slider"
      >
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
          <View style={styles.track} pointerEvents="none">
            <Svg width="100%" height="100%" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="drawingSlider" x1="0" y1="0" x2="0" y2="1">
                  {SLIDER_GRADIENT_STOPS.map((s, i) => (
                    <Stop key={i} offset={s.offset} stopColor={s.color} />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="url(#drawingSlider)"
              />
            </Svg>
          </View>
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
