import React, { useEffect, useRef, useMemo } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { useResponsive } from "../hooks/useResponsive";
import { impactLight } from "../utils/haptics";

interface BibleSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
}

export function BibleSwitch({ value, onValueChange, label }: BibleSwitchProps) {
  const { colors } = useTheme();
  const { ms, DESIGN } = useResponsive();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        track: {
          justifyContent: "center",
        },
        thumb: {
          position: "absolute",
        },
      }),
    [ms, colors, DESIGN],
  );

  const translateX = useRef(
    new Animated.Value(value ? ms(DESIGN.fontSize.xxl) : ms(2)),
  ).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? ms(DESIGN.fontSize.xxl) : ms(2),
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [value, ms]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => {
        impactLight();
        onValueChange(!value);
      }}
      style={[
        styles.track,
        {
          width: ms(44),
          height: ms(26),
          borderRadius: ms(13),
          backgroundColor: value ? colors.primary : colors.border,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.thumb,
          {
            width: ms(22),
            height: ms(22),
            borderRadius: ms(11),
            backgroundColor: "#FFFFFF",
            transform: [{ translateX }],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 1,
            elevation: 2,
          },
        ]}
      />
    </TouchableOpacity>
  );
}
