import { BibleDivider } from "@/components/BibleDivider";
import { BibleIcon } from "@/components/BibleIcon";
import { BiblePageModal } from "@/components/modals/BiblePageModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BibleDrawerMenu } from "../components/BibleDrawerMenu";
import { BibleHeader } from "../components/BibleHeader";
import { BiblePageEmpty } from "../components/BiblePageEmpty";
import { BibleSkeleton } from "../components/BibleSkeleton";
import { BibleText } from "../components/BibleText";
import { DonateModal } from "../components/modals/DonateModal";
import { ROUTES } from "../constants/routes";
import { STORAGE_KEYS } from "../constants/storage";
import { Book, getBibleData } from "../data/bible-version";
import bibleBooks from "../data/bible-version/bible-books.json";
import { useBible } from "../hooks/useBible";
import { useBibleModals } from "../hooks/useBibleModals";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { impactLight, selectionHaptic } from "../utils/haptics";
import { handleSmartBack } from "../utils/navigation";

type Testament = "OT" | "NT" | null;

const OT_ABBREVS = new Set(
  (bibleBooks.oldTestament as { books: { abbrev: string }[] }[])
    .flatMap((g) => g.books)
    .map((b) => b.abbrev.toLowerCase()),
);

const NT_ABBREVS = new Set(
  (bibleBooks.newTestament as { books: { abbrev: string }[] }[])
    .flatMap((g) => g.books)
    .map((b) => b.abbrev.toLowerCase()),
);

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function hasAccents(str: string): boolean {
  return removeAccents(str) !== str;
}

function buildMatcher(query: string) {
  const trimmed = query.trim();
  const accentSensitive = hasAccents(trimmed);
  const normalize = accentSensitive
    ? (s: string) => s.toLowerCase()
    : (s: string) => removeAccents(s).toLowerCase();
  return { term: normalize(trimmed), normalize };
}

export type SearchResult = {
  bookName: string;
  bookAbbrev: string;
  chapter: number;
  verse: number;
  text: string;
};

export type SearchFilter = {
  query: string;
  version: string;
  book?: string | null;
  chapter?: number | null;
  testament?: Testament;
};

const MAX_HISTORY = 20;

const HighlightText = React.memo(
  ({
    text,
    query,
    colors,
    fontSizeMultiplier,
    ms,
    DESIGN,
    styles,
  }: {
    text: string;
    query: string;
    colors: any;
    fontSizeMultiplier: number;
    ms: (v: number) => number;
    DESIGN: any;
    styles: any;
  }) => {
    const currentSize = ms(DESIGN.fontSize.xxl * fontSizeMultiplier);
    const currentLineHeight = ms(DESIGN.spacing.xxl * fontSizeMultiplier);
    const textStyle = {
      color: colors.onBackground,
      fontSize: currentSize,
      lineHeight: currentLineHeight,
    };

    const { term: cleanQuery, normalize } = buildMatcher(query);
    if (!cleanQuery) {
      return (
        <BibleText variant="reading" style={[styles.verseText, textStyle]}>
          {text}
        </BibleText>
      );
    }

    const normalizedText = normalize(text);
    const tokens: { text: string; highlighted: boolean }[] = [];

    let lastIdx = 0;
    let idx = normalizedText.indexOf(cleanQuery);

    while (idx !== -1) {
      if (idx > lastIdx) {
        tokens.push({ text: text.slice(lastIdx, idx), highlighted: false });
      }
      tokens.push({
        text: text.slice(idx, idx + cleanQuery.length),
        highlighted: true,
      });

      lastIdx = idx + cleanQuery.length;
      idx = normalizedText.indexOf(cleanQuery, lastIdx);
    }

    if (lastIdx < text.length) {
      tokens.push({ text: text.slice(lastIdx), highlighted: false });
    }

    return (
      <BibleText variant="reading" style={[styles.verseText, textStyle]}>
        {tokens.map((token, i) =>
          token.highlighted ? (
            <BibleText
              key={i}
              variant="reading"
              style={[
                styles.verseText,
                textStyle,
                {
                  color: colors.primary,
                  fontWeight: "800",
                  backgroundColor: colors.primary + "20",
                },
              ]}
            >
              {token.text}
            </BibleText>
          ) : (
            token.text
          ),
        )}
      </BibleText>
    );
  },
);

