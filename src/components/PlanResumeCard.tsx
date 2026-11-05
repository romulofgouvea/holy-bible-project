import React, { useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { usePlanResume } from "../hooks/usePlanResume";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { BibleIcon } from "./BibleIcon";
import { BibleText } from "./BibleText";

let isDismissedThisSession = false;

export const PlanResumeCard = React.memo(() => {
  const { ms, DESIGN } = useResponsive();
  const { colors: themeColors } = useTheme();
  const { fontSizeMultiplier, readerColors, readerTheme } = useReaderSettings();
  const colors = useMemo(
    () =>
      readerTheme === "sepia"
        ? {
            ...themeColors,
            primary: readerColors.primary,
            onPrimary: readerColors.onPrimary,
            onSurface: readerColors.onSurface,
            textMuted: readerColors.secondary,
            border: readerColors.secondaryVariant,
          }
        : themeColors,
    [readerTheme, readerColors, themeColors],
  );
  const { resume, start } = usePlanResume();
  const [isDismissed, setIsDismissed] = useState(isDismissedThisSession);

  if (!resume || isDismissed) return null;

  const fs = (size: number) => ms(size * fontSizeMultiplier);

  return (
    <TouchableOpacity
      onPress={start}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: ms(DESIGN.spacing.md),
        alignSelf: "stretch",
        marginTop: ms(DESIGN.spacing.md),
        padding: ms(DESIGN.spacing.md),
        borderRadius: ms(DESIGN.borderRadius.lg),
        borderWidth: 1,
        borderColor: colors.primary + "30",
        backgroundColor: colors.primary + "15",
      }}
    >
      <BibleIcon
        name="play-circle"
        color={colors.primary}
        size={fs(DESIGN.icon.lg)}
        containerSize={DESIGN.icon.lg * fontSizeMultiplier}
      />
      <View style={{ flex: 1 }}>
        <BibleText
          numberOfLines={1}
          style={{
            fontSize: fs(DESIGN.fontSize.xs),
            fontWeight: "700",
            color: colors.textMuted,
          }}
        >
          {resume.planTitle}
        </BibleText>
        <BibleText
          style={{
            fontSize: fs(DESIGN.fontSize.md),
            fontWeight: "800",
            color: colors.primary,
          }}
        >
          Continuar: {resume.label} · {resume.monthName}, Dia {resume.dayNumber}
        </BibleText>
      </View>
      <TouchableOpacity
        onPress={() => {
          isDismissedThisSession = true;
          setIsDismissed(true);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <BibleIcon
          name="x"
          color={colors.textMuted}
          size={fs(DESIGN.icon.md)}
          containerSize={DESIGN.icon.md * fontSizeMultiplier}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});
