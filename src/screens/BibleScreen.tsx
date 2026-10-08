import { AudioSettingsModal } from "@/components/modals/AudioSettingsModal";
import { BibleVerseActionSheet } from "@/components/modals/BibleVerseActionSheet";
import { ReaderSettingsModal } from "@/components/modals/ReaderSettingsModal";
import { Book, SelectedVerse } from "@/models";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  BackHandler,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { BibleComparisonReader } from "../components/BibleComparisonReader";
import { BibleDivider } from "../components/BibleDivider";
import { BibleDrawerMenu } from "../components/BibleDrawerMenu";
import { BibleIcon } from "../components/BibleIcon";
import { BibleSkeleton } from "../components/BibleSkeleton";
import { BibleText } from "../components/BibleText";
import { BibleToast } from "../components/BibleToast";
import { BibleLocationBar } from "../components/BibleLocationBar";
import { BibleTopBar } from "../components/BibleTopBar";
import { BibleVerseReader } from "../components/BibleVerseReader";
import {
  BibleAudioModal,
  BibleAudioModalHandle,
} from "../components/modals/BibleAudioModal";
import { BibleConfirmModal } from "../components/modals/BibleConfirmModal";
import { BibleHistoryModal } from "../components/modals/BibleHistoryModal";
import { DonateModal } from "../components/modals/DonateModal";
import { getBibleTitles } from "../data/bible-titles";
import { getBibleData } from "../data/bible-version";
import { useAudioSettings } from "../hooks/useAudioSettings";
import { useBible } from "../hooks/useBible";
import { useBibleModals } from "../hooks/useBibleModals";
import { useNotes } from "../hooks/useNotes";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";

const AUDIO_VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 100 };