const SearchResultItem = React.memo(
  ({
    item,
    query,
    colors,
    fontSizeMultiplier,
    ms,
    DESIGN,
    styles,
    onPress,
  }: {
    item: SearchResult;
    query: string;
    colors: any;
    fontSizeMultiplier: number;
    ms: (v: number) => number;
    DESIGN: any;
    styles: any;
    onPress: (item: SearchResult) => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[
        styles.resultCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={() => onPress(item)}
    >
      <View
        style={[styles.refBadge, { backgroundColor: colors.primary + "15" }]}
      >
        <BibleText
          variant="reading"
          style={[
            styles.refText,
            {
              color: colors.primary,
              fontSize: ms(DESIGN.fontSize.sm * fontSizeMultiplier),
              fontWeight: "800",
            },
          ]}
        >
          {item.bookName} {item.chapter}:{item.verse}
        </BibleText>
      </View>
      <View style={styles.resultTextContent}>
        <HighlightText
          text={item.text}
          query={query}
          colors={colors}
          fontSizeMultiplier={fontSizeMultiplier}
          ms={ms}
          DESIGN={DESIGN}
          styles={styles}
        />
      </View>
    </TouchableOpacity>
  ),
);

export default function SearchScreen() {
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        highlightTextContainer: {
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
        },
        highlightedToken: {
          borderRadius: ms(DESIGN.borderRadius.xs),
          paddingHorizontal: ms(DESIGN.spacing.xs),
          paddingVertical: ms(DESIGN.spacing.tiny),
          marginVertical: ms(DESIGN.spacing.tiny),
        },
        resultTextContent: {
          flex: 1,
          marginTop: ms(DESIGN.spacing.md),
        },
        searchContainer: {
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingVertical: ms(DESIGN.spacing.md),
        },
        searchRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.sm),
          flex: 1,
        },
        searchBox: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          height: ms(DESIGN.height.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          paddingHorizontal: ms(DESIGN.spacing.sm),
          borderWidth: 1,
        },
        input: {
          flex: 1,
          height: "100%",
          padding: 0,
          includeFontPadding: false,
        },
        searchIcon: {
          marginRight: ms(DESIGN.spacing.sm),
        },
        activityIndicator: {
          marginRight: ms(DESIGN.spacing.xs),
        },
        resultsInfoContainer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingVertical: ms(DESIGN.spacing.sm),
          borderBottomWidth: 1,
        },
        appliedFilterLabel: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.xs),
        },
        appliedFilterText: {
          fontWeight: "600",
        },
        centerBox: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        historyList: {
          flex: 1,
        },
        historyHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: ms(DESIGN.spacing.sm),
        },
        historyHeaderText: {
          fontSize: ms(DESIGN.fontSize.xs),
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 1,
          opacity: 0.6,
        },
        clearHistoryBtn: {
          paddingHorizontal: ms(DESIGN.spacing.md),
          paddingVertical: ms(DESIGN.spacing.xs),
          borderRadius: ms(DESIGN.borderRadius.md),
        },
        clearHistoryText: {
          fontSize: ms(DESIGN.fontSize.xs),
          fontWeight: "800",
        },
        historyItem: {
          flexDirection: "row",
          alignItems: "center",
        },
        historyText: {
          fontWeight: "500",
          marginLeft: ms(DESIGN.spacing.sm),
          flex: 1,
        },
        resultCard: {
          borderRadius: ms(DESIGN.borderRadius.lg),
          borderWidth: 1,
          padding: ms(DESIGN.spacing.lg),
        },
        refBadge: {
          alignSelf: "flex-start",
          borderRadius: ms(DESIGN.borderRadius.sm),
          paddingHorizontal: ms(DESIGN.spacing.sm),
          paddingVertical: ms(DESIGN.spacing.tiny),
        },
        refText: { fontWeight: "700" },
        verseText: {
          fontSize: ms(DESIGN.fontSize.md),
          lineHeight: ms(DESIGN.fontSize.xxl),
        },
        filterModalHeader: {
          flexDirection: "row",
          alignItems: "center",
        },
        filterModalIcon: {
          marginRight: ms(DESIGN.spacing.sm),
        },
        filterModalTitle: {
          fontSize: ms(DESIGN.fontSize.lg),
          fontWeight: "800",
          flex: 1,
        },
        resetFiltersBtn: {
          marginRight: ms(DESIGN.spacing.md),
        },
        resetFiltersText: {
          fontWeight: "700",
          fontSize: ms(DESIGN.fontSize.sm),
        },
        filterModalContent: {
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.spacing.xl),
        },
        filterModalItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: ms(DESIGN.spacing.md),
        },
        filterModalItemIcon: {
          marginRight: ms(DESIGN.spacing.md),
        },
        filterModalLabelContainer: {
          flex: 1,
        },
        filterModalLabel: {
          fontWeight: "600",
          fontSize: ms(DESIGN.fontSize.xs),
        },
        filterModalValue: {
          fontWeight: "800",
          fontSize: ms(DESIGN.fontSize.md),
        },
        filterBtnFooter: {
          borderRadius: ms(DESIGN.borderRadius.md),
          paddingVertical: ms(DESIGN.spacing.md),
          alignItems: "center",
          justifyContent: "center",
        },
        filterBtnText: {
          fontWeight: "800",
        },
        filterBadge: {
          paddingHorizontal: ms(DESIGN.spacing.sm),
          paddingVertical: ms(DESIGN.spacing.tiny),
          borderRadius: ms(DESIGN.borderRadius.sm),
        },
        testamentDropdownRow: {
          flexDirection: "row",
          gap: ms(DESIGN.spacing.sm),
          paddingBottom: ms(DESIGN.spacing.md),
        },
        testamentOption: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.md),
          borderWidth: 1,
        },
        testamentOptionText: {
          fontWeight: "700",
          fontSize: ms(DESIGN.fontSize.sm),
        },
      }),
    [ms, colors, DESIGN],
  );

  const { fontSizeMultiplier } = useReaderSettings();
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ query?: string; from?: string }>();
  const { version, navigateTo } = useBible();
  const { openModal } = useBibleModals();

  const [query, setQuery] = useState("");
  const [searchVersion, setSearchVersion] = useState(version || "NAA");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Derive version books locally to avoid affecting global state
  const searchVersionBooks = useMemo(
    () => getBibleData(searchVersion),
    [searchVersion],
  );

  // Local Filter State
  const [searchBook, setSearchBook] = useState<Book | null>(null);
  const [searchChapter, setSearchChapter] = useState<number | null>(null);
  const [searchTestament, setSearchTestament] = useState<Testament>(null);
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDonateVisible, setIsDonateVisible] = useState(false);

  const searchTimeout = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  const saveSearchState = async (updates: Partial<SearchFilter>) => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SEARCH);
      const current = stored
        ? JSON.parse(stored)
        : { query: "", version: version || "NAA", book: null, chapter: null };
      const next = { ...current, ...updates };
      await AsyncStorage.setItem(
        STORAGE_KEYS.CURRENT_SEARCH,
        JSON.stringify(next),
      );
    } catch (e) {}
  };

  useEffect(() => {
    (async () => {
      try {
        const [savedSearch, savedHistory] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SEARCH),
          AsyncStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY),
        ]);

        let finalSearchState: SearchFilter | null = savedSearch
          ? JSON.parse(savedSearch)
          : null;

        if (finalSearchState) {
          if (params.from === "bible") {
            const restoredQuery = finalSearchState.query || "";
            const restoredVersion =
              finalSearchState.version || version || "NAA";

            let restoredBook: Book | null = null;
            const restoredBookAbbrev = finalSearchState.book;
            if (restoredBookAbbrev) {
              const books = getBibleData(restoredVersion);
              restoredBook =
                books.find(
                  (b) =>
                    b.abbrev.toLowerCase() ===
                      restoredBookAbbrev.toLowerCase() ||
                    b.name.toLowerCase() === restoredBookAbbrev.toLowerCase(),
                ) || null;
            }
            const restoredChapter = finalSearchState.chapter || null;
            const restoredTestament: Testament =
              finalSearchState.testament || null;

            setQuery(restoredQuery);
            setSearchVersion(restoredVersion);
            setSearchBook(restoredBook);
            setSearchChapter(restoredChapter);
            setSearchTestament(restoredTestament);

            if (restoredQuery.trim().length >= 2) {
              setIsSearching(true);
              const { term, normalize } = buildMatcher(restoredQuery);
              const found: SearchResult[] = [];
              const searchVersionBooks = getBibleData(restoredVersion);

              const scope = restoredChapter
                ? "chapter"
                : restoredBook
                  ? "book"
                  : restoredTestament
                    ? "testament"
                    : "bible";
              const booksToSearch =
                scope === "book" && restoredBook
                  ? [restoredBook]
                  : scope === "testament" && restoredTestament
                    ? searchVersionBooks.filter((b) =>
                        restoredTestament === "OT"
                          ? OT_ABBREVS.has(b.abbrev.toLowerCase())
                          : NT_ABBREVS.has(b.abbrev.toLowerCase()),
                      )
                    : searchVersionBooks;

              if (booksToSearch) {
                for (const book of booksToSearch) {
                  const chaptersToSearch =
                    scope === "chapter" && restoredChapter
                      ? [
                          {
                            idx: restoredChapter - 1,
                            verses: book.chapters[restoredChapter - 1] || [],
                          },
                        ]
                      : book.chapters.map((verses, idx) => ({ idx, verses }));

                  for (const { idx, verses } of chaptersToSearch) {
                    for (let vi = 0; vi < verses.length; vi++) {
                      if (normalize(verses[vi]).includes(term)) {
                        found.push({
                          bookName: book.name,
                          bookAbbrev: book.abbrev,
                          chapter: idx + 1,
                          verse: vi + 1,
                          text: verses[vi],
                        });
                      }
                    }
                  }
                }
              }
              setResults(found);
              setIsSearching(false);
            }
          } else {
            setQuery("");
            saveSearchState({ query: "", book: "", chapter: undefined });
            if (finalSearchState.version)
              setSearchVersion(finalSearchState.version);
          }
        }

        if (savedHistory) setHistory(JSON.parse(savedHistory));
      } catch (e) {}
      setIsLoaded(true);
    })();
  }, []); // Only on mount

  const saveQuery = (q: string) => {
    saveSearchState({ query: q });
  };

  const saveFilters = (
    v: string,
    b: string | null,
    c: number | null,
    t: Testament,
  ) => {
    saveSearchState({
      version: v,
      book: b,
      chapter: c,
      testament: t,
    });
  };

  const addToHistory = async (term: string) => {
    if (!term.trim() || term.trim().length < 2) return;
    setHistory((prev) => {
      const filtered = prev.filter(
        (h) => h.toLowerCase() !== term.toLowerCase(),
      );
      const next = [term.trim(), ...filtered].slice(0, MAX_HISTORY);
      AsyncStorage.setItem(
        STORAGE_KEYS.SEARCH_HISTORY,
        JSON.stringify(next),
      ).catch(() => {});
      return next;
    });
  };

  const removeFromHistory = async (term: string) => {
    setHistory((prev) => {
      const next = prev.filter((h) => h !== term);
      AsyncStorage.setItem(
        STORAGE_KEYS.SEARCH_HISTORY,
        JSON.stringify(next),
      ).catch(() => {});
      return next;
    });
  };

  const clearHistory = async () => {
    impactLight();
    setHistory([]);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    } catch (e) {}
  };

  const scope = useMemo(() => {
    if (searchChapter) return "chapter";
    if (searchBook) return "book";
    if (searchTestament) return "testament";
    return "bible";
  }, [searchBook, searchChapter, searchTestament]);

  const filterLabelText = useMemo(() => {
    const v = searchVersion.toUpperCase();
    if (searchBook && searchChapter)
      return `${v} • ${searchBook.name} ${searchChapter}`;
    if (searchBook) return `${v} • ${searchBook.name}`;
    if (searchTestament === "OT") return `${v} • Antigo Testamento`;
    if (searchTestament === "NT") return `${v} • Novo Testamento`;
    return `${v} • Bíblia Toda`;
  }, [searchBook, searchChapter, searchVersion, searchTestament]);

  const runSearch = useCallback(
    (q: string, immediate = false) => {
      clearTimeout(searchTimeout.current);
      if (!q.trim() || q.trim().length < 2) {
        setResults([]);
        setIsSearching(false);
        return;
      }
      setIsSearching(true);
      const delay = immediate ? 0 : 350;
      searchTimeout.current = setTimeout(() => {
        const { term, normalize } = buildMatcher(q);
        const found: SearchResult[] = [];

        const booksToSearch =
          scope === "book" && searchBook
            ? [searchBook]
            : scope === "testament" && searchTestament
              ? searchVersionBooks?.filter((b) =>
                  searchTestament === "OT"
                    ? OT_ABBREVS.has(b.abbrev.toLowerCase())
                    : NT_ABBREVS.has(b.abbrev.toLowerCase()),
                )
              : searchVersionBooks;

        if (!booksToSearch) {
          setIsSearching(false);
          return;
        }

        for (const book of booksToSearch) {
          const chaptersToSearch =
            scope === "chapter" && searchChapter
              ? [
                  {
                    idx: searchChapter - 1,
                    verses: book.chapters[searchChapter - 1] || [],
                  },
                ]
              : book.chapters.map((verses, idx) => ({ idx, verses }));

          for (const { idx, verses } of chaptersToSearch) {
            for (let vi = 0; vi < verses.length; vi++) {
              if (normalize(verses[vi]).includes(term)) {
                found.push({
                  bookName: book.name,
                  bookAbbrev: book.abbrev,
                  chapter: idx + 1,
                  verse: vi + 1,
                  text: verses[vi],
                });
              }
            }
          }
        }

        setResults(found);
        setIsSearching(false);
      }, delay);
    },
    [searchVersionBooks, searchBook, searchChapter, searchTestament, scope],
  );

  const handleChangeQuery = (q: string) => {
    setQuery(q);
    saveQuery(q);
    runSearch(q);
    router.setParams({ query: q });
  };

  // REMOVED: Only filter when clicking the Filter button or submitting search

  const handleSubmit = () => {
    if (query.trim().length >= 2) {
      addToHistory(query.trim());
      runSearch(query, true);
    }
  };

  const handleHistorySelect = (term: string) => {
    selectionHaptic();
    setQuery(term);
    saveQuery(term);
    addToHistory(term);
    runSearch(term, true);
    router.setParams({ query: term });
  };

  const handleNavigate = (r: SearchResult) => {
    impactLight();
    addToHistory(query.trim());
    navigateTo({
      book: r.bookAbbrev,
      chapter: r.chapter,
      verse: r.verse,
      version: searchVersion,
    });
    router.replace({ pathname: ROUTES.BIBLE } as any);
  };

  const handleClearQuery = () => {
    setQuery("");
    saveQuery("");
    setResults([]);
    inputRef.current?.focus();
    router.setParams({ query: "" });
  };

  const handleResetFilters = () => {
    setSearchBook(null);
    setSearchChapter(null);
    setSearchTestament(null);
  };

  const showHistory = query.trim().length === 0 && history.length > 0;
  const showEmpty = query.trim().length === 0 && history.length === 0;
  const showTooShort =
    !isSearching && query.trim().length > 0 && query.trim().length < 2;
  const showNoResults =
    !isSearching && query.trim().length >= 2 && results.length === 0;
  const showResults =
    !isSearching && query.trim().length >= 2 && results.length > 0;

  if (!isLoaded || !searchVersionBooks) {
    return <BibleSkeleton />;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
      testID="search-screen"
    >
      <BibleHeader
        showMenu={params.from !== "bible"}
        showBack={params.from === "bible"}
        onBack={() => handleSmartBack(pathname)}
        onMenuPress={() => setIsDrawerVisible(true)}
        leftContent={
          <View
            style={[
              styles.searchBox,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <BibleIcon
              name="search"
              size={ms(DESIGN.spacing.lg)}
              color={colors.primary}
              style={styles.searchIcon}
            />
            <TextInput
              ref={inputRef}
              style={[
                styles.input,
                Platform.select({
                  web: { outline: "none", outlineWidth: 0 } as any,
                  default: {},
                }),
                { fontSize: ms(DESIGN.fontSize.md), color: colors.onSurface },
              ]}
              placeholder="Pesquisar na Bíblia..."
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={handleChangeQuery}
              onSubmitEditing={handleSubmit}
              autoFocus
              returnKeyType="search"
              underlineColorAndroid="transparent"
              {...({ outlineStyle: "none" } as any)}
            />
            {isSearching ? (
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={styles.activityIndicator}
              />
            ) : query.length > 0 ? (
              <BibleIcon
                name="x"
                color={colors.error}
                backgroundColor={colors.error + "20"}
                onPress={handleClearQuery}
                size={ms(DESIGN.spacing.md)}
              />
            ) : null}
          </View>
        }
      />

      {(showResults || showNoResults) && (
        <View
          style={[
            styles.resultsInfoContainer,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.appliedFilterLabel}
            onPress={() => {
              Keyboard.dismiss();
              setIsFilterModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <BibleText
              style={[
                styles.appliedFilterText,
                { color: colors.textMuted, fontSize: ms(DESIGN.fontSize.xs) },
              ]}
            >
              FILTRO APLICADO:
            </BibleText>
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <BibleText
                style={{
                  color: colors.primary,
                  fontWeight: "800",
                  fontSize: ms(DESIGN.fontSize.sm),
                }}
              >
                {filterLabelText.toUpperCase()}
              </BibleText>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {isSearching ? (
        <BibleSkeleton onlyContent />
      ) : showEmpty ? (
        <BiblePageEmpty
          title="Pesquise uma palavra ou frase"
          description="Bíblia toda, livro ou capítulo"
          icon="search"
        />
      ) : showHistory ? (
        <View style={styles.historyList}>
          <FlashList
            data={history}
            keyExtractor={(item) => item}
            // @ts-ignore
            estimatedItemSize={ms(DESIGN.layout.footerHeight)}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: ms(DESIGN.spacing.lg) }}
            ItemSeparatorComponent={() => (
              <View style={{ height: ms(DESIGN.spacing.sm) }} />
            )}
            ListHeaderComponent={
              <View style={styles.historyHeader}>
                <BibleText
                  style={[
                    styles.historyHeaderText,
                    { color: colors.textMuted },
                  ]}
                >
                  BUSCAS RECENTES
                </BibleText>
                <TouchableOpacity
                  onPress={clearHistory}
                  style={[
                    styles.clearHistoryBtn,
                    { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <BibleText
                    style={[styles.clearHistoryText, { color: colors.primary }]}
                  >
                    Limpar
                  </BibleText>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.resultCard,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                onPress={() => handleHistorySelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.historyItem}>
                  <BibleIcon
                    name="clock"
                    backgroundColor={colors.primary + "20"}
                    color={colors.primary}
                  />
                  <BibleText
                    style={[
                      styles.historyText,
                      {
                        color: colors.onSurface,
                        fontSize: ms(DESIGN.fontSize.md),
                      },
                    ]}
                  >
                    {item}
                  </BibleText>
                  <BibleIcon
                    name="x"
                    color={colors.error}
                    backgroundColor={colors.error + "20"}
                    onPress={() => removeFromHistory(item)}
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : showTooShort ? (
        <BiblePageEmpty
          title="Pesquisa"
          description="Digite ao menos 2 caracteres para pesquisar"
          icon="search"
        />
      ) : showNoResults ? (
        <BiblePageEmpty
          title="Sem resultados"
          description={`Nenhum versículo encontrado com o texto: "${query.trim()}"`}
          icon="slash"
          actionLabel="Limpar Busca"
          onAction={handleClearQuery}
        />
      ) : showResults ? (
        <View style={styles.container}>
          <FlashList
            data={results}
            keyExtractor={(_, i) => String(i)}
            // @ts-ignore
            estimatedItemSize={ms(DESIGN.layout.listPaddingBottom)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: ms(DESIGN.spacing.md) }}
            ItemSeparatorComponent={() => (
              <View style={{ height: ms(DESIGN.spacing.sm) }} />
            )}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <SearchResultItem
                item={item}
                query={query.trim()}
                colors={colors}
                fontSizeMultiplier={fontSizeMultiplier}
                ms={ms}
                DESIGN={DESIGN}
                styles={styles}
                onPress={handleNavigate}
              />
            )}
          />
        </View>
      ) : null}

      {/* Filter Modal */}
      <BiblePageModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        header={
          <View style={styles.filterModalHeader}>
            <BibleIcon
              name="filter"
              color={colors.primary}
              backgroundColor={colors.primary + "15"}
              style={styles.filterModalIcon}
            />
            <BibleText
              style={[styles.filterModalTitle, { color: colors.onSurface }]}
            >
              Filtros de Busca
            </BibleText>
            <BibleIcon
              name="x"
              color={colors.error}
              backgroundColor={colors.error + "20"}
              onPress={() => setIsFilterModalVisible(false)}
            />
          </View>
        }
        footer={
          <View>
            <TouchableOpacity
              style={[
                styles.filterBtnFooter,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => {
                setIsFilterModalVisible(false);
                saveFilters(
                  searchVersion,
                  searchBook?.abbrev || null,
                  searchChapter,
                  searchTestament,
                );
                runSearch(query, true);
              }}
            >
              <BibleText
                style={[
                  styles.filterBtnText,
                  { color: colors.onPrimary, fontSize: ms(DESIGN.fontSize.lg) },
                ]}
              >
                Filtrar
              </BibleText>
            </TouchableOpacity>
          </View>
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.filterModalContent}
        >
          <TouchableOpacity
            style={styles.filterModalItem}
            onPress={() =>
              openModal({
                initialStep: "version",
                target: "search",
                initialVersion: searchVersion,
                onSelect: (s) => s.version && setSearchVersion(s.version),
              })
            }
          >
            <BibleIcon
              name="book"
              color={colors.primary}
              backgroundColor={colors.primary + "15"}
              style={styles.filterModalItemIcon}
            />
            <View style={styles.filterModalLabelContainer}>
              <BibleText
                style={[styles.filterModalLabel, { color: colors.textMuted }]}
              >
                BIBLIA
              </BibleText>
              <BibleText
                style={[styles.filterModalValue, { color: colors.onSurface }]}
              >
                {searchVersion}
              </BibleText>
            </View>
            <BibleIcon name="chevron-right" color={colors.textMuted} />
          </TouchableOpacity>
          <BibleDivider />

          <View style={styles.filterModalItem}>
            <BibleIcon
              name="book-open"
              color={colors.primary}
              backgroundColor={colors.primary + "15"}
              style={styles.filterModalItemIcon}
            />
            <View style={styles.filterModalLabelContainer}>
              <BibleText
                style={[styles.filterModalLabel, { color: colors.textMuted }]}
              >
                TESTAMENTO
              </BibleText>
            </View>
          </View>
          <View style={styles.testamentDropdownRow}>
            {(
              [
                { value: null, label: "Todos" },
                { value: "OT", label: "Antigo" },
                { value: "NT", label: "Novo" },
              ] as { value: Testament; label: string }[]
            ).map((opt) => {
              const isActive = searchTestament === opt.value;
              return (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[
                    styles.testamentOption,
                    {
                      backgroundColor: isActive
                        ? colors.primary
                        : colors.surface,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSearchTestament(opt.value);
                    setSearchBook(null);
                    setSearchChapter(null);
                  }}
                  activeOpacity={0.75}
                >
                  <BibleText
                    style={[
                      styles.testamentOptionText,
                      {
                        color: isActive ? colors.onPrimary : colors.onSurface,
                      },
                    ]}
                  >
                    {opt.label}
                  </BibleText>
                </TouchableOpacity>
              );
            })}
          </View>
          <BibleDivider />

          <TouchableOpacity
            style={styles.filterModalItem}
            onPress={() =>
              openModal({
                initialStep: "book",
                target: "search",
                initialVersion: searchVersion,
                skipChapterSelection: true,
                initialBook: searchBook || undefined,
                onSelect: (s) => {
                  if (s.book) {
                    setSearchBook(s.book);
                    setSearchChapter(null);
                    setSearchTestament(null);
                  }
                },
              })
            }
          >
            <BibleIcon
              name="list"
              color={colors.primary}
              backgroundColor={colors.primary + "15"}
              style={styles.filterModalItemIcon}
            />
            <View style={styles.filterModalLabelContainer}>
              <BibleText
                style={[styles.filterModalLabel, { color: colors.textMuted }]}
              >
                LIVRO
              </BibleText>
              <BibleText
                style={[styles.filterModalValue, { color: colors.onSurface }]}
              >
                {searchBook ? searchBook.name : "Todos os Livros"}
              </BibleText>
            </View>
            {searchBook ? (
              <BibleIcon
                name="rotate-ccw"
                color={colors.primary}
                backgroundColor={colors.primary + "20"}
                onPress={() => {
                  setSearchBook(null);
                  setSearchChapter(null);
                }}
              />
            ) : (
              <BibleIcon name="chevron-right" color={colors.textMuted} />
            )}
          </TouchableOpacity>
          <BibleDivider />

          <TouchableOpacity
            style={[styles.filterModalItem, !searchBook && { opacity: 0.5 }]}
            disabled={!searchBook}
            onPress={() =>
              openModal({
                initialStep: "chapter",
                target: "search",
                initialVersion: searchVersion,
                skipChapterSelection: true,
                skipVerseSelection: true,
                initialBook: searchBook || undefined,
                initialChapter: searchChapter || undefined,
                onSelect: (s) => s.chapter && setSearchChapter(s.chapter),
              })
            }
          >
            <BibleIcon
              name="hash"
              color={colors.primary}
              backgroundColor={colors.primary + "15"}
              style={styles.filterModalItemIcon}
            />
            <View style={styles.filterModalLabelContainer}>
              <BibleText
                style={[styles.filterModalLabel, { color: colors.textMuted }]}
              >
                CAPÍTULO
              </BibleText>
              <BibleText
                style={[styles.filterModalValue, { color: colors.onSurface }]}
              >
                {searchChapter
                  ? `Capítulo ${searchChapter}`
                  : "Todos os Capítulos"}
              </BibleText>
            </View>
            {searchChapter ? (
              <BibleIcon
                name="rotate-ccw"
                color={colors.primary}
                backgroundColor={colors.primary + "20"}
                onPress={() => {
                  setSearchChapter(null);
                }}
              />
            ) : (
              <BibleIcon name="chevron-right" color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </ScrollView>
      </BiblePageModal>

      <BibleDrawerMenu
        visible={isDrawerVisible}
        activeItem="search"
        onClose={() => setIsDrawerVisible(false)}
        onSelectItem={() => {}}
        onOpenDonate={() => {
          setIsDrawerVisible(false);
          setTimeout(() => setIsDonateVisible(true), 250);
        }}
      />

      <DonateModal
        visible={isDonateVisible}
        onClose={() => setIsDonateVisible(false)}
      />
    </View>
  );
}
