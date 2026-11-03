import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { BibleText } from "./BibleText";

type BibleGridBlockProps = {
  title: string | number;
  widthPercentage?: number;
  exactWidth?: number;
  isSelected?: boolean;
  hasMark?: boolean;
  onPress: () => void;
  testID?: string;
};

export function BibleGridBlock({
  title,
  widthPercentage,
  exactWidth,
  isSelected,
  hasMark,
  onPress,
  testID,
}: BibleGridBlockProps) {
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        gridItem: {
          aspectRatio: 1,
          borderWidth: 1,
          borderRadius: ms(DESIGN.borderRadius.lg),
          justifyContent: "center",
          alignItems: "center",
        },
        markDot: {
          position: "absolute",
          top: ms(DESIGN.spacing.sm),
          right: ms(DESIGN.spacing.sm),
          width: ms(DESIGN.spacing.sm),
          height: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.full),
        },
        gridText: {
          fontWeight: "800",
        },
      }),
    [ms, colors, DESIGN],
  );

  return (
    <TouchableOpacity
      testID={testID}
      activeOpacity={0.7}
      style={[
        styles.gridItem,
        exactWidth
          ? { width: exactWidth, height: exactWidth }
          : widthPercentage
            ? { width: `${widthPercentage}%` }
            : {},
        {
          backgroundColor: isSelected
            ? colors.primary
            : colors.surfaceHighlight,
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
      onPress={onPress}
    >
      <BibleText
        style={[
          styles.gridText,
          {
            fontSize: ms(17),
            color: isSelected ? colors.onPrimary : colors.primary,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </BibleText>
      {hasMark && (
        <View
          style={[
            styles.markDot,
            {
              backgroundColor: isSelected ? colors.onPrimary : colors.primary,
            },
          ]}
        />
      )}
    </TouchableOpacity>
  );
}
