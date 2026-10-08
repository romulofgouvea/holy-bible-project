import { VERSE_HIGHLIGHTS } from "@/constants/colors";
import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { ALIASES } from "../data/bible-version";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { impactLight, impactMedium } from "../utils/haptics";
import { BibleIcon } from "./BibleIcon";
import { BibleText } from "./BibleText";

import { VerseTitle } from "../models";

type VerseItem = {
  chapter: number;
  verse: number;
  text: string;
  titles?: VerseTitle[];
};

type SectionType = {
  title: string;
  data: VerseItem[];
};

type ListItem =
  | { type: "header"; title: string }
  | {
      type: "sectionTitle";
      title: string;
      titleType: string;
      chapter: number;
      verse: number;
      id: string;
    }
  | {
      type: "verse";
      chapter: number;
      verse: number;
      text: string;
      titles?: VerseTitle[];
    }
  | {
      type: "paragraph";
      chapter: number;
      verse: number;
      verses: VerseItem[];
      id: string;
    }
  | {
      type: "footer";
      versionInfo: any;
      copyright: string;
    };

type VerseReaderProps = {
  sections: SectionType[];
  blinkingVerse: string | null;
  playingVerseKey?: string | null;
  highlights: Record<string, any>;
  notes: Record<string, any>;
  selectedKeys: Record<string, boolean>;
  bookAbbrev: string;
  version: string;
  onVersePress: (item: VerseItem) => void;
  onVerseLongPress?: (item: VerseItem) => void;
  onViewableItemsChanged?: ({
    viewableItems,
  }: {
    viewableItems: any[];
  }) => void;
  viewabilityConfig?: any;
  listRef?: React.RefObject<any>;
  onScroll?: (event: any) => void;
  onScrollBeginDrag?: (event: any) => void;
  onScrollEndDrag?: (event: any) => void;
  onMomentumScrollEnd?: (event: any) => void;
  scrollEventThrottle?: number;
  splitMode?: boolean;
};

const renderVerseContent = (
  v: VerseItem,
  shouldShowTitles: boolean,
  primaryColor: string,
  fontSizeMultiplier: number,
  ms: any,
  DESIGN: any,
) => {
  const midTitles =
    shouldShowTitles && v.titles
      ? v.titles
          .filter((t: VerseTitle) => t.positionIndex > 0)
          .sort((a, b) => a.positionIndex - b.positionIndex)
      : [];
  if (midTitles.length === 0) return v.text;

  const elements: React.ReactNode[] = [];
  let currentTextIndex = 0;
  midTitles.forEach((t, index) => {
    elements.push(
      <React.Fragment key={`text-${index}`}>
        {v.text.substring(currentTextIndex, t.positionIndex)}
      </React.Fragment>,
    );
    currentTextIndex = t.positionIndex;
    elements.push(
      <BibleText
        key={`title-${index}`}
        style={{
          color: primaryColor,
          fontSize: ms(DESIGN.fontSize.xxxl * fontSizeMultiplier),
          fontWeight: t.type === "speech" ? "500" : "700",
          fontStyle: t.type === "speech" ? "italic" : "normal",
        }}
      >
        {"\n\n"}
        {t.title}
        {"\n"}
      </BibleText>,
    );
  });
  if (currentTextIndex < v.text.length) {
    elements.push(
      <React.Fragment key="text-end">
        {v.text.substring(currentTextIndex)}
      </React.Fragment>,
    );
  }
  return elements;
};

