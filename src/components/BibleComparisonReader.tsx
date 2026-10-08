import { VERSE_HIGHLIGHTS } from "@/constants/colors";
import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { ALIASES } from "../data/bible-version";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { impactLight } from "../utils/haptics";
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

type ComparisonListItem =
  | { type: "header"; title: string }
  | {
      type: "verse";
      chapter: number;
      verse: number;
      primaryVerse?: VerseItem;
      secondVerse?: VerseItem;
    }
  | {
      type: "footer";
      primaryVersionInfo: any;
      primaryCopyright: string;
      secondVersionInfo: any;
      secondCopyright: string;
    };

type BibleComparisonReaderProps = {
  primarySections: SectionType[];
  secondSections: SectionType[];
  primaryVersion: string;
  secondVersion: string;
  bookAbbrev: string;
  blinkingVerse: string | null;
  highlights: Record<string, any>;
  notes: Record<string, any>;
  selectedKeys: Record<string, boolean>;
  onVersePress: (item: VerseItem) => void;
  onPrimaryVersionPress: () => void;
  onSecondVersionPress: () => void;
  listRef?: React.RefObject<any>;
  onScroll?: (event: any) => void;
  onScrollBeginDrag?: (event: any) => void;
  onScrollEndDrag?: (event: any) => void;
  onMomentumScrollEnd?: (event: any) => void;
  scrollEventThrottle?: number;
  onViewableItemsChanged?: ({
    viewableItems,
  }: {
    viewableItems: any[];
  }) => void;
  viewabilityConfig?: any;
};

type VerseColumnProps = {
  verseItem?: VerseItem;
  verseNumber: number;
  hasNote: boolean;
  primaryColor: string;
  readerColors: any;
  fontSizeMultiplier: number;
  textAlign: string;
  shouldShowTitles: boolean;
  shouldShowVerseNumbers: boolean;
  ms: (size: number, factor?: number) => number;
  DESIGN: any;
  styles: any;
  onPress: () => void;
};

