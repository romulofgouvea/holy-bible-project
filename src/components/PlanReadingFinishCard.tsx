import React from "react";
import { TouchableOpacity, View } from "react-native";
import { usePlanReading } from "../hooks/usePlanReading";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { BibleIcon } from "./BibleIcon";
import { BibleText } from "./BibleText";

type Props = {
  onMessage: (message: string) => void;
};

export const PlanReadingFinishCard = React.memo(({ onMessage }: Props) => {
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const { fontSizeMultiplier } = useReaderSettings();
  const fs = (size: number) => ms(size * fontSizeMultiplier);
  const {
    isActive,
    planTitle,
    monthName,
    dayNumber,
    dayChapters,
    completedDays,
    totalDays,
    progressPercent,
    hasNext,
    nextLabel,
    nextDayNumber,
    nextIsNewDay,
    isChapterDone,
    goNext,
    completeAndGoNext,
  } = usePlanReading();

  if (!isActive) return null;

  const handlePress = () => {
    if (isChapterDone) {
      goNext();
      return;
    }
    const result = completeAndGoNext();
    if (!result) return;
    if (result.isPlanDone) onMessage("Plano concluído. Parabéns!");
    else if (result.isDayDone) onMessage("Leitura do dia concluída");
  };

  const nextSuffix = nextIsNewDay ? ` (Dia ${nextDayNumber})` : "";
  const actionLabel = !hasNext
    ? "Concluir o plano"
    : isChapterDone
      ? `Continuar para ${nextLabel}${nextSuffix}`
      : `Concluir e ir para ${nextLabel}${nextSuffix}`;

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={{
        marginHorizontal: ms(DESIGN.spacing.lg),
        marginTop: ms(DESIGN.spacing.xl),
        marginBottom: ms(DESIGN.spacing.xxl),
        padding: ms(DESIGN.spacing.lg),
        gap: ms(DESIGN.spacing.md),
        borderRadius: ms(DESIGN.borderRadius.lg),
        borderWidth: 1,
        borderColor: colors.primary + "30",
        backgroundColor: colors.primary + "15",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.md),
        }}
      >
        <BibleIcon
          name={isChapterDone ? "check-circle" : "book-open"}
          color={colors.primary}
          size={fs(DESIGN.icon.lg)}
        />
        <View style={{ flex: 1, gap: ms(DESIGN.spacing.xs) }}>
          <BibleText
            numberOfLines={1}
            style={{
              fontSize: fs(DESIGN.fontSize.lg),
              fontWeight: "700",
              color: colors.onSurface,
            }}
          >
            {planTitle}
          </BibleText>
          <View
            style={{
              height: ms(6),
              borderRadius: ms(DESIGN.borderRadius.sm),
              backgroundColor: colors.border,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progressPercent}%`,
                borderRadius: ms(DESIGN.borderRadius.sm),
                backgroundColor: colors.primary,
              }}
            />
          </View>
          <BibleText
            style={{
              fontSize: fs(DESIGN.fontSize.xs),
              fontWeight: "700",
              color: colors.textMuted,
            }}
          >
            {completedDays} de {totalDays} dias · {progressPercent}%
          </BibleText>
        </View>
      </View>

      <BibleText
        style={{
          fontSize: fs(DESIGN.fontSize.xl),
          fontWeight: "800",
          color: colors.primary,
        }}
      >
        {monthName} · Dia {dayNumber}
      </BibleText>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: ms(DESIGN.spacing.sm),
        }}
      >
        {dayChapters.map((c) => (
          <View
            key={c.key}
            style={{
              backgroundColor: c.isDone ? colors.primary : "transparent",
              borderWidth: 1,
              borderColor:
                c.isDone || c.isCurrent
                  ? colors.primary
                  : colors.primary + "40",
              borderRadius: ms(DESIGN.borderRadius.md),
              paddingHorizontal: ms(DESIGN.spacing.md),
              paddingVertical: ms(DESIGN.spacing.xs),
            }}
          >
            <BibleText
              style={{
                fontSize: fs(DESIGN.fontSize.md),
                fontWeight: "700",
                color: c.isDone ? colors.onPrimary : colors.primary,
              }}
            >
              {c.label}
            </BibleText>
          </View>
        ))}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ms(DESIGN.spacing.md),
          paddingTop: ms(DESIGN.spacing.md),
          borderTopWidth: 1,
          borderTopColor: colors.primary + "30",
        }}
      >
        <BibleText
          style={{
            flex: 1,
            fontSize: fs(DESIGN.fontSize.md),
            fontWeight: "800",
            color: colors.primary,
          }}
        >
          {actionLabel}
        </BibleText>
        <BibleIcon
          name="chevron-right"
          color={colors.primary}
          size={fs(DESIGN.icon.md)}
        />
      </View>
    </TouchableOpacity>
  );
});