const ParagraphRow = React.memo(
  ({
    entries,
    primaryColor,
    readerColors,
    fontSizeMultiplier,
    textAlign,
    shouldShowTitles,
    ms,
    DESIGN,
    styles,
    onVersePress,
    onVerseLongPress,
  }: any) => {
    return (
      <View style={styles.paragraphRow}>
        <BibleText
          variant="reading"
          style={[
            styles.verseText,
            {
              fontSize: ms(DESIGN.fontSize.xxl * fontSizeMultiplier),
              lineHeight: ms(
                DESIGN.fontSize.xxl * fontSizeMultiplier * DESIGN.lineHeight.md,
              ),
              color: readerColors.onBackground,
              textAlign: textAlign as any,
            },
          ]}
        >
          {"    "}
          {entries.map((e: any, idx: number) => (
            <BibleText
              key={`${e.verse.chapter}-${e.verse.verse}`}
              onPress={() => {
                impactLight();
                onVersePress(e.verse);
              }}
              onLongPress={() => {
                if (!onVerseLongPress) return;
                impactMedium();
                onVerseLongPress(e.verse);
              }}
              style={{
                backgroundColor: e.isBlinking
                  ? `${primaryColor}20`
                  : e.isHighlighted
                    ? e.highlightColorHex
                    : e.isSelected || e.isPlaying
                      ? `${primaryColor}20`
                      : "transparent",
              }}
            >
              {idx > 0 ? " " : ""}
              {renderVerseContent(
                e.verse,
                shouldShowTitles,
                primaryColor,
                fontSizeMultiplier,
                ms,
                DESIGN,
              )}
              {e.hasNote && (
                <BibleText style={{ color: primaryColor, opacity: 0.8 }}>
                  {" "}
                  <BibleIcon
                    name="edit-3"
                    size={ms(DESIGN.fontSize.md * fontSizeMultiplier)}
                    color={primaryColor}
                  />
                </BibleText>
              )}
            </BibleText>
          ))}
        </BibleText>
      </View>
    );
  },
  (prev, next) =>
    prev.entries.length === next.entries.length &&
    prev.entries[0]?.verse === next.entries[0]?.verse &&
    prev.metaKey === next.metaKey &&
    prev.fontSizeMultiplier === next.fontSizeMultiplier &&
    prev.textAlign === next.textAlign &&
    prev.shouldShowTitles === next.shouldShowTitles &&
    prev.readerColors.background === next.readerColors.background &&
    prev.primaryColor === next.primaryColor &&
    prev.styles === next.styles,
);