const VerseColumn = React.memo((props: VerseColumnProps) => {
  const {
    verseItem,
    verseNumber,
    hasNote,
    primaryColor,
    readerColors,
    fontSizeMultiplier,
    textAlign,
    shouldShowTitles,
    shouldShowVerseNumbers,
    ms,
    DESIGN,
    styles,
    onPress,
  } = props;

  if (!verseItem) {
    return <View style={styles.comparisonCol} />;
  }

  const textGap = shouldShowVerseNumbers ? "  " : "";

  const leadingTitles =
    shouldShowTitles && verseItem.titles
      ? verseItem.titles.filter((t: VerseTitle) => t.positionIndex === 0)
      : [];

  const midVerseTitles =
    shouldShowTitles && verseItem.titles
      ? verseItem.titles.filter((t: VerseTitle) => t.positionIndex > 0)
      : [];

  const renderMidVerseTitlesAndText = () => {
    if (midVerseTitles.length === 0) {
      return (
        <React.Fragment>
          {textGap}
          {verseItem.text}
        </React.Fragment>
      );
    }

    const elements: React.ReactNode[] = [];
    let currentTextIndex = 0;

    const sortedTitles = [...midVerseTitles].sort(
      (a, b) => a.positionIndex - b.positionIndex,
    );

    sortedTitles.forEach((t, index) => {
      const textBefore = verseItem.text.substring(
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
            fontSize: ms(DESIGN.fontSize.xl * fontSizeMultiplier),
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

    if (currentTextIndex < verseItem.text.length) {
      elements.push(
        <React.Fragment key="text-end">
          {verseItem.text.substring(currentTextIndex)}
        </React.Fragment>,
      );
    }

    return elements;
  };

  return (
    <TouchableOpacity
      style={styles.comparisonCol}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {leadingTitles.length > 0 && (
        <View style={styles.leadingTitleContainer}>
          {leadingTitles.map((t: VerseTitle, idx: number) => (
            <BibleText
              key={`lead-title-${idx}`}
              style={[
                styles.leadingTitleText,
                {
                  color: primaryColor,
                  fontSize: ms(DESIGN.fontSize.xl * fontSizeMultiplier),
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
      <BibleText
        variant="reading"
        style={[
          styles.verseText,
          {
            fontSize: ms(DESIGN.fontSize.lg * fontSizeMultiplier),
            lineHeight: ms(
              DESIGN.fontSize.lg * fontSizeMultiplier * DESIGN.lineHeight.md,
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
              fontSize: ms(DESIGN.fontSize.sm * fontSizeMultiplier),
            }}
          >
            {verseNumber}
          </BibleText>
        )}
        {renderMidVerseTitlesAndText()}
        {hasNote && (
          <BibleText style={{ color: primaryColor, opacity: 0.8 }}>
            {"\u00A0"}
            <BibleIcon
              name="edit-3"
              size={ms(DESIGN.fontSize.xs * fontSizeMultiplier)}
              color={primaryColor}
            />
          </BibleText>
        )}
      </BibleText>
    </TouchableOpacity>
  );
});

type ComparisonRowProps = {
  item: Extract<ComparisonListItem, { type: "verse" }>;
  isSelected: boolean;
  isHighlighted: boolean;
  isBlinking: boolean;
  hasNote: boolean;
  highlightColorHex: string;
  primaryColor: string;
  readerColors: any;
  fontSizeMultiplier: number;
  textAlign: string;
  shouldShowTitles: boolean;
  shouldShowVerseNumbers: boolean;
  ms: (size: number, factor?: number) => number;
  DESIGN: any;
  styles: any;
  onVersePress: (item: VerseItem) => void;
};

const ComparisonRow = React.memo((props: ComparisonRowProps) => {
  const {
    item,
    isSelected,
    isHighlighted,
    isBlinking,
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
  } = props;

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
        : isSelected
          ? primaryLow
          : "transparent",
      primaryLow,
    ],
  });

  const handlePress = () => {
    impactLight();
    if (item.primaryVerse) {
      onVersePress(item.primaryVerse);
    } else if (item.secondVerse) {
      onVersePress(item.secondVerse);
    }
  };

  return (
    <Animated.View
      style={[
        styles.comparisonRow,
        { backgroundColor: animatedBackgroundColor },
        isSelected && { borderLeftColor: primaryColor },
      ]}
    >
      <VerseColumn
        verseItem={item.primaryVerse}
        verseNumber={item.verse}
        hasNote={hasNote}
        primaryColor={primaryColor}
        readerColors={readerColors}
        fontSizeMultiplier={fontSizeMultiplier}
        textAlign={textAlign}
        shouldShowTitles={shouldShowTitles}
        shouldShowVerseNumbers={shouldShowVerseNumbers}
        ms={ms}
        DESIGN={DESIGN}
        styles={styles}
        onPress={handlePress}
      />
      <View style={styles.comparisonDivider} />
      <VerseColumn
        verseItem={item.secondVerse}
        verseNumber={item.verse}
        hasNote={hasNote}
        primaryColor={primaryColor}
        readerColors={readerColors}
        fontSizeMultiplier={fontSizeMultiplier}
        textAlign={textAlign}
        shouldShowTitles={shouldShowTitles}
        shouldShowVerseNumbers={shouldShowVerseNumbers}
        ms={ms}
        DESIGN={DESIGN}
        styles={styles}
        onPress={handlePress}
      />
    </Animated.View>
  );
});

export const BibleComparisonReader = React.memo(
  (props: BibleComparisonReaderProps) => {
    const {
      primarySections,
      secondSections,
      primaryVersion,
      secondVersion,
      bookAbbrev,
      blinkingVerse,
      highlights,
      notes,
      selectedKeys,
      onVersePress,
      onPrimaryVersionPress,
      onSecondVersionPress,
      listRef,
      onScroll,
      onScrollBeginDrag,
      onScrollEndDrag,
      onMomentumScrollEnd,
      scrollEventThrottle,
      onViewableItemsChanged,
      viewabilityConfig,
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

    const primaryColor =
      readerTheme === "sepia" ? readerColors.primary : colors.primary;

    const styles = useMemo(
      () =>
        StyleSheet.create({
          container: {
            flex: 1,
            position: "relative",
          },
          versionBadge: {
            position: "absolute",
            top: ms(DESIGN.spacing.sm),
            zIndex: 10,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: ms(DESIGN.borderRadius.md),
            paddingHorizontal: ms(DESIGN.spacing.md),
            paddingVertical: ms(DESIGN.spacing.sm),
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            shadowColor: colors.shadow,
            shadowOffset: {
              width: 0,
              height: ms(DESIGN.spacing.tiny),
            },
            shadowOpacity: 0.15,
            shadowRadius: ms(DESIGN.spacing.xs),
            elevation: 3,
          },
          leftVersionBadge: {
            left: ms(DESIGN.spacing.sm),
          },
          rightVersionBadge: {
            left: "50%",
            marginLeft: ms(DESIGN.spacing.sm),
          },
          versionBadgeText: {
            fontSize: ms(DESIGN.fontSize.lg),
            fontWeight: "800",
            letterSpacing: 1,
          },
          comparisonHeaderRow: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: ms(DESIGN.spacing.xl),
            marginBottom: ms(DESIGN.spacing.sm),
          },
          comparisonHeaderCol: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: ms(DESIGN.spacing.lg),
          },
          chapterHeaderText: {
            fontWeight: "800",
            letterSpacing: 0.5,
          },
          comparisonRow: {
            flexDirection: "row",
            alignItems: "stretch",
            paddingVertical: ms(DESIGN.spacing.xs),
            borderLeftWidth: ms(DESIGN.spacing.xs),
            borderLeftColor: "transparent",
          },
          comparisonCol: {
            flex: 1,
            paddingHorizontal: ms(DESIGN.spacing.sm),
            paddingVertical: ms(DESIGN.spacing.xs),
          },
          comparisonDivider: {
            width: 1,
            backgroundColor: colors.border,
            opacity: 0.4,
          },
          leadingTitleContainer: {
            paddingBottom: ms(DESIGN.spacing.xs),
          },
          leadingTitleText: {
            fontWeight: "700",
            letterSpacing: 0.3,
          },
          verseText: {
            flexWrap: "wrap",
            textAlignVertical: "top",
          },
          readerContent: {
            paddingBottom: ms(DESIGN.layout.listPaddingBottom),
          },
          copyrightContainer: {
            flexDirection: "row",
            paddingHorizontal: ms(DESIGN.spacing.sm),
            marginTop: ms(DESIGN.spacing.xl),
            marginBottom: ms(DESIGN.spacing.lg),
          },
          copyrightCard: {
            flex: 1,
            marginHorizontal: ms(DESIGN.spacing.xs),
            padding: ms(DESIGN.spacing.md),
            borderRadius: ms(DESIGN.borderRadius.md),
            borderLeftWidth: ms(DESIGN.spacing.xs),
          },
          emptyCopyrightCard: {
            flex: 1,
            marginHorizontal: ms(DESIGN.spacing.xs),
          },
          copyrightTitle: {
            fontSize: ms(DESIGN.fontSize.sm),
            fontWeight: "700",
            marginBottom: ms(DESIGN.spacing.xs),
            letterSpacing: 0.3,
          },
          copyrightText: {
            fontSize: ms(DESIGN.fontSize.xs),
            lineHeight: ms(DESIGN.fontSize.md),
            opacity: 0.75,
          },
        }),
      [ms, colors, readerColors, DESIGN],
    );

    const getHighlightColorValue = (colorId?: string) => {
      const h = VERSE_HIGHLIGHTS.find((v) => v.id === colorId);
      return h ? `${h.hex}4D` : colors.surfaceHighlight;
    };

    const flatData = useMemo(() => {
      const data: ComparisonListItem[] = [];
      const primaryData = primarySections[0]?.data || [];
      const secondData = secondSections[0]?.data || [];
      const headerTitle =
        primarySections[0]?.title || secondSections[0]?.title || "";

      if (headerTitle) {
        data.push({ type: "header", title: headerTitle });
      }

      const maxVerses = Math.max(primaryData.length, secondData.length);
      const chapter = primaryData[0]?.chapter || secondData[0]?.chapter || 1;

      for (let v = 1; v <= maxVerses; v++) {
        const primaryVerse = primaryData.find((item) => item.verse === v);
        const secondVerse = secondData.find((item) => item.verse === v);

        data.push({
          type: "verse",
          chapter,
          verse: v,
          primaryVerse,
          secondVerse,
        });
      }

      const primaryVersionInfo = ALIASES.find(
        (item) => item.sigla === primaryVersion,
      );
      const primaryCopyright = (primaryVersionInfo as any)?.copyright || "";

      const secondVersionInfo = ALIASES.find(
        (item) => item.sigla === secondVersion,
      );
      const secondCopyright = (secondVersionInfo as any)?.copyright || "";

      if (primaryCopyright || secondCopyright) {
        data.push({
          type: "footer",
          primaryVersionInfo,
          primaryCopyright,
          secondVersionInfo,
          secondCopyright,
        });
      }

      return data;
    }, [primarySections, secondSections, primaryVersion, secondVersion]);

    useImperativeHandle(
      listRef,
      () => ({
        scrollToVerse: (targetVerse: number) => {
          const index = flatData.findIndex(
            (item) => item.type === "verse" && item.verse === targetVerse,
          );
          if (index !== -1 && flashListRef.current) {
            flashListRef.current.scrollToIndex({
              index,
              animated: false,
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

    const getVerseMeta = (verseNumber: number, chapterNumber: number) => {
      const isBlinking = blinkingVerse === `${chapterNumber}-${verseNumber}`;
      const hasNote = !!notes[`${bookAbbrev}-${chapterNumber}-${verseNumber}`];
      const highlight =
        highlights[`${bookAbbrev}-${chapterNumber}-${verseNumber}`];
      const highlightColorId = highlight
        ? typeof highlight === "string"
          ? highlight
          : highlight.color
        : undefined;
      const isSelected =
        selectedKeys[`${bookAbbrev}-${chapterNumber}-${verseNumber}`];
      const highlightColorHex = getHighlightColorValue(highlightColorId);
      return {
        isBlinking,
        hasNote,
        highlightColorId,
        isSelected,
        highlightColorHex,
      };
    };

    return (
      <View
        style={[styles.container, { backgroundColor: readerColors.background }]}
        testID="bible-comparison-reader"
      >
        <TouchableOpacity
          style={[styles.versionBadge, styles.leftVersionBadge]}
          onPress={onPrimaryVersionPress}
          activeOpacity={0.8}
        >
          <BibleText style={[styles.versionBadgeText, { color: primaryColor }]}>
            {primaryVersion.toUpperCase()}
          </BibleText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.versionBadge, styles.rightVersionBadge]}
          onPress={onSecondVersionPress}
          activeOpacity={0.8}
        >
          <BibleText style={[styles.versionBadgeText, { color: primaryColor }]}>
            {secondVersion.toUpperCase()}
          </BibleText>
        </TouchableOpacity>

        <FlashList
          ref={flashListRef}
          data={flatData}
          getItemType={(item) => item.type}
          keyExtractor={(item, idx) => {
            if (item.type === "header") return `header-${item.title}`;
            if (item.type === "footer") return `footer-${idx}`;
            return `comp-${primaryVersion}-${secondVersion}-${item.chapter}-${item.verse}`;
          }}
          renderItem={({ item }) => {
            if (item.type === "header") {
              return (
                <View
                  style={[
                    styles.comparisonHeaderRow,
                    { backgroundColor: readerColors.background },
                  ]}
                >
                  <View style={styles.comparisonHeaderCol}>
                    <BibleText
                      style={[
                        styles.chapterHeaderText,
                        {
                          fontSize: ms(
                            DESIGN.fontSize.display *
                              0.875 *
                              fontSizeMultiplier,
                          ),
                          color: primaryColor,
                        },
                      ]}
                    >
                      {item.title}
                    </BibleText>
                  </View>
                  <View style={styles.comparisonDivider} />
                  <View style={styles.comparisonHeaderCol}>
                    <BibleText
                      style={[
                        styles.chapterHeaderText,
                        {
                          fontSize: ms(
                            DESIGN.fontSize.display *
                              0.875 *
                              fontSizeMultiplier,
                          ),
                          color: primaryColor,
                        },
                      ]}
                    >
                      {item.title}
                    </BibleText>
                  </View>
                </View>
              );
            }

            if (item.type === "footer") {
              const primaryLow = primaryColor + "1A";
              return (
                <View style={styles.copyrightContainer}>
                  {item.primaryCopyright ? (
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
                        {item.primaryVersionInfo?.name} (
                        {item.primaryVersionInfo?.sigla}
                        {item.primaryVersionInfo?.year
                          ? ` - ${item.primaryVersionInfo.year}`
                          : ""}
                        )
                      </BibleText>
                      <BibleText
                        style={[
                          styles.copyrightText,
                          { color: readerColors.onBackground, opacity: 0.6 },
                        ]}
                      >
                        {item.primaryCopyright}
                      </BibleText>
                    </View>
                  ) : (
                    <View style={styles.emptyCopyrightCard} />
                  )}

                  {item.secondCopyright ? (
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
                        {item.secondVersionInfo?.name} (
                        {item.secondVersionInfo?.sigla}
                        {item.secondVersionInfo?.year
                          ? ` - ${item.secondVersionInfo.year}`
                          : ""}
                        )
                      </BibleText>
                      <BibleText
                        style={[
                          styles.copyrightText,
                          { color: readerColors.onBackground, opacity: 0.6 },
                        ]}
                      >
                        {item.secondCopyright}
                      </BibleText>
                    </View>
                  ) : (
                    <View style={styles.emptyCopyrightCard} />
                  )}
                </View>
              );
            }

            const meta = getVerseMeta(item.verse, item.chapter);

            return (
              <ComparisonRow
                item={item}
                isSelected={meta.isSelected}
                isHighlighted={!!meta.highlightColorId}
                isBlinking={meta.isBlinking}
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
  },
);
