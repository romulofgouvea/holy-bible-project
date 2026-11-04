import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  GestureResponderEvent,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  useWindowDimensions,
  View,
} from "react-native";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { BibleText } from "./BibleText";

type BibleTooltipButtonProps = TouchableOpacityProps & {
  tooltip?: string;
};

type TooltipPlacement = {
  x: number;
  centerX: number;
  isBelow: boolean;
  buttonHeight: number;
};

export function BibleTooltipButton({
  tooltip,
  onLongPress,
  onPressOut,
  children,
  ...rest
}: BibleTooltipButtonProps) {
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const ref = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
  const [placement, setPlacement] = useState<TooltipPlacement | null>(null);
  const [bubbleWidth, setBubbleWidth] = useState<number | null>(null);
  const gutter = ms(DESIGN.spacing.sm);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tooltip: {
          position: "absolute",
          width: screenWidth - gutter * 2,
          zIndex: 100,
          elevation: 20,
        },
        bubble: {
          alignSelf: "flex-start",
          paddingVertical: ms(DESIGN.spacing.xs),
          paddingHorizontal: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.sm),
          backgroundColor: colors.onSurface,
        },
      }),
    [ms, DESIGN, colors, screenWidth, gutter],
  );

  const handleLongPress = useCallback(
    (event: GestureResponderEvent) => {
      onLongPress?.(event);
      if (!tooltip) return;
      ref.current?.measureInWindow((x, y, w, h) => {
        setPlacement({
          x,
          centerX: x + w / 2,
          isBelow: y < screenHeight * 0.25,
          buttonHeight: h,
        });
      });
    },
    [onLongPress, tooltip, screenHeight],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      setPlacement(null);
      setBubbleWidth(null);
      onPressOut?.(event);
    },
    [onPressOut],
  );

  const bubbleLeft =
    placement && bubbleWidth !== null
      ? Math.min(
          Math.max(placement.centerX - bubbleWidth / 2, gutter),
          screenWidth - bubbleWidth - gutter,
        ) - gutter
      : 0;

  return (
    <TouchableOpacity
      {...rest}
      activeOpacity={tooltip ? 1 : rest.activeOpacity}
      ref={ref}
      onLongPress={handleLongPress}
      onPressOut={handlePressOut}
    >
      {children}
      {placement && tooltip && (
        <View
          pointerEvents="none"
          style={[
            styles.tooltip,
            {
              left: gutter - placement.x,
              opacity: bubbleWidth === null ? 0 : 1,
              ...(placement.isBelow
                ? { top: placement.buttonHeight + gutter }
                : { bottom: placement.buttonHeight + gutter }),
            },
          ]}
        >
          <View
            style={[styles.bubble, { left: bubbleLeft }]}
            onLayout={(e) => {
              const { width } = e.nativeEvent.layout;
              setBubbleWidth((prev) => prev ?? width);
            }}
          >
            <BibleText
              style={{
                color: colors.background,
                fontSize: ms(DESIGN.fontSize.sm),
              }}
            >
              {tooltip}
            </BibleText>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}
