import React, { useCallback, useMemo, useRef, useState } from "react";
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
import { impactLight, selectionHaptic } from "../utils/haptics";

type Props = {
  bottom: number;
  left: number;
  onDone: () => void;
};

export const DrawingColorSlider = React.memo(
  ({ bottom, left, onDone }: Props) => {
    const { ms, DESIGN } = useResponsive();
    const { colors } = useTheme();
    const { color, setColor, setIsErasing } = useDrawings();
    const [trackHeight, setTrackHeight] = useState(0);
    const [ratio, setRatio] = useState<number | null>(null);
    const lastColorRef = useRef<string | null>(null);

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
      setTrackHeight(e.nativeEvent.layout.height);
    }, []);

    const pick = useCallback(
      (e: GestureResponderEvent) => {
        if (trackHeight <= 0) return;
        const next = clampRatio(e.nativeEvent.locationY / trackHeight);
        const picked = colorAtRatio(next);
        setRatio(next);
        if (picked !== lastColorRef.current) {
          lastColorRef.current = picked;
          selectionHaptic();
          setColor(picked);
          setIsErasing(false);
        }
      },
      [trackHeight, setColor, setIsErasing],
    );

    const handleGrant = useCallback(
      (e: GestureResponderEvent) => {
        impactLight();
        pick(e);
      },
      [pick],
    );

    const thumbTop =
      ratio === null ? 0 : ratio * Math.max(trackHeight - thumbSize, 0);

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
          onResponderMove={pick}
          onResponderRelease={onDone}
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
          {ratio !== null && (
            <View
              pointerEvents="none"
              style={[styles.thumb, { top: thumbTop, backgroundColor: color }]}
            />
          )}
        </View>
      </View>
    );
  },
);