const VerseRow = React.memo(
  ({
    item,
    isSelected,
    isHighlighted,
    isBlinking,
    isPlaying,
    hasNote,
    highlightColorHex,
    primaryColor,
    readerColors,
    fontSizeMultiplier,
    textAlign,
    shouldShowTitles,
    shouldShowVerseNumbers,
    ms,
    DESIGN,
    styles,
    onVersePress,
    onVerseLongPress,
    splitMode,
  }: any) => {
    const textGap = shouldShowVerseNumbers ? "  " : "";
    const blinkAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isBlinking) {
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: false,
          }),
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 450,
            delay: 500,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }, [isBlinking, blinkAnim]);

    const primaryLow = `${primaryColor}20`;

    const animatedBackgroundColor = blinkAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        isHighlighted
          ? highlightColorHex
          : isSelected || isPlaying
            ? primaryLow
            : "transparent",
        primaryLow,
      ],
    });

    const leadingTitles =
      splitMode && shouldShowTitles && item.titles
        ? item.titles.filter((t: any) => t.positionIndex === 0)
        : [];

    const midVerseTitles =
      shouldShowTitles && item.titles
        ? item.titles.filter((t: any) => t.positionIndex > 0)
        : [];

    const renderMidVerseTitlesAndText = () => {
      if (midVerseTitles.length === 0) {
        return (
          <React.Fragment>
            {textGap}
            {item.text}
          </React.Fragment>
        );
      }

      const elements = [];
      let currentTextIndex = 0;

      const sortedTitles = [...midVerseTitles].sort(
        (a, b) => a.positionIndex - b.positionIndex,
      );

      sortedTitles.forEach((t, index) => {
        const textBefore = item.text.substring(
          currentTextIndex,
          t.positionIndex,
        );
        elements.push(
          <React.Fragment key={`text-${index}`}>
            {index === 0 ? textGap : ""}
            {textBefore}
          </React.Fragment>,
        );
        currentTextIndex = t.positionIndex;

        elements.push(
          <BibleText
            key={`title-${index}`}
            style={{
              color: primaryColor,
              fontSize: ms(DESIGN.fontSize.xxxl * fontSizeMultiplier),
              fontWeight: t.type === "speech" ? "500" : "700",
              fontStyle: t.type === "speech" ? "italic" : "normal",
            }}
          >
            {"\n\n"}
            {t.title}
            {"\n"}
          </BibleText>,
        );
      });

      if (currentTextIndex < item.text.length) {
        elements.push(
          <React.Fragment key="text-end">
            {item.text.substring(currentTextIndex)}
          </React.Fragment>,
        );
      }

      return elements;
    };

    return (
      <View>
        {leadingTitles.length > 0 && (
          <View style={styles.leadingTitleContainer}>
            {leadingTitles.map((t: any, idx: number) => (
              <BibleText
                key={`lead-title-${idx}`}
                style={[
                  styles.leadingTitleText,
                  {
                    color: primaryColor,
                    fontSize: ms(DESIGN.fontSize.xxxl * fontSizeMultiplier),
                    fontWeight: t.type === "speech" ? "500" : "700",
                    fontStyle: t.type === "speech" ? "italic" : "normal",
                  },
                ]}
              >
                {t.title}
              </BibleText>
            ))}
          </View>
        )}
        <TouchableOpacity
          onPress={() => {
            impactLight();
            onVersePress(item);
          }}
          onLongPress={() => {
            if (!onVerseLongPress) return;
            impactMedium();
            onVerseLongPress(item);
          }}
          activeOpacity={0.7}
        >
          <Animated.View
            style={[
              styles.verseRow,
              { backgroundColor: animatedBackgroundColor },
              isSelected && { borderLeftColor: primaryColor },
            ]}
          >
            <BibleText
              variant="reading"
              style={[
                styles.verseText,
                {
                  fontSize: ms(DESIGN.fontSize.xxl * fontSizeMultiplier),
                  lineHeight: ms(
                    DESIGN.fontSize.xxl *
                      fontSizeMultiplier *
                      DESIGN.lineHeight.md,
                  ),
                  color: readerColors.onBackground,
                  textAlign: textAlign as any,
                },
              ]}
            >
              {shouldShowVerseNumbers && (
                <BibleText
                  style={{
                    color: primaryColor,
                    fontWeight: "700",
                    fontSize: ms(DESIGN.fontSize.lg * fontSizeMultiplier),
                  }}
                >
                  {item.verse}
                </BibleText>
              )}
              {renderMidVerseTitlesAndText()}
              {hasNote && (
                <BibleText style={{ color: primaryColor, opacity: 0.8 }}>
                  {"\u00A0"}
                  <BibleIcon
                    name="edit-3"
                    size={ms(DESIGN.fontSize.md * fontSizeMultiplier)}
                    color={primaryColor}
                  />
                </BibleText>
              )}
            </BibleText>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item === nextProps.item &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.hasNote === nextProps.hasNote &&
      prevProps.isHighlighted === nextProps.isHighlighted &&
      prevProps.isBlinking === nextProps.isBlinking &&
      prevProps.isPlaying === nextProps.isPlaying &&
      prevProps.fontSizeMultiplier === nextProps.fontSizeMultiplier &&
      prevProps.textAlign === nextProps.textAlign &&
      prevProps.shouldShowTitles === nextProps.shouldShowTitles &&
      prevProps.shouldShowVerseNumbers === nextProps.shouldShowVerseNumbers &&
      prevProps.readerColors.background === nextProps.readerColors.background &&
      prevProps.primaryColor === nextProps.primaryColor &&
      prevProps.styles === nextProps.styles &&
      prevProps.splitMode === nextProps.splitMode
    );
  },
);