export default function BibleScreen() {
  const {
    version,
    setVersion,
    book,
    chapter,
    verse,
    currentBook,
    sectionData,
    blinkingVerse,
    setBlinkingVerse,
    highlights,
    bulkToggleHighlight,
    navigateTo,
    changeChapter,
    hasPrevChapter,
    hasNextChapter,
    isReady,
    isSplitScreen,
    setIsSplitScreen,
    secondVersion,
    setSecondVersion,
    splitOrientation,
    setSplitOrientation,
  } = useBible();

  const { notesMap } = useNotes();

  const router = useRouter();

  const { ms, DESIGN } = useResponsive();
  const { toast, opacity, show } = useToast();
  const { colors } = useTheme();
  const { readerTheme, readerColors } = useReaderSettings();
  const primaryColor =
    readerTheme === "sepia" ? readerColors.primary : colors.primary;

  const [isExitConfirmVisible, setIsExitConfirmVisible] = useState(false);

  const secondSectionListRef = useRef<any>(null);

  const secondVersionBooks = useMemo(
    () => getBibleData(secondVersion),
    [secondVersion],
  );

  const secondCurrentBook = useMemo(() => {
    return (
      secondVersionBooks.find(
        (item: Book) => item.name === book || item.abbrev === book,
      ) ||
      secondVersionBooks[0] || {
        name: book,
        abbrev: book,
        chapters: [["Nenhum versículo disponível"]],
      }
    );
  }, [secondVersionBooks, book]);

  const secondSectionData = useMemo(() => {
    const verses = secondCurrentBook.chapters[chapter - 1] || [];
    const versionTitles = getBibleTitles(secondVersion);
    const bookTitles = versionTitles?.books.find(
      (b: any) =>
        b.abbrev.toLowerCase() === secondCurrentBook.abbrev.toLowerCase(),
    );
    const chapterTitles =
      bookTitles?.chapters.find((c: any) => c.number === chapter)?.titles || [];

    return [
      {
        title: `${secondCurrentBook.name} ${chapter}`,
        data: verses.map((text: string, i: number) => {
          const verseNum = i + 1;
          const titlesForVerse = chapterTitles.filter(
            (t: any) => t.startVerse === verseNum,
          );

          return {
            bookAbbrev: secondCurrentBook.abbrev,
            chapter,
            verse: verseNum,
            text,
            titles: titlesForVerse,
          };
        }),
      },
    ];
  }, [secondCurrentBook, chapter, secondVersion]);

  const [isControlGroupExpanded, setIsControlGroupExpanded] = useState(false);
  const controlGroupAnim = useRef(new Animated.Value(0)).current;

  const isScrollingTop = useRef(false);
  const isScrollingBottom = useRef(false);
  const lastScrollY = useRef(0);
  const navVisibleAnim = useRef(new Animated.Value(1)).current;
  const navVisibleRef = useRef(true);
  const [isNavInteractive, setIsNavInteractive] = useState(true);

  const setNavVisible = useCallback(
    (visible: boolean) => {
      if (navVisibleRef.current === visible) return;
      navVisibleRef.current = visible;
      setIsNavInteractive(visible);
      Animated.timing(navVisibleAnim, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    },
    [navVisibleAnim],
  );

  const hasTrackedScroll = useRef(false);

  useEffect(() => {
    hasTrackedScroll.current = false;
    lastScrollY.current = 0;
    setNavVisible(true);
  }, [chapter, book, version, setNavVisible]);

  const isAtScrollEnd = useCallback(
    (nativeEvent: any) => {
      const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
      if (!layoutMeasurement?.height || !contentSize?.height) return false;
      const threshold = ms(DESIGN.spacing.xl);
      const notScrollable =
        contentSize.height <= layoutMeasurement.height + threshold;
      return (
        notScrollable ||
        contentOffset.y + layoutMeasurement.height >=
          contentSize.height - threshold
      );
    },
    [ms, DESIGN],
  );

  const updateNavVisibility = useCallback(
    (nativeEvent: any) => {
      const offsetY = nativeEvent.contentOffset.y;
      const atEnd = isAtScrollEnd(nativeEvent);

      if (!hasTrackedScroll.current) {
        hasTrackedScroll.current = true;
        lastScrollY.current = offsetY;
        if (atEnd) setNavVisible(true);
        return;
      }

      const diff = offsetY - lastScrollY.current;
      if (offsetY <= 8 || atEnd) {
        setNavVisible(true);
      } else if (diff > 4) {
        setNavVisible(false);
      } else if (diff < -4) {
        setNavVisible(true);
      }
      lastScrollY.current = offsetY;
    },
    [setNavVisible, isAtScrollEnd],
  );

  const handleReaderScroll = useCallback(
    (event: any) => {
      updateNavVisibility(event.nativeEvent);
    },
    [updateNavVisibility],
  );

  const handleFirstScroll = useCallback(
    (event: any) => {
      if (!isScrollingBottom.current) {
        updateNavVisibility(event.nativeEvent);
      }
      if (isScrollingBottom.current) return;
      isScrollingTop.current = true;
      if (secondSectionListRef.current) {
        const offsetY = event.nativeEvent.contentOffset.y;
        secondSectionListRef.current.scrollToOffset({
          offset: offsetY,
          animated: false,
        });
      }
      setTimeout(() => {
        isScrollingTop.current = false;
      }, 50);
    },
    [updateNavVisibility],
  );

  const handleSecondScroll = useCallback(
    (event: any) => {
      if (!isScrollingTop.current) {
        updateNavVisibility(event.nativeEvent);
      }
      if (isScrollingTop.current) return;
      isScrollingBottom.current = true;
      if (sectionListRef.current) {
        const offsetY = event.nativeEvent.contentOffset.y;
        sectionListRef.current.scrollToOffset({
          offset: offsetY,
          animated: false,
        });
      }
      setTimeout(() => {
        isScrollingBottom.current = false;
      }, 50);
    },
    [updateNavVisibility],
  );

  const handleToggleControlGroup = useCallback(() => {
    setIsControlGroupExpanded((prev) => {
      const next = !prev;
      Animated.spring(controlGroupAnim, {
        toValue: next ? 1 : 0,
        useNativeDriver: false,
        friction: 8,
        tension: 100,
      }).start();
      return next;
    });
  }, [controlGroupAnim]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: { flex: 1 },
        floatingNav: {
          position: "absolute",
          bottom: ms(DESIGN.spacing.xl),
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "space-between",
          paddingHorizontal: ms(DESIGN.spacing.lg),
          pointerEvents: "box-none",
        },
        miniHeaderHorizontal: {
          height: ms(DESIGN.spacing.xxxl),
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: ms(DESIGN.spacing.md),
          zIndex: 20,
        },
        versionBadge: {
          position: "absolute",
          top: ms(DESIGN.spacing.sm),
          left: ms(DESIGN.spacing.sm),
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
          shadowOffset: { width: 0, height: ms(DESIGN.spacing.tiny) },
          shadowOpacity: 0.15,
          shadowRadius: ms(DESIGN.spacing.xs),
          elevation: 3,
        },
        versionBadgeText: {
          fontSize: ms(DESIGN.fontSize.lg),
          fontWeight: "800",
          letterSpacing: 1,
        },
        actionRow: {
          flexDirection: "row",
          alignItems: "center",
        },
        actionColumn: {
          flexDirection: "column",
          alignItems: "center",
        },
        splitHandleBtn: {
          width: ms(DESIGN.height.sm),
          height: ms(DESIGN.height.sm),
          borderRadius: ms(DESIGN.borderRadius.sm),
          alignItems: "center",
          justifyContent: "center",
        },
        floatingControlGroup: {
          position: "absolute",
          left: "50%",
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: ms(DESIGN.spacing.tiny) },
          shadowOpacity: 0.15,
          shadowRadius: ms(DESIGN.spacing.xs),
          elevation: 3,
          zIndex: 30,
          overflow: "hidden",
        },
        comparisonContainer: {
          flex: 1,
          position: "relative",
        },
        splitScreenContainerVertical: {
          flex: 1,
          flexDirection: "column",
          position: "relative",
        },
        splitScreenContainerHorizontal: {
          flex: 1,
          flexDirection: "row",
          position: "relative",
        },
        splitPane: { flex: 1, position: "relative" },
        splitPaneTop: { flex: 9, position: "relative" },
        splitPaneBottom: { flex: 11, position: "relative" },
        mainContainer: { flex: 1 },
      }),
    [ms, colors, DESIGN],
  );

  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<SelectedVerse[]>([]);

  useEffect(() => {
    setIsActionSheetVisible(false);
    setSelectedVerses([]);
  }, [chapter, book, version]);

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [isDonateVisible, setIsDonateVisible] = useState(false);
  const [isAudioModalVisible, setIsAudioModalVisible] = useState(false);
  const [isAudioSettingsVisible, setIsAudioSettingsVisible] = useState(false);
  const [playingVerse, setPlayingVerse] = useState<number | null>(null);
  const audioModalRef = useRef<BibleAudioModalHandle>(null);
  const { selectedVoice, autoScroll } = useAudioSettings();
  const playingVerseKey =
    playingVerse !== null ? `${chapter}-${playingVerse}` : null;

  const navBg = readerTheme === "sepia" ? readerColors.primary : colors.primary;
  const navBtnSize = ms(DESIGN.spacing.xxl);
  const navIconSize = ms(DESIGN.fontSize.xxl);
  const navIcon =
    readerTheme === "sepia" ? readerColors.onPrimary : colors.onPrimary;

  const sectionListRef = useRef<any>(null);
  const isAutoScrolling = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasInitialScrolled = useRef(false);
  const topVisibleVerseRef = useRef(verse);

  useEffect(() => {
    topVisibleVerseRef.current = verse;
  }, [verse]);

  const viewabilityConfig = AUDIO_VIEWABILITY_CONFIG;

  const visibleVersesRef = useRef<Set<number>>(new Set());

  const handleFirstViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: any[] }) => {
      const verseItem = viewableItems.find(
        (v) =>
          v.isViewable &&
          (v.item?.type === "verse" || v.item?.type === "paragraph"),
      );
      if (verseItem) topVisibleVerseRef.current = verseItem.item.verse;

      const visible = new Set<number>();
      for (const v of viewableItems) {
        if (!v.isViewable) continue;
        if (v.item?.type === "verse") {
          visible.add(v.item.verse);
        } else if (v.item?.type === "paragraph") {
          v.item.verses.forEach((pv: any) => visible.add(pv.verse));
        }
      }
      visibleVersesRef.current = visible;
    },
    [],
  );

  const scrollToVerse = useCallback(
    (targetVerse: number, targetChapter: number, animated = false) => {
      isAutoScrolling.current = true;

      if (sectionListRef.current) {
        if (typeof sectionListRef.current.scrollToVerse === "function") {
          sectionListRef.current.scrollToVerse(targetVerse, { animated });
        } else {
          sectionListRef.current?.scrollToIndex({
            index: targetVerse,
            animated,
            viewPosition: 0.05,
            viewOffset: 0,
          });
        }
      }

      if (
        isSplitScreen &&
        splitOrientation === "vertical" &&
        secondSectionListRef.current
      ) {
        if (typeof secondSectionListRef.current.scrollToVerse === "function") {
          secondSectionListRef.current.scrollToVerse(targetVerse, {
            animated,
          });
        } else {
          secondSectionListRef.current?.scrollToIndex({
            index: targetVerse,
            animated,
            viewPosition: 0.05,
            viewOffset: 0,
          });
        }
      }

      setBlinkingVerse(`${targetChapter}-${targetVerse}`);
      setTimeout(() => setBlinkingVerse(null), 1000);
      setTimeout(
        () => {
          isAutoScrolling.current = false;
        },
        animated ? 700 : 500,
      );
    },
    [setBlinkingVerse, isSplitScreen, splitOrientation],
  );

  const positionStack = useRef<
    { version: string; book: string; chapter: number; verse: number }[]
  >([]);

  const jumpTo = useCallback(
    (next: {
      version: string;
      book: string;
      chapter: number;
      verse: number;
    }) => {
      positionStack.current.push({
        version,
        book,
        chapter,
        verse: topVisibleVerseRef.current,
      });
      navigateTo(next);
      setTimeout(() => scrollToVerse(next.verse, next.chapter), 300);
    },
    [version, book, chapter, navigateTo, scrollToVerse],
  );

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        const previous = positionStack.current.pop();
        if (previous) {
          setIsActionSheetVisible(false);
          setSelectedVerses([]);
          navigateTo(previous);
          setTimeout(
            () => scrollToVerse(previous.verse, previous.chapter),
            300,
          );
          return true;
        }
        if (!router.canGoBack()) {
          setIsExitConfirmVisible(true);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => subscription.remove();
    }, [router, navigateTo, scrollToVerse]),
  );

  useEffect(() => {
    if (!autoScroll) return;
    if (playingVerse === null) return;
    if (visibleVersesRef.current.has(playingVerse)) return;
    scrollToVerse(playingVerse, chapter, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playingVerse, autoScroll]);

  const handleToggleOrientation = useCallback(() => {
    setSplitOrientation((prev) =>
      prev === "vertical" ? "horizontal" : "vertical",
    );
    setIsControlGroupExpanded(false);
    controlGroupAnim.setValue(0);
  }, [controlGroupAnim, setSplitOrientation]);

  const handleSwapVersions = useCallback(() => {
    const tempMain = version;
    setVersion(secondVersion);
    setSecondVersion(tempMain);
  }, [version, secondVersion, setVersion, setSecondVersion]);

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();

      if (!hasInitialScrolled.current) {
        hasInitialScrolled.current = true;
        setTimeout(() => scrollToVerse(verse, chapter), 500);
      }
    }
  }, [isReady, verse, chapter, scrollToVerse, fadeAnim]);

  const handleNavigateChapter = useCallback(
    (delta: number) => {
      setIsActionSheetVisible(false);
      setSelectedVerses([]);
      changeChapter(delta, (newCh) => {
        setTimeout(() => scrollToVerse(1, newCh), 300);
      });
    },
    [changeChapter, scrollToVerse],
  );

  const selectVerseForActions = (item: any) => {
    const verseText =
      sectionData[0]?.data.find((v: any) => v.verse === item.verse)?.text || "";

    let compareText;
    if (isSplitScreen && secondSectionData && secondSectionData[0]) {
      compareText = secondSectionData[0].data.find(
        (v: any) => v.verse === item.verse,
      )?.text;
    }

    const selected: SelectedVerse = {
      chapter: item.chapter,
      verse: item.verse,
      text: verseText,
      bookName: currentBook.name,
      bookAbbrev: currentBook.abbrev,
      version,
      ...(compareText ? { compareText, compareVersion: secondVersion } : {}),
    };
    const key = `${selected.bookAbbrev}-${selected.chapter}-${selected.verse}`;
    setSelectedVerses((prev) => {
      const exists = prev.some(
        (v) => `${v.bookAbbrev}-${v.chapter}-${v.verse}` === key,
      );
      const next = exists
        ? prev.filter((v) => `${v.bookAbbrev}-${v.chapter}-${v.verse}` !== key)
        : [...prev, selected];
      setIsActionSheetVisible(next.length > 0);
      return next;
    });
  };

  const selectVerseForActionsRef = useRef(selectVerseForActions);
  selectVerseForActionsRef.current = selectVerseForActions;

  const isAudioModalVisibleRef = useRef(isAudioModalVisible);
  isAudioModalVisibleRef.current = isAudioModalVisible;

  const onVersePress = useCallback((item: any) => {
    if (isAudioModalVisibleRef.current) {
      audioModalRef.current?.seekToVerse(item.verse);
      return;
    }

    selectVerseForActionsRef.current(item);
  }, []);

  const onVerseLongPress = useCallback((item: any) => {
    if (!isAudioModalVisibleRef.current) return;

    selectVerseForActionsRef.current(item);
  }, []);

  const onActionSheetClose = () => {
    setIsActionSheetVisible(false);
    setSelectedVerses([]);
  };

  const { openModal } = useBibleModals();

  const renderVersionBadge = (label: string, onPress: () => void) => (
    <TouchableOpacity
      style={styles.versionBadge}
      onPress={() => {
        setIsActionSheetVisible(false);
        setSelectedVerses([]);
        onPress();
      }}
      activeOpacity={0.8}
    >
      <BibleText style={[styles.versionBadgeText, { color: primaryColor }]}>
        {label.toUpperCase()}
      </BibleText>
    </TouchableOpacity>
  );

  return (
    <View
      style={[styles.mainContainer, { backgroundColor: colors.background }]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            zIndex: 1,
            opacity: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
            pointerEvents: isReady ? "none" : "auto",
          },
        ]}
      >
        <BibleSkeleton />
      </Animated.View>

      <BibleTopBar
        onPrevChapter={() => handleNavigateChapter(-1)}
        onNextChapter={() => handleNavigateChapter(1)}
        onOpenMenu={() => setIsDrawerVisible(true)}
        onOpenSettings={() => setIsSettingsModalVisible(true)}
        onOpenSearch={() => router.push("/search?from=bible")}
        onOpenHistory={() => setIsHistoryModalVisible(true)}
        isSplitScreen={isSplitScreen}
        onToggleCompare={() => {
          if (isSplitScreen) {
            setIsSplitScreen(false);
          } else {
            setIsActionSheetVisible(false);
            setSelectedVerses([]);
            openModal({
              initialStep: "version",
              target: "study",
              onSelect: (s) => {
                if (s.version) {
                  setSecondVersion(s.version);
                  setIsSplitScreen(true);
                }
              },
            });
          }
        }}
      />

      <BibleLocationBar
        version={version}
        isVersionVisible={!isSplitScreen}
        bookName={currentBook.name}
        chapter={chapter}
        onOpenVersion={() => {
          setIsActionSheetVisible(false);
          setSelectedVerses([]);
          openModal({ initialStep: "version" });
        }}
        onOpenBook={() => {
          setIsActionSheetVisible(false);
          setSelectedVerses([]);
          openModal({
            initialStep: "book",
            onSelect: (s) => {
              jumpTo({
                version: s.version || version,
                book: s.book?.abbrev || book,
                chapter: s.chapter || chapter,
                verse: s.verse || verse,
              });
            },
          });
        }}
        onOpenChapter={() => {
          setIsActionSheetVisible(false);
          setSelectedVerses([]);
          openModal({
            initialStep: "chapter",
            onSelect: (s) => {
              jumpTo({
                version: s.version || version,
                book,
                chapter: s.chapter || chapter,
                verse: s.verse || 1,
              });
            },
          });
        }}
        onOpenAudio={() => setIsAudioModalVisible(true)}
      />

      <BibleHistoryModal
        visible={isHistoryModalVisible}
        onClose={() => setIsHistoryModalVisible(false)}
        onSelect={(item) => {
          setIsActionSheetVisible(false);
          setSelectedVerses([]);
          jumpTo({
            version: item.version,
            book: item.bookAbbrev,
            chapter: item.chapter,
            verse: item.verse,
          });
        }}
      />

      <Animated.View style={[styles.mainContainer, { opacity: fadeAnim }]}>
        <View style={styles.content}>
          {isSplitScreen ? (
            splitOrientation === "horizontal" ? (
              <View style={styles.comparisonContainer}>
                <BibleComparisonReader
                  listRef={sectionListRef}
                  primarySections={sectionData}
                  secondSections={secondSectionData}
                  primaryVersion={version}
                  secondVersion={secondVersion}
                  bookAbbrev={currentBook.abbrev}
                  blinkingVerse={blinkingVerse}
                  highlights={highlights}
                  notes={notesMap}
                  selectedKeys={selectedVerses.reduce(
                    (acc, v) => {
                      acc[`${v.bookAbbrev}-${v.chapter}-${v.verse}`] = true;
                      return acc;
                    },
                    {} as Record<string, boolean>,
                  )}
                  onVersePress={onVersePress}
                  onPrimaryVersionPress={() =>
                    openModal({
                      initialStep: "version",
                      initialVersion: version,
                      onSelect: (s) => {
                        if (s.version) {
                          navigateTo({ version: s.version });
                        }
                      },
                    })
                  }
                  onSecondVersionPress={() =>
                    openModal({
                      initialStep: "version",
                      target: "study",
                      initialVersion: secondVersion,
                      onSelect: (s) => {
                        if (s.version) {
                          setSecondVersion(s.version);
                        }
                      },
                    })
                  }
                  onScroll={handleReaderScroll}
                  onViewableItemsChanged={handleFirstViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  scrollEventThrottle={16}
                />

                <Animated.View
                  style={[
                    styles.floatingControlGroup,
                    {
                      top: "50%",
                      width: controlGroupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          ms(DESIGN.spacing.xxl),
                          ms(DESIGN.height.sm + DESIGN.spacing.sm),
                        ],
                      }),
                      height: controlGroupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          ms(DESIGN.spacing.xxl),
                          ms(DESIGN.height.sm * 4 + DESIGN.spacing.sm * 4),
                        ],
                      }),
                      transform: [
                        {
                          translateX: controlGroupAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                              -ms(DESIGN.spacing.xxl) / 2,
                              -ms(DESIGN.height.sm + DESIGN.spacing.sm) / 2,
                            ],
                          }),
                        },
                        {
                          translateY: controlGroupAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                              -ms(DESIGN.spacing.xxl) / 2,
                              -ms(
                                DESIGN.height.sm * 4 + DESIGN.spacing.sm * 4,
                              ) / 2,
                            ],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {isControlGroupExpanded ? (
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.splitHandleBtn,
                          { backgroundColor: primaryColor + "1F" },
                        ]}
                        onPress={handleToggleOrientation}
                        hitSlop={{
                          top: DESIGN.spacing.sm,
                          bottom: DESIGN.spacing.sm,
                          left: DESIGN.spacing.sm,
                          right: DESIGN.spacing.sm,
                        }}
                      >
                        <MaterialIcons
                          name="horizontal-split"
                          color={primaryColor}
                          size={ms(DESIGN.icon.xs)}
                        />
                      </TouchableOpacity>

                      <View style={{ height: ms(DESIGN.spacing.sm) }} />

                      <TouchableOpacity
                        style={[
                          styles.splitHandleBtn,
                          { backgroundColor: primaryColor + "1F" },
                        ]}
                        onPress={handleSwapVersions}
                        hitSlop={{
                          top: DESIGN.spacing.sm,
                          bottom: DESIGN.spacing.sm,
                          left: DESIGN.spacing.sm,
                          right: DESIGN.spacing.sm,
                        }}
                      >
                        <MaterialIcons
                          name="swap-horiz"
                          color={primaryColor}
                          size={ms(DESIGN.icon.xs)}
                        />
                      </TouchableOpacity>

                      <View style={{ height: ms(DESIGN.spacing.sm) }} />

                      <TouchableOpacity
                        style={[
                          styles.splitHandleBtn,
                          {
                            backgroundColor: (colors.error || "#FF4D4D") + "1F",
                          },
                        ]}
                        onPress={() => setIsSplitScreen(false)}
                        hitSlop={{
                          top: DESIGN.spacing.sm,
                          bottom: DESIGN.spacing.sm,
                          left: DESIGN.spacing.sm,
                          right: DESIGN.spacing.sm,
                        }}
                      >
                        <BibleIcon
                          name="x"
                          color={colors.error || "#FF4D4D"}
                          size={ms(DESIGN.icon.xs)}
                        />
                      </TouchableOpacity>

                      <View style={{ height: ms(DESIGN.spacing.sm) }} />

                      <TouchableOpacity
                        style={[
                          styles.splitHandleBtn,
                          { backgroundColor: colors.border + "40" },
                        ]}
                        onPress={handleToggleControlGroup}
                        hitSlop={{
                          top: DESIGN.spacing.sm,
                          bottom: DESIGN.spacing.sm,
                          left: DESIGN.spacing.sm,
                          right: DESIGN.spacing.sm,
                        }}
                      >
                        <BibleIcon
                          name="chevron-up"
                          color={colors.textMuted}
                          size={ms(DESIGN.icon.xs)}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleToggleControlGroup}
                      style={{
                        flex: 1,
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: primaryColor,
                        borderRadius: ms(DESIGN.borderRadius.md),
                      }}
                      activeOpacity={0.7}
                    >
                      <BibleIcon
                        name="more-vertical"
                        color={colors.onPrimary}
                        size={ms(DESIGN.icon.xs)}
                      />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              </View>
            ) : (
              <View style={styles.splitScreenContainerVertical}>
                <View style={styles.splitPaneTop}>
                  {renderVersionBadge(version, () =>
                    openModal({
                      initialStep: "version",
                      initialVersion: version,
                      onSelect: (s) => {
                        if (s.version) {
                          navigateTo({ version: s.version });
                        }
                      },
                    }),
                  )}
                  <BibleVerseReader
                    listRef={sectionListRef}
                    sections={sectionData}
                    blinkingVerse={blinkingVerse}
                    playingVerseKey={playingVerseKey}
                    highlights={highlights}
                    notes={notesMap}
                    version={version}
                    selectedKeys={selectedVerses.reduce(
                      (acc, v) => {
                        acc[`${v.bookAbbrev}-${v.chapter}-${v.verse}`] = true;
                        return acc;
                      },
                      {} as Record<string, boolean>,
                    )}
                    bookAbbrev={currentBook.abbrev}
                    onVersePress={onVersePress}
                    onVerseLongPress={onVerseLongPress}
                    onScroll={handleFirstScroll}
                    scrollEventThrottle={16}
                    onViewableItemsChanged={handleFirstViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    splitMode
                  />
                </View>

                <BibleDivider size={ms(DESIGN.spacing.xs)} />

                <Animated.View
                  style={[
                    styles.floatingControlGroup,
                    {
                      top: "45%",
                      width: controlGroupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          ms(DESIGN.spacing.xxl),
                          ms(DESIGN.height.sm * 4 + DESIGN.spacing.sm * 4),
                        ],
                      }),
                      height: controlGroupAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          ms(DESIGN.spacing.xxl),
                          ms(DESIGN.height.sm + DESIGN.spacing.sm),
                        ],
                      }),
                      transform: [
                        {
                          translateX: controlGroupAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                              -ms(DESIGN.spacing.xxl) / 2,
                              -ms(
                                DESIGN.height.sm * 4 + DESIGN.spacing.sm * 4,
                              ) / 2,
                            ],
                          }),
                        },
                        {
                          translateY: controlGroupAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [
                              -ms(DESIGN.spacing.xxl) / 2,
                              -ms(DESIGN.height.sm + DESIGN.spacing.sm) / 2,
                            ],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {isControlGroupExpanded ? (
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.splitHandleBtn,
                          { backgroundColor: primaryColor + "1F" },
                        ]}
                        onPress={handleToggleOrientation}
                        hitSlop={{
                          top: DESIGN.spacing.sm,
                          bottom: DESIGN.spacing.sm,
                          left: DESIGN.spacing.sm,
                          right: DESIGN.spacing.sm,
                        }}
                      >
                        <MaterialIcons
                          name="vertical-split"
                          color={primaryColor}
                          size={ms(DESIGN.icon.xs)}
                        />
                      </TouchableOpacity>

                      <View style={{ width: ms(DESIGN.spacing.sm) }} />

                      <TouchableOpacity
                        style={[
                          styles.splitHandleBtn,
                          { backgroundColor: primaryColor + "1F" },
                        ]}
                        onPress={handleSwapVersions}
                        hitSlop={{
                          top: DESIGN.spacing.sm,
                          bottom: DESIGN.spacing.sm,
                          left: DESIGN.spacing.sm,
                          right: DESIGN.spacing.sm,
                        }}
                      >
                        <MaterialIcons
                          name="swap-vert"
                          color={primaryColor}
                          size={ms(DESIGN.icon.xs)}
                        />
                      </TouchableOpacity>

                      <View style={{ width: ms(DESIGN.spacing.sm) }} />

                      <TouchableOpacity
                        style={[
                          styles.splitHandleBtn,
                          {
                            backgroundColor: (colors.error || "#FF4D4D") + "1F",
                          },
                        ]}
                        onPress={() => setIsSplitScreen(false)}
                        hitSlop={{
                          top: DESIGN.spacing.sm,
                          bottom: DESIGN.spacing.sm,
                          left: DESIGN.spacing.sm,
                          right: DESIGN.spacing.sm,
                        }}
                      >
                        <BibleIcon
                          name="x"
                          color={colors.error || "#FF4D4D"}
                          size={ms(DESIGN.icon.xs)}
                        />
                      </TouchableOpacity>

                      <View style={{ width: ms(DESIGN.spacing.sm) }} />

                      <TouchableOpacity
                        style={[
                          styles.splitHandleBtn,
                          { backgroundColor: colors.border + "40" },
                        ]}
                        onPress={handleToggleControlGroup}
                        hitSlop={{
                          top: DESIGN.spacing.sm,
                          bottom: DESIGN.spacing.sm,
                          left: DESIGN.spacing.sm,
                          right: DESIGN.spacing.sm,
                        }}
                      >
                        <BibleIcon
                          name="chevron-left"
                          color={colors.textMuted}
                          size={ms(DESIGN.icon.xs)}
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleToggleControlGroup}
                      style={{
                        flex: 1,
                        width: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: primaryColor,
                        borderRadius: ms(DESIGN.borderRadius.md),
                      }}
                      activeOpacity={0.7}
                    >
                      <BibleIcon
                        name="more-horizontal"
                        color={colors.onPrimary}
                        size={ms(DESIGN.icon.xs)}
                      />
                    </TouchableOpacity>
                  )}
                </Animated.View>

                <View style={styles.splitPaneBottom}>
                  {renderVersionBadge(secondVersion, () =>
                    openModal({
                      initialStep: "version",
                      target: "study",
                      initialVersion: secondVersion,
                      onSelect: (s) => {
                        if (s.version) {
                          setSecondVersion(s.version);
                        }
                      },
                    }),
                  )}
                  <BibleVerseReader
                    listRef={secondSectionListRef}
                    sections={secondSectionData}
                    blinkingVerse={blinkingVerse}
                    playingVerseKey={playingVerseKey}
                    highlights={highlights}
                    notes={notesMap}
                    version={secondVersion}
                    selectedKeys={selectedVerses.reduce(
                      (acc, v) => {
                        acc[`${v.bookAbbrev}-${v.chapter}-${v.verse}`] = true;
                        return acc;
                      },
                      {} as Record<string, boolean>,
                    )}
                    bookAbbrev={currentBook.abbrev}
                    onVersePress={onVersePress}
                    onVerseLongPress={onVerseLongPress}
                    onScroll={handleSecondScroll}
                    scrollEventThrottle={16}
                    splitMode
                  />
                </View>
              </View>
            )
          ) : (
            <View style={styles.splitPane}>
              <BibleVerseReader
                listRef={sectionListRef}
                sections={sectionData}
                blinkingVerse={blinkingVerse}
                playingVerseKey={playingVerseKey}
                highlights={highlights}
                notes={notesMap}
                version={version}
                selectedKeys={selectedVerses.reduce(
                  (acc, v) => {
                    acc[`${v.bookAbbrev}-${v.chapter}-${v.verse}`] = true;
                    return acc;
                  },
                  {} as Record<string, boolean>,
                )}
                bookAbbrev={currentBook.abbrev}
                onVersePress={onVersePress}
                onVerseLongPress={onVerseLongPress}
                onScroll={handleReaderScroll}
                scrollEventThrottle={16}
                onViewableItemsChanged={handleFirstViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
              />
            </View>
          )}

          {!isActionSheetVisible && !isAudioModalVisible && (
            <Animated.View
              pointerEvents={isNavInteractive ? "box-none" : "none"}
              style={[
                styles.floatingNav,
                {
                  opacity: navVisibleAnim,
                  transform: [
                    {
                      translateY: navVisibleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [ms(24), 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              {hasPrevChapter ? (
                <BibleIcon
                  name="chevron-left"
                  size={navIconSize}
                  containerSize={navBtnSize}
                  color={navIcon}
                  backgroundColor={navBg}
                  borderRadius={ms(DESIGN.borderRadius.md)}
                  onPress={() => handleNavigateChapter(-1)}
                  activeOpacity={0.8}
                  style={{
                    elevation: 4,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: ms(DESIGN.spacing.tiny) },
                    shadowOpacity: 0.25,
                    shadowRadius: ms(DESIGN.spacing.xs),
                  }}
                />
              ) : (
                <View
                  style={{
                    width: navBtnSize,
                    height: navBtnSize,
                  }}
                  pointerEvents="none"
                />
              )}

              {hasNextChapter ? (
                <BibleIcon
                  name="chevron-right"
                  size={navIconSize}
                  containerSize={navBtnSize}
                  color={navIcon}
                  backgroundColor={navBg}
                  borderRadius={ms(DESIGN.borderRadius.md)}
                  onPress={() => handleNavigateChapter(1)}
                  activeOpacity={0.8}
                  style={{
                    elevation: 4,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: ms(DESIGN.spacing.tiny) },
                    shadowOpacity: 0.25,
                    shadowRadius: ms(DESIGN.spacing.xs),
                  }}
                />
              ) : (
                <View
                  style={{
                    width: navBtnSize,
                    height: navBtnSize,
                  }}
                  pointerEvents="none"
                />
              )}
            </Animated.View>
          )}
        </View>
      </Animated.View>

      <BibleAudioModal
        ref={audioModalRef}
        visible={isAudioModalVisible}
        version={version}
        abbrev={currentBook.abbrev}
        chapter={chapter}
        voice={selectedVoice}
        onVerseChange={setPlayingVerse}
        onClose={() => setIsAudioModalVisible(false)}
        onShowToast={(msg) => show(msg)}
        onOpenSettings={() => setIsAudioSettingsVisible(true)}
        onRequestNextChapter={() => {
          if (!hasNextChapter) return false;
          handleNavigateChapter(1);
          return true;
        }}
      />

      <AudioSettingsModal
        visible={isAudioSettingsVisible}
        onClose={() => setIsAudioSettingsVisible(false)}
      />

      <BibleVerseActionSheet
        visible={isActionSheetVisible}
        onClose={onActionSheetClose}
        selectedVerses={selectedVerses}
        highlights={highlights}
        onBulkHighlight={(verses, color) => {
          bulkToggleHighlight(verses, color);
          onActionSheetClose();
        }}
        onShowToast={(msg) => show(msg)}
      />

      <BibleDrawerMenu
        visible={isDrawerVisible}
        activeItem="bible"
        onClose={() => setIsDrawerVisible(false)}
        onSelectItem={(key) => {
          if (key === "history") setIsHistoryModalVisible(true);
          if (key === "settings") setIsSettingsModalVisible(true);
        }}
        onOpenDonate={() => {
          setIsDrawerVisible(false);
          setIsDonateVisible(true);
        }}
      />

      <ReaderSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
      />
      <DonateModal
        visible={isDonateVisible}
        onClose={() => setIsDonateVisible(false)}
      />
      <BibleConfirmModal
        visible={isExitConfirmVisible}
        title="Sair do aplicativo"
        message="Tem certeza que deseja sair do aplicativo?"
        confirmText="Sair"
        isDanger={true}
        onConfirm={() => BackHandler.exitApp()}
        onCancel={() => setIsExitConfirmVisible(false)}
      />
      <BibleToast opacity={opacity} toast={toast} />
    </View>
  );
}
