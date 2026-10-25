import * as Clipboard from "expo-clipboard";
import React, { useMemo } from "react";
import {
  Animated,
  Platform,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { VERSE_HIGHLIGHTS as HIGHLIGHT_COLORS } from "../../constants/colors";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { SelectedVerse } from "../../models";
import { formatVerseRanges } from "../../utils/verseRange";
import { BibleIcon } from "../BibleIcon";
import { BibleAddToStudyModal } from "./BibleAddToStudyModal";
import { BibleNoteModal } from "./BibleNoteModal";

type VerseActionSheetProps = {
  visible: boolean;
  selectedVerses: SelectedVerse[];
  highlights: Record<string, any>;
  onClose: () => void;
  onBulkHighlight: (verses: SelectedVerse[], color: string | null) => void;
  onDraw?: (verses: SelectedVerse[]) => void;
  onShowToast?: (msg: string, type?: "success" | "info" | "warning") => void;
};

export function BibleVerseActionSheet(props: VerseActionSheetProps) {
  const {
    visible,
    selectedVerses,
    highlights,
    onClose,
    onBulkHighlight,
    onDraw,
  } = props;
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingTop: ms(DESIGN.spacing.md),
          borderTopLeftRadius: ms(DESIGN.borderRadius.xl),
          borderTopRightRadius: ms(DESIGN.borderRadius.xl),
          borderWidth: 1,
          elevation: 20,
          shadowOffset: { width: 0, height: ms(-DESIGN.spacing.xs) },
          shadowOpacity: 0.15,
          shadowRadius: ms(DESIGN.spacing.md),
        },
        topRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: ms(DESIGN.spacing.sm),
        },
        topRowContainer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: ms(DESIGN.spacing.lg),
        },
        bottomRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
        },
        iconBtn: {
          width: ms(DESIGN.icon.xl),
          height: ms(DESIGN.icon.xl),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
          justifyContent: "center",
        },
        colorBox: {
          width: ms(DESIGN.icon.lg),
          height: ms(DESIGN.icon.lg),
          borderRadius: ms(DESIGN.borderRadius.sm),
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [ms, DESIGN],
  );

  const hiddenY = ms(DESIGN.layout.settingsIconOffset * 3);
  const translateY = React.useRef(new Animated.Value(hiddenY)).current;
  const [studyModalVisible, setStudyModalVisible] = React.useState(false);
  const [noteModalVisible, setNoteModalVisible] = React.useState(false);

  React.useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : hiddenY,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible, hiddenY, translateY]);

  const count = selectedVerses.length;

  const { hasHighlight, activeColorId } = useMemo(() => {
    if (count === 0) {
      return { hasHighlight: false, activeColorId: null };
    }

    const getVal = (key: string) => {
      const h = highlights[key];
      return h ? (typeof h === "string" ? h : h.color) : undefined;
    };

    let hasAny = false;
    let firstColor: string | undefined;
    let isAllSame = true;

    selectedVerses.forEach((v, idx) => {
      const key = `${v.bookAbbrev}-${v.chapter}-${v.verse}`;
      const color = getVal(key);
      if (color) {
        hasAny = true;
      }
      if (idx === 0) {
        firstColor = color;
      } else if (color !== firstColor) {
        isAllSame = false;
      }
    });

    return {
      hasHighlight: hasAny,
      activeColorId: isAllSame ? firstColor || null : null,
    };
  }, [count, selectedVerses, highlights]);

  const buildText = () => {
    if (count === 0) return "";
    const sorted = [...selectedVerses].sort((a, b) =>
      a.chapter !== b.chapter ? a.chapter - b.chapter : a.verse - b.verse,
    );
    const { ranges, sameChapter } = formatVerseRanges(sorted);

    const header = sameChapter
      ? `${sorted[0].bookName} ${sorted[0].chapter}:${ranges}`
      : `${sorted[0].bookName} ${ranges}`;

    const versionLabel = sorted[0].version.toUpperCase();
    const body = sorted.map((v) => `${v.verse} ${v.text}`).join("\n");

    const hasCompare = sorted.some((v) => v.compareText);
    if (hasCompare) {
      const compareVersionLabel =
        sorted.find((v) => v.compareVersion)?.compareVersion?.toUpperCase() ||
        "";
      const compareBody = sorted
        .map((v) => (v.compareText ? `${v.verse} ${v.compareText}` : ""))
        .filter(Boolean)
        .join("\n");
      return `${header}\n\n${versionLabel}\n${body}\n\n${compareVersionLabel}\n${compareBody}`;
    }

    return `${header}\n${body}`;
  };

  const onCopy = async () => {
    await Clipboard.setStringAsync(buildText());
    if (Platform.OS !== "android") {
      props.onShowToast?.("Copiado para a área de transferência", "success");
    }
    onClose();
  };

  const onShare = async () => {
    try {
      await Share.share({ message: buildText() });
    } catch {}
  };

  const onHighlight = (color: string | null) => {
    onBulkHighlight(selectedVerses, color);
    const isPlural = selectedVerses.length > 1;
    const action = color ? "marcado" : "desmarcado";
    props.onShowToast?.(
      `Versículo${isPlural ? "s" : ""} ${action}${isPlural ? "s" : ""}`,
      "success",
    );
    onClose();
  };

  if (!visible && selectedVerses.length === 0) return null;

  return (
    <>
      <Animated.View
        style={[
          styles.bar,
          {
            transform: [{ translateY }],
            backgroundColor: colors.background,
            paddingBottom: ms(DESIGN.spacing.lg),
            borderColor: colors.border,
          },
        ]}
        id="bible-verse-action-sheet"
      >
        <View style={styles.topRowContainer}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor:
                    count === 0
                      ? colors.surfaceHighlight
                      : colors.primary + "25",
                },
              ]}
              onPress={onShare}
              disabled={count === 0}
            >
              <BibleIcon
                name="share-2"
                size={ms(DESIGN.spacing.lg)}
                color={count === 0 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor:
                    count === 0
                      ? colors.surfaceHighlight
                      : colors.primary + "25",
                },
              ]}
              onPress={onCopy}
              disabled={count === 0}
            >
              <BibleIcon
                name="copy"
                size={ms(DESIGN.spacing.lg)}
                color={count === 0 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor:
                    count === 0
                      ? colors.surfaceHighlight
                      : colors.primary + "25",
                },
              ]}
              onPress={() => setStudyModalVisible(true)}
              disabled={count === 0}
            >
              <BibleIcon
                name="book-open"
                size={ms(DESIGN.spacing.lg)}
                color={count === 0 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor:
                    count === 0
                      ? colors.surfaceHighlight
                      : colors.primary + "25",
                },
              ]}
              onPress={() => setNoteModalVisible(true)}
              disabled={count === 0}
            >
              <BibleIcon
                name="edit-2"
                size={ms(DESIGN.spacing.lg)}
                color={count === 0 ? colors.textMuted : colors.primary}
              />
            </TouchableOpacity>

            {onDraw && (
              <TouchableOpacity
                style={[
                  styles.iconBtn,
                  {
                    backgroundColor:
                      count === 0
                        ? colors.surfaceHighlight
                        : colors.primary + "25",
                  },
                ]}
                onPress={() => onDraw(selectedVerses)}
                disabled={count === 0}
              >
                <BibleIcon
                  name="pen-tool"
                  size={ms(DESIGN.spacing.lg)}
                  color={count === 0 ? colors.textMuted : colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>

          <BibleIcon
            name="x"
            color={colors.error}
            backgroundColor={colors.error + "20"}
            onPress={onClose}
            containerSize={DESIGN.icon.xl}
            size={ms(DESIGN.spacing.lg)}
            borderRadius={DESIGN.borderRadius.md}
          />
        </View>

        <View style={styles.bottomRow}>
          {hasHighlight && (
            <TouchableOpacity
              style={{ paddingRight: ms(DESIGN.spacing.xs) }}
              onPress={() => onHighlight(null)}
            >
              <View
                style={[
                  styles.colorBox,
                  { backgroundColor: colors.surfaceHighlight },
                ]}
              >
                <BibleIcon name="slash" color={colors.error} />
              </View>
            </TouchableOpacity>
          )}

          {HIGHLIGHT_COLORS.map((c) => {
            const isSelectedColor = activeColorId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={{ paddingHorizontal: ms(DESIGN.spacing.xs) }}
                onPress={() => onHighlight(c.id)}
              >
                <View style={[styles.colorBox, { backgroundColor: c.hex }]}>
                  {isSelectedColor && (
                    <BibleIcon
                      name="check"
                      size={ms(DESIGN.spacing.lg)}
                      color="#FFFFFF"
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      <BibleAddToStudyModal
        visible={studyModalVisible}
        onClose={() => {
          setStudyModalVisible(false);
          onClose();
        }}
        selectedVerses={selectedVerses}
        onShowToast={props.onShowToast}
      />

      <BibleNoteModal
        visible={noteModalVisible}
        onClose={() => {
          setNoteModalVisible(false);
          onClose();
        }}
        selectedVerses={selectedVerses}
        onShowToast={props.onShowToast}
      />
    </>
  );
}
