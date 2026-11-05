import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { STORAGE_KEYS } from "../../constants/storage";
import { Book } from "../../data/bible-version";
import bibleBooks from "../../data/bible-version/bible-books.json";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { BibleCountPill } from "../BibleCountPill";
import { BibleGridBlock } from "../BibleGridBlock";
import { BibleIcon } from "../BibleIcon";
import { BibleListCard } from "../BibleListCard";
import { BibleText } from "../BibleText";
import { BiblePageModal } from "./BiblePageModal";

type BibleBookModalProps = {
  visible: boolean;
  onClose: () => void;
  books: Book[];
  versionSigla?: string;
  onVersionPress?: () => void;
  onSelect: (bookName: string) => void;
  currentBookAbbrev?: string;
  showVersionPill?: boolean;
};

type BookEntry = { abbrev: string; name: string };
type GroupEntry = { group: string; label: string; books: BookEntry[] };

const ALL_OT_ABBREVS = new Set(
  (bibleBooks.oldTestament as GroupEntry[]).flatMap((g) =>
    g.books.map((b) => b.abbrev),
  ),
);

const ABBREV_TO_NAME: Record<string, string> = {};
[
  ...(bibleBooks.oldTestament as GroupEntry[]),
  ...(bibleBooks.newTestament as GroupEntry[]),
].forEach((g) => {
  g.books.forEach((b) => {
    ABBREV_TO_NAME[b.abbrev] = b.name;
  });
});

