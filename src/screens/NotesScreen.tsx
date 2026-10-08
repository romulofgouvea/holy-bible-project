import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { BibleDrawerMenu } from "../components/BibleDrawerMenu";
import { BibleHeader } from "../components/BibleHeader";
import { BibleIcon } from "../components/BibleIcon";
import { BiblePageEmpty } from "../components/BiblePageEmpty";
import { BibleText } from "../components/BibleText";
import { BibleConfirmModal } from "../components/modals/BibleConfirmModal";
import { BibleNoteModal } from "../components/modals/BibleNoteModal";
import { DonateModal } from "../components/modals/DonateModal";
import { VERSE_HIGHLIGHTS } from "../constants/colors";
import { ROUTES } from "../constants/routes";
import { getBibleData } from "../data/bible-version";
import { useBible } from "../hooks/useBible";
import { useNotes } from "../hooks/useNotes";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { SelectedVerse, VerseNote } from "../models";
import { formatVerseRanges } from "../utils/verseRange";

type NotesTab = "text" | "colors";

type HighlightGroup = {
  id: string;
  color: string;
  abbrev: string;
  bookName: string;
  chapter: number;
  verses: number[];
  text: string;
};

export default function NotesScreen() {
  const router = useRouter();
  const { version, navigateTo, highlights, bulkToggleHighlight } = useBible();
  const { notes, deleteNote } = useNotes();
  const { colors } = useTheme();
  const { ms, DESIGN } = useResponsive();

  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDonateVisible, setIsDonateVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedNoteVerses, setSelectedNoteVerses] = useState<SelectedVerse[]>(
    [],
  );

  const [activeTab, setActiveTab] = useState<NotesTab>("text");
  const [colorFilter, setColorFilter] = useState<string | null>(null);

  const [activeNote, setActiveNote] = useState<VerseNote | null>(null);
  const [isConfirmDeleteVisible, setIsConfirmDeleteVisible] = useState(false);

  const [activeHighlight, setActiveHighlight] = useState<HighlightGroup | null>(
    null,
  );
  const [isConfirmRemoveHighlight, setIsConfirmRemoveHighlight] =
    useState(false);

  const versionBooks = useMemo(() => getBibleData(version), [version]);

  const validNotes = useMemo(() => {
    return notes.filter(
      (n) => n && n.selectedVerses && n.selectedVerses.length > 0,
    );
  }, [notes]);

  const highlightGroups = useMemo<HighlightGroup[]>(() => {
    const bookOrder = new Map(versionBooks.map((b, i) => [b.abbrev, i]));
    const items = Object.values(highlights)
      .slice()
      .sort((a, b) => {
        const bo =
          (bookOrder.get(a.abbrev) ?? Number.MAX_SAFE_INTEGER) -
          (bookOrder.get(b.abbrev) ?? Number.MAX_SAFE_INTEGER);
        if (bo !== 0) return bo;
        if (a.chapter !== b.chapter) return a.chapter - b.chapter;
        return a.verse - b.verse;
      });

    const groups: HighlightGroup[] = [];
    for (const item of items) {
      const book = versionBooks.find((b) => b.abbrev === item.abbrev);
      const verseText =
        book?.chapters[item.chapter - 1]?.[item.verse - 1] || "";
      const last = groups[groups.length - 1];
      if (
        last &&
        last.color === item.color &&
        last.abbrev === item.abbrev &&
        last.chapter === item.chapter &&
        item.verse === last.verses[last.verses.length - 1] + 1
      ) {
        last.verses.push(item.verse);
        last.text = verseText ? `${last.text} ${verseText}` : last.text;
      } else {
        groups.push({
          id: `${item.color}-${item.abbrev}-${item.chapter}-${item.verse}`,
          color: item.color,
          abbrev: item.abbrev,
          bookName: book?.name || item.abbrev,
          chapter: item.chapter,
          verses: [item.verse],
          text: verseText,
        });
      }
    }
    return groups;
  }, [highlights, versionBooks]);

  const presentColors = useMemo(() => {
    const set = new Set(highlightGroups.map((g) => g.color));
    return VERSE_HIGHLIGHTS.filter((c) => set.has(c.id));
  }, [highlightGroups]);

  const effectiveColorFilter =
    colorFilter && presentColors.some((c) => c.id === colorFilter)
      ? colorFilter
      : null;

  const filteredHighlightGroups = useMemo(() => {
    if (!effectiveColorFilter) return highlightGroups;
    return highlightGroups.filter((g) => g.color === effectiveColorFilter);
  }, [highlightGroups, effectiveColorFilter]);

  const getColorHex = (id: string) =>
    VERSE_HIGHLIGHTS.find((c) => c.id === id)?.hex || colors.primary;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        listContent: { padding: ms(DESIGN.spacing.lg) },
        tabRow: {
          flexDirection: "row",
          marginHorizontal: ms(DESIGN.spacing.lg),
          marginTop: ms(DESIGN.spacing.md),
          height: ms(DESIGN.height.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          overflow: "hidden",
        },
        tabBtn: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: ms(DESIGN.spacing.xs),
        },
        tabText: {
          fontWeight: "800",
          fontSize: ms(DESIGN.fontSize.sm),
        },
        filterRow: {
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingTop: ms(DESIGN.spacing.md),
          gap: ms(DESIGN.spacing.sm),
          flexDirection: "row",
          alignItems: "center",
        },
        filterChip: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.xs),
          paddingHorizontal: ms(DESIGN.spacing.md),
          paddingVertical: ms(DESIGN.spacing.xs),
          borderRadius: ms(DESIGN.borderRadius.full),
          borderWidth: 1,
        },
        filterChipText: {
          fontWeight: "700",
          fontSize: ms(DESIGN.fontSize.sm),
        },
        colorDot: {
          width: ms(DESIGN.spacing.md),
          height: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.full),
        },
        tabContent: {
          flex: 1,
        },
        filterScroll: {
          flexGrow: 0,
          flexShrink: 0,
        },
        card: {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: ms(DESIGN.borderRadius.md),
          padding: ms(DESIGN.spacing.md),
          marginBottom: ms(DESIGN.spacing.md),
        },
        highlightCard: {
          borderLeftWidth: ms(DESIGN.spacing.xs),
        },
        cardHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        },
        refBadge: {
          backgroundColor: colors.primary + "15",
          paddingHorizontal: ms(DESIGN.spacing.sm),
          paddingVertical: ms(DESIGN.spacing.tiny),
          borderRadius: ms(DESIGN.borderRadius.xs),
        },
        refText: {
          color: colors.primary,
          fontWeight: "800",
          fontSize: ms(DESIGN.fontSize.sm),
        },
        verseText: {
          color: colors.textMuted,
          fontSize: ms(DESIGN.fontSize.sm),
          fontStyle: "italic",
          marginBottom: ms(DESIGN.spacing.xs),
        },
        highlightVerseText: {
          color: colors.onSurface,
          fontSize: ms(DESIGN.fontSize.md),
          lineHeight: ms(DESIGN.fontSize.xl),
          fontStyle: "normal",
          marginBottom: 0,
        },
        noteText: {
          color: colors.onSurface,
          fontSize: ms(DESIGN.fontSize.md),
          lineHeight: ms(DESIGN.fontSize.xl),
          marginTop: ms(DESIGN.spacing.sm),
        },
        actionsRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.xs),
          marginRight: ms(-DESIGN.spacing.xs),
        },
        actionButton: {
          padding: ms(DESIGN.spacing.xs),
        },
        tabEmpty: {
          alignItems: "center",
          justifyContent: "center",
          paddingTop: ms(DESIGN.layout.emptyPaddingTop),
          paddingHorizontal: ms(DESIGN.spacing.xl),
          gap: ms(DESIGN.spacing.sm),
        },
        tabEmptyText: {
          color: colors.textMuted,
          fontSize: ms(DESIGN.fontSize.md),
          textAlign: "center",
        },
      }),
    [colors, ms, DESIGN],
  );

  const handleEditNote = (item: VerseNote) => {
    const book = versionBooks.find(
      (b) => b.abbrev === item.selectedVerses[0].bookAbbrev,
    );
    const bookName = book?.name || item.selectedVerses[0].bookAbbrev;

    const verses: SelectedVerse[] = item.selectedVerses.map((v) => {
      const verseText = book?.chapters[v.chapter - 1]?.[v.verse - 1] || "";
      return {
        ...v,
        bookName,
        text: verseText,
        version: version,
      };
    });

    setSelectedNoteVerses(verses);
    setNoteModalVisible(true);
  };

  const handleRequestDeleteNote = (item: VerseNote) => {
    setActiveNote(item);
    setIsConfirmDeleteVisible(true);
  };

  const handleRequestRemoveHighlight = (group: HighlightGroup) => {
    setActiveHighlight(group);
    setIsConfirmRemoveHighlight(true);
  };

  const handleReadNote = (item: VerseNote) => {
    if (!item.selectedVerses.length) return;
    const firstVerse = item.selectedVerses[0];
    navigateTo({
      book: firstVerse.bookAbbrev,
      chapter: firstVerse.chapter,
      verse: firstVerse.verse,
    });
    router.navigate(ROUTES.BIBLE as any);
  };

  const handleReadHighlight = (group: HighlightGroup) => {
    navigateTo({
      book: group.abbrev,
      chapter: group.chapter,
      verse: group.verses[0],
    });
    router.navigate(ROUTES.BIBLE as any);
  };

  const renderNote = ({ item }: { item: VerseNote }) => {
    if (!item.selectedVerses || item.selectedVerses.length === 0) {
      return null;
    }
    const firstVerseInfo = item.selectedVerses[0];
    const book = versionBooks.find(
      (b) => b.abbrev === firstVerseInfo.bookAbbrev,
    );
    const bookName = book?.name || firstVerseInfo.bookAbbrev;
    const dateStr = new Date(item.updatedAt).toLocaleDateString("pt-BR");

    const { ranges } = formatVerseRanges(
      item.selectedVerses as SelectedVerse[],
    );

    const firstVerseText =
      book?.chapters[firstVerseInfo.chapter - 1]?.[firstVerseInfo.verse - 1] ||
      "";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => handleReadNote(item)}
      >
        <View style={styles.cardHeader}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: ms(DESIGN.spacing.sm),
            }}
          >
            <View style={styles.refBadge}>
              <BibleText style={styles.refText}>
                {bookName} {firstVerseInfo.chapter}:{ranges}
              </BibleText>
            </View>
            <BibleText
              style={{
                color: colors.textMuted,
                fontSize: ms(DESIGN.fontSize.xs),
              }}
            >
              {dateStr}
            </BibleText>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditNote(item)}
            >
              <BibleIcon
                name="edit-2"
                color={colors.primary}
                size={ms(DESIGN.icon.sm)}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRequestDeleteNote(item)}
            >
              <BibleIcon
                name="trash-2"
                color={colors.error}
                size={ms(DESIGN.icon.sm)}
              />
            </TouchableOpacity>
          </View>
        </View>

        {firstVerseText ? (
          <BibleText style={styles.verseText} numberOfLines={2}>
            {`"${firstVerseText}"`}
          </BibleText>
        ) : null}

        <BibleText style={styles.noteText}>{item.text}</BibleText>
      </TouchableOpacity>
    );
  };

  const renderHighlight = ({ item }: { item: HighlightGroup }) => {
    const { ranges } = formatVerseRanges(item.verses);
    const hex = getColorHex(item.color);

    return (
      <TouchableOpacity
        style={[styles.card, styles.highlightCard, { borderLeftColor: hex }]}
        activeOpacity={0.8}
        onPress={() => handleReadHighlight(item)}
      >
        <View style={styles.cardHeader}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: ms(DESIGN.spacing.sm),
            }}
          >
            <View style={[styles.colorDot, { backgroundColor: hex }]} />
            <View style={styles.refBadge}>
              <BibleText style={styles.refText}>
                {item.bookName} {item.chapter}:{ranges}
              </BibleText>
            </View>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleRequestRemoveHighlight(item)}
            >
              <BibleIcon
                name="trash-2"
                color={colors.error}
                size={ms(DESIGN.icon.sm)}
              />
            </TouchableOpacity>
          </View>
        </View>

        {item.text ? (
          <BibleText
            style={[styles.verseText, styles.highlightVerseText]}
            numberOfLines={4}
          >
            {item.text}
          </BibleText>
        ) : null}
      </TouchableOpacity>
    );
  };

  const hasAnything = validNotes.length > 0 || highlightGroups.length > 0;

  return (
    <View style={styles.container}>
      <BibleHeader
        title="Anotações"
        showMenu={true}
        onMenuPress={() => setIsDrawerVisible(true)}
      />

      {!hasAnything ? (
        <BiblePageEmpty
          title="Anotações"
          description="Você ainda não possui nenhuma anotação. Para criar uma, selecione um ou mais versículos na tela de leitura."
          icon="file-text"
          actionLabel="Ir para a Bíblia"
          onAction={() => router.navigate(ROUTES.BIBLE as any)}
        />
      ) : (
        <>
          <View style={styles.tabRow}>
            {(
              [
                { key: "text", label: "Texto", icon: "file-text" },
                { key: "colors", label: "Cores", icon: "bookmark" },
              ] as { key: NotesTab; label: string; icon: any }[]
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabBtn,
                    isActive && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <BibleIcon
                    name={tab.icon}
                    size={ms(DESIGN.fontSize.lg)}
                    color={isActive ? colors.onPrimary : colors.textMuted}
                  />
                  <BibleText
                    style={[
                      styles.tabText,
                      { color: isActive ? colors.onPrimary : colors.textMuted },
                    ]}
                  >
                    {tab.label}
                  </BibleText>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.tabContent}>
            {activeTab === "text" ? (
              validNotes.length === 0 ? (
                <View style={styles.tabEmpty}>
                  <BibleIcon
                    name="file-text"
                    size={ms(DESIGN.icon.lg)}
                    color={colors.textMuted}
                  />
                  <BibleText style={styles.tabEmptyText}>
                    Nenhuma anotação de texto. Selecione versículos na leitura e
                    toque em Anotar.
                  </BibleText>
                </View>
              ) : (
                <FlashList
                  data={validNotes}
                  keyExtractor={(item) => item.id}
                  renderItem={renderNote}
                  // @ts-ignore
                  estimatedItemSize={ms(180)}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )
            ) : highlightGroups.length === 0 ? (
              <View style={styles.tabEmpty}>
                <BibleIcon
                  name="bookmark"
                  size={ms(DESIGN.icon.lg)}
                  color={colors.textMuted}
                />
                <BibleText style={styles.tabEmptyText}>
                  Nenhum versículo marcado com cor. Selecione versículos na
                  leitura e escolha uma cor.
                </BibleText>
              </View>
            ) : (
              <>
                {presentColors.length > 1 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterScroll}
                    contentContainerStyle={styles.filterRow}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        {
                          borderColor: !effectiveColorFilter
                            ? colors.primary
                            : colors.border,
                          backgroundColor: !effectiveColorFilter
                            ? colors.primary + "15"
                            : colors.surface,
                        },
                      ]}
                      onPress={() => setColorFilter(null)}
                      activeOpacity={0.8}
                    >
                      <BibleText
                        style={[
                          styles.filterChipText,
                          {
                            color: !effectiveColorFilter
                              ? colors.primary
                              : colors.textMuted,
                          },
                        ]}
                      >
                        Todas
                      </BibleText>
                    </TouchableOpacity>
                    {presentColors.map((c) => {
                      const isActive = effectiveColorFilter === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.filterChip,
                            {
                              borderColor: isActive
                                ? colors.primary
                                : colors.border,
                              backgroundColor: isActive
                                ? colors.primary + "15"
                                : colors.surface,
                            },
                          ]}
                          onPress={() => setColorFilter(c.id)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.colorDot,
                              { backgroundColor: c.hex },
                            ]}
                          />
                          <BibleText
                            style={[
                              styles.filterChipText,
                              {
                                color: isActive
                                  ? colors.primary
                                  : colors.textMuted,
                              },
                            ]}
                          >
                            {c.label}
                          </BibleText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                ) : null}

                <View style={styles.tabContent}>
                  <FlashList
                    data={filteredHighlightGroups}
                    keyExtractor={(item) => item.id}
                    renderItem={renderHighlight}
                    // @ts-ignore
                    estimatedItemSize={ms(140)}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </>
            )}
          </View>
        </>
      )}

      <BibleDrawerMenu
        visible={isDrawerVisible}
        activeItem="notes"
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

      <BibleNoteModal
        visible={noteModalVisible}
        onClose={() => setNoteModalVisible(false)}
        selectedVerses={selectedNoteVerses}
      />

      <BibleConfirmModal
        visible={isConfirmDeleteVisible}
        title="Excluir anotação"
        message="Tem certeza que deseja excluir esta anotação? Esta ação não pode ser desfeita."
        isDanger={true}
        confirmText="Excluir"
        onCancel={() => setIsConfirmDeleteVisible(false)}
        onConfirm={() => {
          if (activeNote) {
            deleteNote(activeNote.id);
          }
          setIsConfirmDeleteVisible(false);
        }}
      />

      <BibleConfirmModal
        visible={isConfirmRemoveHighlight}
        title="Remover marcação"
        message="Deseja remover a marcação de cor destes versículos?"
        isDanger={true}
        confirmText="Remover"
        onCancel={() => setIsConfirmRemoveHighlight(false)}
        onConfirm={() => {
          if (activeHighlight) {
            bulkToggleHighlight(
              activeHighlight.verses.map((v) => ({
                bookAbbrev: activeHighlight.abbrev,
                chapter: activeHighlight.chapter,
                verse: v,
              })),
              null,
            );
          }
          setIsConfirmRemoveHighlight(false);
          setActiveHighlight(null);
        }}
      />
    </View>
  );
}