export const BibleVerseReader = React.memo((props: VerseReaderProps) => {
  const {
    sections,
    blinkingVerse,
    playingVerseKey,
    highlights,
    notes,
    selectedKeys,
    bookAbbrev,
    version,
    onVersePress,
    onVerseLongPress,
    onViewableItemsChanged,
    viewabilityConfig,
    listRef,
    onScroll,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollEnd,
    scrollEventThrottle,
    splitMode,
  } = props;
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const {
    fontSizeMultiplier,
    textAlign,
    readerColors,
    readerTheme,
    shouldShowTitles,
    shouldShowVerseNumbers,
  } = useReaderSettings();

  const flashListRef = useRef<any>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        verseList: {
          flex: 1,
        },
        chapterHeader: {
          paddingVertical: ms(DESIGN.spacing.xl),
          paddingHorizontal: ms(DESIGN.spacing.lg),
          alignItems: "center",
          justifyContent: "center",
          marginBottom: ms(DESIGN.spacing.sm),
        },
        chapterHeaderText: {
          fontWeight: "800",
          letterSpacing: 0.5,
        },
        sectionTitleContainer: {
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingTop: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.spacing.xs),
        },
        sectionTitle: {
          fontWeight: "700",
          letterSpacing: 0.3,
        },
        leadingTitleContainer: {
          paddingTop: ms(DESIGN.spacing.md),
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.spacing.xs),
        },
        leadingTitleText: {
          fontWeight: "700",
          letterSpacing: 0.3,
        },
        verseRow: {
          paddingVertical: ms(DESIGN.spacing.md),
          paddingHorizontal: ms(DESIGN.spacing.lg),
          borderRadius: ms(DESIGN.borderRadius.none),
          marginHorizontal: ms(DESIGN.spacing.none),
          borderLeftWidth: ms(DESIGN.spacing.xs),
          borderLeftColor: "transparent",
        },
        paragraphRow: {
          paddingVertical: ms(DESIGN.spacing.md),
          paddingHorizontal: ms(DESIGN.spacing.lg),
        },
        verseText: {
          flexWrap: "wrap",
          textAlignVertical: "top",
        },
        readerContent: {
          paddingBottom: ms(DESIGN.layout.listPaddingBottom),
        },
        copyrightCard: {
          marginHorizontal: ms(DESIGN.spacing.lg),
          marginTop: ms(DESIGN.spacing.xl),
          marginBottom: ms(DESIGN.spacing.lg),
          padding: ms(DESIGN.spacing.lg),
          borderRadius: ms(DESIGN.borderRadius.md),
          borderLeftWidth: ms(DESIGN.spacing.xs),
        },
        copyrightTitle: {
          fontSize: ms(DESIGN.fontSize.md),
          fontWeight: "700",
          marginBottom: ms(DESIGN.spacing.xs),
          letterSpacing: 0.3,
        },
        copyrightText: {
          fontSize: ms(DESIGN.fontSize.xs),
          lineHeight: ms(DESIGN.fontSize.lg),
          opacity: 0.75,
        },
      }),
    [ms, colors, DESIGN],
  );

  const getHighlightColorValue = (colorId: string) => {
    const h = VERSE_HIGHLIGHTS.find((v) => v.id === colorId);
    return h ? `${h.hex}4D` : colors.surfaceHighlight;
  };

  const flatData = useMemo(() => {
    const data: ListItem[] = [];
    const isContinuous = !splitMode && !shouldShowVerseNumbers;
    sections.forEach((sec) => {
      data.push({ type: "header", title: sec.title });
      let paragraph: VerseItem[] = [];
      const flushParagraph = () => {
        if (paragraph.length === 0) return;
        data.push({
          type: "paragraph",
          chapter: paragraph[0].chapter,
          verse: paragraph[0].verse,
          verses: paragraph,
          id: `paragraph-${paragraph[0].chapter}-${paragraph[0].verse}`,
        });
        paragraph = [];
      };
      sec.data.forEach((v) => {
        if (!splitMode && shouldShowTitles && v.titles && v.titles.length > 0) {
          if (isContinuous && v.titles.some((t) => t.positionIndex === 0)) {
            flushParagraph();
          }
          const zeroIndexTitles = v.titles.filter(
            (t: VerseTitle) => t.positionIndex === 0,
          );
          zeroIndexTitles.forEach((t: VerseTitle, idx: number) => {
            data.push({
              type: "sectionTitle",
              title: t.title,
              titleType: t.type,
              chapter: v.chapter,
              verse: v.verse,
              id: `title-${v.chapter}-${v.verse}-${idx}`,
            });
          });
        }
        if (isContinuous) {
          paragraph.push(v);
        } else {
          data.push({ type: "verse", ...v });
        }
      });
      flushParagraph();
      const versionInfo = ALIASES.find((v) => v.sigla === version);
      const copyright = (versionInfo as any)?.copyright;
      if (copyright) {
        data.push({ type: "footer", versionInfo, copyright });
      }
    });
    return data;
  }, [sections, version, splitMode, shouldShowTitles, shouldShowVerseNumbers]);

  useImperativeHandle(
    listRef,
    () => ({
      scrollToVerse: (
        targetVerse: number,
        options?: { animated?: boolean },
      ) => {
        const index = flatData.findIndex(
          (item) =>
            (item.type === "verse" && item.verse === targetVerse) ||
            (item.type === "paragraph" &&
              item.verses.some((v) => v.verse === targetVerse)),
        );
        if (index !== -1 && flashListRef.current) {
          flashListRef.current.scrollToIndex({
            index,
            animated: options?.animated ?? false,
            viewPosition: 0.05,
            viewOffset: 0,
          });
        }
      },
      scrollToIndex: (params: any) => {
        flashListRef.current?.scrollToIndex(params);
      },
      scrollToOffset: (params: any) => {
        flashListRef.current?.scrollToOffset(params);
      },
    }),
    [flatData],
  );

  const primaryColor =
    readerTheme === "sepia" ? readerColors.primary : colors.primary;

  const getVerseMeta = (item: VerseItem) => {
    const isBlinking = blinkingVerse === `${item.chapter}-${item.verse}`;
    const isPlaying = playingVerseKey === `${item.chapter}-${item.verse}`;
    const hasNote = !!notes[`${bookAbbrev}-${item.chapter}-${item.verse}`];
    const highlight = highlights[`${bookAbbrev}-${item.chapter}-${item.verse}`];
    const highlightColorId = highlight
      ? typeof highlight === "string"
        ? highlight
        : highlight.color
      : undefined;
    const isSelected =
      selectedKeys[`${bookAbbrev}-${item.chapter}-${item.verse}`];
    const highlightColorHex = getHighlightColorValue(highlightColorId);
    return {
      isBlinking,
      isPlaying,
      hasNote,
      highlightColorId,
      isSelected,
      highlightColorHex,
    };
  };

  return (
    <View
      style={[styles.verseList, { backgroundColor: readerColors.background }]}
      testID="bible-verse-reader"
    >
      <FlashList
        ref={flashListRef}
        data={flatData}
        getItemType={(item) => item.type}
        keyExtractor={(item, idx) => {
          if (item.type === "header") return `header-${item.title}`;
          if (item.type === "sectionTitle" || item.type === "paragraph")
            return item.id;
          if (item.type === "footer")
            return `footer-${item.versionInfo?.sigla}-${idx}`;
          return `verse-${version}-${item.chapter}-${item.verse}`;
        }}
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <View
                style={[
                  styles.chapterHeader,
                  { backgroundColor: readerColors.background },
                ]}
              >
                <BibleText
                  style={[
                    styles.chapterHeaderText,
                    {
                      fontSize: ms(
                        DESIGN.fontSize.display * 0.875 * fontSizeMultiplier,
                      ),
                      color: primaryColor,
                    },
                  ]}
                >
                  {item.title}
                </BibleText>
              </View>
            );
          }
          if (item.type === "sectionTitle") {
            return (
              <View style={styles.sectionTitleContainer}>
                <BibleText
                  style={[
                    styles.sectionTitle,
                    {
                      color: primaryColor,
                      fontSize: ms(DESIGN.fontSize.xxxl * fontSizeMultiplier),
                      fontWeight: item.titleType === "speech" ? "500" : "700",
                      fontStyle:
                        item.titleType === "speech" ? "italic" : "normal",
                    },
                  ]}
                >
                  {item.title}
                </BibleText>
              </View>
            );
          }
          if (item.type === "footer") {
            const primaryLow = primaryColor + "1A";
            return (
              <View>
                <View
                  style={[
                    styles.copyrightCard,
                    {
                      backgroundColor: primaryLow,
                      borderLeftColor: primaryColor,
                    },
                  ]}
                >
                  <BibleText
                    style={[styles.copyrightTitle, { color: primaryColor }]}
                  >
                    {item.versionInfo?.name} ({item.versionInfo?.sigla}
                    {item.versionInfo?.year
                      ? ` - ${item.versionInfo.year}`
                      : ""}
                    )
                  </BibleText>
                  <BibleText
                    style={[
                      styles.copyrightText,
                      { color: readerColors.onBackground, opacity: 0.6 },
                    ]}
                  >
                    {item.copyright}
                  </BibleText>
                </View>
              </View>
            );
          }

          if (item.type === "paragraph") {
            const entries = item.verses.map((v) => {
              const m = getVerseMeta(v);
              return {
                verse: v,
                isBlinking: m.isBlinking,
                isPlaying: m.isPlaying,
                isSelected: !!m.isSelected,
                isHighlighted: !!m.highlightColorId,
                highlightColorHex: m.highlightColorHex,
                hasNote: m.hasNote,
              };
            });
            const metaKey = entries
              .map(
                (e) =>
                  `${+e.isBlinking}${+e.isPlaying}${+e.isSelected}${+e.hasNote}${e.isHighlighted ? e.highlightColorHex : "-"}`,
              )
              .join("|");
            return (
              <ParagraphRow
                entries={entries}
                metaKey={metaKey}
                primaryColor={primaryColor}
                readerColors={readerColors}
                fontSizeMultiplier={fontSizeMultiplier}
                textAlign={textAlign}
                shouldShowTitles={shouldShowTitles}
                ms={ms}
                DESIGN={DESIGN}
                styles={styles}
                onVersePress={onVersePress}
                onVerseLongPress={onVerseLongPress}
              />
            );
          }

          const meta = getVerseMeta(item);

          return (
            <VerseRow
              item={item}
              isSelected={meta.isSelected}
              isHighlighted={!!meta.highlightColorId}
              isBlinking={meta.isBlinking}
              isPlaying={meta.isPlaying}
              hasNote={meta.hasNote}
              highlightColorHex={meta.highlightColorHex}
              primaryColor={primaryColor}
              readerColors={readerColors}
              fontSizeMultiplier={fontSizeMultiplier}
              textAlign={textAlign}
              shouldShowTitles={shouldShowTitles}
              shouldShowVerseNumbers={shouldShowVerseNumbers}
              ms={ms}
              DESIGN={DESIGN}
              styles={styles}
              onVersePress={onVersePress}
              onVerseLongPress={onVerseLongPress}
              splitMode={splitMode}
            />
          );
        }}
        contentContainerStyle={styles.readerContent}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={scrollEventThrottle}
      />
    </View>
  );
});