export function BibleBookModal({
  visible,
  onClose,
  books,
  versionSigla,
  onVersionPress,
  onSelect,
  currentBookAbbrev,
  showVersionPill,
}: BibleBookModalProps) {
  const { ms, height, width, DESIGN } = useResponsive();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        iconBtn: {
          width: ms(DESIGN.icon.lg),
          height: ms(DESIGN.icon.lg),
          borderRadius: ms(DESIGN.borderRadius.sm),
          justifyContent: "center",
          alignItems: "center",
        },
        headerActionSpacing: { marginLeft: ms(DESIGN.spacing.sm) },
        headerIconWrap: { marginRight: ms(DESIGN.spacing.sm) },
        title: { flex: 1, fontWeight: "700" },
        versionPill: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: ms(DESIGN.spacing.sm),
          height: ms(DESIGN.icon.lg),
          borderRadius: ms(DESIGN.borderRadius.sm),
          marginRight: ms(DESIGN.spacing.sm),
        },
        versionPillText: { fontWeight: "800" },
        searchContainer: {
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderRadius: ms(DESIGN.borderRadius.md),
          paddingHorizontal: ms(DESIGN.spacing.md),
          marginTop: ms(DESIGN.spacing.lg),
          height: ms(DESIGN.height.md),
        },
        searchIcon: { marginRight: ms(DESIGN.spacing.sm) },
        searchInput: {
          flex: 1,
          height: "100%",
          ...({ outlineStyle: "none" } as any),
        },
        scrollContent: {
          paddingBottom: ms(DESIGN.spacing.lg),
          paddingTop: ms(DESIGN.spacing.lg),
          paddingHorizontal: ms(DESIGN.spacing.lg),
        },
        footer: { paddingTop: ms(DESIGN.spacing.xs) },
        viewToggles: {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: ms(DESIGN.borderRadius.sm),
          padding: ms(DESIGN.spacing.tiny),
          gap: ms(DESIGN.spacing.tiny),
          marginLeft: ms(DESIGN.spacing.sm),
          height: ms(DESIGN.icon.lg),
        },
        toggleBtn: {
          width: ms(DESIGN.icon.md),
          height: ms(DESIGN.icon.md),
          justifyContent: "center",
          alignItems: "center",
          borderRadius: ms(DESIGN.borderRadius.xs),
        },
        gridContainer: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: ms(DESIGN.spacing.sm),
          justifyContent: "flex-start",
          marginBottom: ms(DESIGN.spacing.sm),
          width: "100%",
        },
        listGroup: {
          gap: ms(DESIGN.spacing.sm),
          marginBottom: ms(DESIGN.spacing.sm),
        },
        testamentSectionHeader: {
          flexDirection: "row",
          alignItems: "center",
        },
        testamentPill: {
          paddingHorizontal: ms(DESIGN.spacing.md),
          paddingVertical: ms(DESIGN.spacing.xs),
          borderRadius: ms(DESIGN.borderRadius.full),
          justifyContent: "center",
          alignItems: "center",
        },
        testamentTitle: {
          fontWeight: "800",
          letterSpacing: 0.5,
        },
        groupLabelRow: {
          flexDirection: "row",
          alignItems: "center",
          marginVertical: ms(DESIGN.spacing.xs),
          gap: ms(DESIGN.spacing.xs),
        },
        groupLabel: {
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        groupLabelLine: {
          flex: 1,
          height: 1,
        },
      }),
    [ms, colors, DESIGN],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const scrollViewRef = React.useRef<ScrollView>(null);
  const hasScrolledRef = React.useRef(false);

  React.useEffect(() => {
    if (visible) {
      setSearchQuery("");
      hasScrolledRef.current = false;
      AsyncStorage.getItem(STORAGE_KEYS.VIEW_MODE_BOOK)
        .then((val) => {
          if (val === "list" || val === "grid") setViewMode(val);
        })
        .catch(() => {});
    }
  }, [visible]);

  const handleSetViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
    AsyncStorage.setItem(STORAGE_KEYS.VIEW_MODE_BOOK, mode).catch(() => {});
  };

  const normalize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const enrichedBooks = useMemo(
    () =>
      books.map((b) => ({
        ...b,
        name: ABBREV_TO_NAME[b.abbrev] || b.name,
      })),
    [books],
  );

  const filteredBooks = useMemo(() => {
    const query = normalize(searchQuery.trim());
    if (!query) return enrichedBooks;
    return enrichedBooks.filter(
      (item) =>
        normalize(item.name || "").includes(query) ||
        normalize(item.abbrev || "").includes(query),
    );
  }, [searchQuery, enrichedBooks]);

  const groupedSections = useMemo(() => {
    const query = normalize(searchQuery.trim());

    const buildSection = (testament: "AT" | "NT", groups: GroupEntry[]) =>
      groups
        .map((group) => {
          const filtered = group.books
            .filter((b) => {
              const realBook = enrichedBooks.find(
                (rb) => rb.abbrev === b.abbrev,
              );
              if (!realBook) return false;
              if (!query) return true;
              return (
                normalize(realBook.name || "").includes(query) ||
                normalize(realBook.abbrev || "").includes(query)
              );
            })
            .map((b) => enrichedBooks.find((rb) => rb.abbrev === b.abbrev)!)
            .filter(Boolean);
          return { testament, label: group.label, books: filtered };
        })
        .filter((g) => g.books.length > 0);

    return [
      ...buildSection("AT", bibleBooks.oldTestament as GroupEntry[]),
      ...buildSection("NT", bibleBooks.newTestament as GroupEntry[]),
    ];
  }, [searchQuery, enrichedBooks]);

  const paddingHorizontal = ms(DESIGN.spacing.lg) * 4;
  const availableWidth = width - paddingHorizontal;
  const numCols = Math.max(
    1,
    Math.floor(availableWidth / ms(DESIGN.spacing.giant)),
  );
  const itemWidth =
    (availableWidth - (numCols - 1) * ms(DESIGN.spacing.sm)) / numCols - 0.01;

  const testamentHeaderOT = (
    <View style={styles.testamentSectionHeader}>
      <View
        style={[
          styles.testamentPill,
          { backgroundColor: colors.primary + "25" },
        ]}
      >
        <BibleText
          style={[
            styles.testamentTitle,
            {
              color: colors.primary,
              fontSize: ms(DESIGN.fontSize.xs),
              fontWeight: "800",
            },
          ]}
        >
          ANTIGO TESTAMENTO
        </BibleText>
      </View>
    </View>
  );

  const testamentHeaderNT = (
    <View
      style={[
        styles.testamentSectionHeader,
        { marginTop: ms(DESIGN.layout.headerHeight) },
      ]}
    >
      <View
        style={[
          styles.testamentPill,
          { backgroundColor: colors.primary + "25" },
        ]}
      >
        <BibleText
          style={[
            styles.testamentTitle,
            {
              color: colors.primary,
              fontSize: ms(DESIGN.fontSize.xs),
              fontWeight: "800",
            },
          ]}
        >
          NOVO TESTAMENTO
        </BibleText>
      </View>
    </View>
  );

  let lastTestament: string | null = null;

  return (
    <BiblePageModal
      visible={visible}
      onClose={onClose}
      fullHeight
      header={
        <View>
          <View style={styles.header}>
            <View
              style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
            >
              {showVersionPill && versionSigla && onVersionPress ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.versionPill,
                    { backgroundColor: colors.primary + "25" },
                  ]}
                  onPress={onVersionPress}
                >
                  <BibleText
                    style={[
                      styles.versionPillText,
                      {
                        fontSize: ms(DESIGN.fontSize.md),
                        color: colors.primary,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {versionSigla}
                  </BibleText>
                  <BibleIcon
                    name="chevron-down"
                    size={ms(DESIGN.spacing.lg)}
                    color={colors.primary}
                    style={{ marginLeft: ms(DESIGN.spacing.tiny) }}
                  />
                </TouchableOpacity>
              ) : (
                <>
                  <View
                    style={[
                      styles.iconBtn,
                      styles.headerIconWrap,
                      { backgroundColor: colors.primary + "25" },
                    ]}
                  >
                    <BibleIcon
                      name="book"
                      size={ms(DESIGN.spacing.lg)}
                      color={colors.primary}
                    />
                  </View>
                  <BibleText
                    style={[
                      styles.title,
                      {
                        flex: 0,
                        flexShrink: 1,
                        fontSize: ms(DESIGN.fontSize.xl),
                        color: colors.primary,
                        fontWeight: "800",
                      },
                    ]}
                  >
                    Livros
                  </BibleText>
                </>
              )}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => setIsSearchVisible(!isSearchVisible)}
                style={[
                  styles.iconBtn,
                  styles.headerActionSpacing,
                  { backgroundColor: colors.surfaceHighlight },
                ]}
              >
                <BibleIcon
                  name="search"
                  size={ms(DESIGN.spacing.lg)}
                  color={isSearchVisible ? colors.primary : colors.onSurface}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.viewToggles,
                  { backgroundColor: colors.surfaceHighlight },
                ]}
              >
                <TouchableOpacity
                  onPress={() => handleSetViewMode("grid")}
                  style={[
                    styles.toggleBtn,
                    viewMode === "grid" && { backgroundColor: colors.surface },
                  ]}
                >
                  <BibleIcon
                    name="grid"
                    size={ms(DESIGN.spacing.lg)}
                    color={
                      viewMode === "grid" ? colors.primary : colors.onSurface
                    }
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSetViewMode("list")}
                  style={[
                    styles.toggleBtn,
                    viewMode === "list" && { backgroundColor: colors.surface },
                  ]}
                >
                  <BibleIcon
                    name="list"
                    size={ms(DESIGN.spacing.lg)}
                    color={
                      viewMode === "list" ? colors.primary : colors.onSurface
                    }
                  />
                </TouchableOpacity>
              </View>

              <BibleIcon
                name="x"
                color={colors.error}
                backgroundColor={colors.error + "20"}
                onPress={onClose}
                style={styles.headerActionSpacing}
              />
            </View>
          </View>

          {isSearchVisible && (
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                },
              ]}
              testID="bible-book-search-container"
            >
              <BibleIcon
                name="search"
                size={ms(DESIGN.spacing.lg)}
                color={colors.primary}
                style={styles.searchIcon}
              />
              <TextInput
                style={[
                  styles.searchInput,
                  { fontSize: ms(DESIGN.fontSize.md), color: colors.onSurface },
                ]}
                placeholder="Pesquisar livro..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                underlineColorAndroid="transparent"
                autoFocus={false}
              />
            </View>
          )}
        </View>
      }
      footer={
        <View style={styles.footer}>
          <BibleCountPill count={filteredBooks.length} label="livro" />
        </View>
      }
    >
      <ScrollView
        testID="bible-book-list"
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {groupedSections.map((section, sIdx) => {
          const showTestamentHeader = section.testament !== lastTestament;
          if (showTestamentHeader) lastTestament = section.testament;
          const groupHasCurrent =
            currentBookAbbrev &&
            section.books.some((b) => b.abbrev === currentBookAbbrev);

          return (
            <View
              key={`section-${sIdx}`}
              onLayout={(e) => {
                if (
                  groupHasCurrent &&
                  !hasScrolledRef.current &&
                  visible &&
                  !searchQuery
                ) {
                  hasScrolledRef.current = true;
                  const y = Math.max(
                    0,
                    e.nativeEvent.layout.y - ms(DESIGN.spacing.lg),
                  );
                  scrollViewRef.current?.scrollTo({ y, animated: false });
                }
              }}
            >
              {showTestamentHeader &&
                (section.testament === "AT"
                  ? testamentHeaderOT
                  : testamentHeaderNT)}
              <View style={styles.groupLabelRow}>
                <View
                  style={[
                    styles.groupLabelLine,
                    { backgroundColor: colors.border },
                  ]}
                />
                <BibleText
                  style={[
                    styles.groupLabel,
                    {
                      color: colors.textMuted,
                      fontSize: ms(DESIGN.fontSize.xs),
                    },
                  ]}
                >
                  {section.label.toUpperCase()}
                </BibleText>
                <View
                  style={[
                    styles.groupLabelLine,
                    { backgroundColor: colors.border },
                  ]}
                />
              </View>
              {viewMode === "list" ? (
                <View style={styles.listGroup}>
                  {section.books.map((item, index) => {
                    const isSelected = item.abbrev === currentBookAbbrev;
                    return (
                      <BibleListCard
                        key={`${item.abbrev || item.name}-${index}`}
                        title={item.name}
                        pillText={item.abbrev}
                        isSelected={isSelected}
                        onPress={() => {
                          onSelect(item.abbrev || item.name);
                          setSearchQuery("");
                        }}
                      />
                    );
                  })}
                </View>
              ) : (
                <View style={styles.gridContainer}>
                  {section.books.map((item, index) => {
                    const isSelected = item.abbrev === currentBookAbbrev;
                    return (
                      <BibleGridBlock
                        key={`grid-${item.abbrev || item.name}-${index}`}
                        title={item.abbrev || item.name.substring(0, 3)}
                        exactWidth={itemWidth}
                        isSelected={isSelected}
                        onPress={() => {
                          onSelect(item.abbrev || item.name);
                          setSearchQuery("");
                        }}
                      />
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </BiblePageModal>
  );
}
