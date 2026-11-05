import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { BibleText } from "./BibleText";

export type BibleLocationBarProps = {
  version: string;
  bookName: string;
  chapter: number;
  isVersionVisible: boolean;
  onOpenVersion: () => void;
  onOpenBook: () => void;
  onOpenChapter: () => void;
};

export const BibleLocationBar = React.memo((props: BibleLocationBarProps) => {
  const {
    version,
    bookName,
    chapter,
    isVersionVisible,
    onOpenVersion,
    onOpenBook,
    onOpenChapter,
  } = props;
  const { ms, DESIGN } = useResponsive();
  const { readerColors } = useReaderSettings();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          minHeight: ms(DESIGN.height.lg),
          gap: ms(DESIGN.spacing.xs),
          paddingHorizontal: ms(DESIGN.spacing.md),
          paddingVertical: ms(DESIGN.spacing.xs),
          borderBottomWidth: 1,
          backgroundColor: readerColors.surface,
          borderBottomColor: colors.border,
        },
        badge: {
          paddingHorizontal: ms(DESIGN.spacing.md),
          paddingVertical: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.sm),
          borderWidth: 1,
          borderColor: readerColors.primary + "40",
          backgroundColor: readerColors.primary + "15",
        },
        bookBadge: {
          flexShrink: 1,
          minWidth: 0,
        },
        badgeText: {
          fontWeight: "800",
          color: readerColors.primary,
          fontSize: ms(DESIGN.fontSize.lg),
        },
      }),
    [ms, DESIGN, readerColors, colors],
  );

  return (
    <View style={styles.container}>
      {isVersionVisible ? (
        <TouchableOpacity
          style={styles.badge}
          onPress={onOpenVersion}
          activeOpacity={0.7}
        >
          <BibleText style={styles.badgeText}>
            {version.toUpperCase()}
          </BibleText>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        style={[styles.badge, styles.bookBadge]}
        onPress={onOpenBook}
        activeOpacity={0.7}
      >
        <BibleText style={styles.badgeText} numberOfLines={1}>
          {bookName}
        </BibleText>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.badge}
        onPress={onOpenChapter}
        activeOpacity={0.7}
      >
        <BibleText style={styles.badgeText}>{chapter}</BibleText>
      </TouchableOpacity>
    </View>
  );
});
