import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { BibleIcon } from "./BibleIcon";
import { BibleText } from "./BibleText";

export type BibleLocationBarProps = {
  version: string;
  bookName: string;
  chapter: number;
  isVersionVisible: boolean;
  onOpenVersion: () => void;
  onOpenBook: () => void;
  onOpenChapter: () => void;
  onOpenAudio: () => void;
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
    onOpenAudio,
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
          gap: ms(DESIGN.spacing.xs),
          paddingHorizontal: ms(DESIGN.spacing.md),
          paddingVertical: ms(DESIGN.spacing.xs),
          borderBottomWidth: 1,
          backgroundColor: readerColors.surface,
          borderBottomColor: colors.border,
        },
        badge: {
          paddingHorizontal: ms(DESIGN.spacing.md),
          paddingVertical: ms(DESIGN.spacing.xs),
          borderRadius: ms(DESIGN.borderRadius.sm),
          backgroundColor: readerColors.primary + "15",
        },
        audioButton: {
          marginLeft: "auto",
          padding: ms(DESIGN.spacing.xs),
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
      <TouchableOpacity
        style={styles.audioButton}
        onPress={onOpenAudio}
        activeOpacity={0.7}
      >
        <BibleIcon
          name="headphones"
          size={ms(DESIGN.icon.sm)}
          color={readerColors.primary}
        />
      </TouchableOpacity>
    </View>
  );
});
