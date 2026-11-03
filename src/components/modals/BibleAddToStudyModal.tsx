import { FlashList } from "@shopify/flash-list";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LIMITS } from "../../constants/limits";
import { ROUTES } from "../../constants/routes";
import { useResponsive } from "../../hooks/useResponsive";
import { canStoreStudyData, useStudies } from "../../hooks/useStudies";
import { ToastAction } from "../../hooks/useToast";
import { useTheme } from "../../hooks/useTheme";
import { SelectedVerse } from "../../models";
import { formatVerseRanges } from "../../utils/verseRange";
import { BibleIcon } from "../BibleIcon";
import { BiblePageEmpty } from "../BiblePageEmpty";
import { BibleText } from "../BibleText";
import { BiblePageModal } from "./BiblePageModal";

type BibleAddToStudyModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedVerses: SelectedVerse[];
  customHtml?: string;
  suggestedTitle?: string;
  onShowToast?: (
    msg: string,
    type?: "success" | "info" | "warning",
    action?: ToastAction,
  ) => void;
};

const STORAGE_FULL_MESSAGE =
  "Sem espaço para este conteúdo. Remova imagens de estudos antigos.";

export function BibleAddToStudyModal({
  visible,
  onClose,
  selectedVerses,
  customHtml,
  suggestedTitle,
  onShowToast,
}: BibleAddToStudyModalProps) {
  const router = useRouter();
  const { studies, appendToStudy, createStudy, reloadFromStorage } =
    useStudies();

  const goToStudyAction = (studyId: string): ToastAction => ({
    label: "Ir para o estudo",
    onPress: () =>
      router.navigate({
        pathname: ROUTES.STUDY_EDITOR(studyId),
        params: { scrollToEnd: "1" },
      } as any),
  });
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        header: { flexDirection: "row", alignItems: "center" },
        headerIconWrap: { marginRight: ms(DESIGN.spacing.sm) },
        title: { flex: 1 },
        createBtn: {
          paddingVertical: ms(DESIGN.spacing.lg),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
        },
        createText: { fontWeight: "700" },
        studyItem: {
          borderWidth: 1,
          marginBottom: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.lg),
          overflow: "hidden",
          elevation: 1,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: ms(DESIGN.borderRadius.xs),
        },
        studyItemContent: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: ms(DESIGN.spacing.sm),
          paddingVertical: ms(DESIGN.spacing.sm),
          gap: ms(DESIGN.spacing.md),
        },
        empty: { padding: ms(DESIGN.spacing.giant), alignItems: "center" },
        input: {
          borderRadius: ms(DESIGN.borderRadius.md),
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingVertical: ms(DESIGN.spacing.lg),
          marginBottom: ms(DESIGN.spacing.sm),
        },
        inputMultiline: {
          minHeight: ms(DESIGN.layout.settingsIconOffset),
          textAlignVertical: "top",
        },
        createActions: { flexDirection: "row", gap: ms(DESIGN.spacing.md) },
        cancelBtn: {
          flex: 1,
          paddingVertical: ms(DESIGN.spacing.lg),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
        },
        cancelText: { fontWeight: "700" },
        sectionTitle: {
          fontSize: ms(DESIGN.fontSize.xs),
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 1,
          opacity: 0.6,
          paddingBottom: ms(DESIGN.spacing.sm),
        },
      }),
    [ms, colors, DESIGN],
  );

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const defaultTitle =
    suggestedTitle ??
    (selectedVerses.length > 0
      ? `${selectedVerses[0].bookName} ${selectedVerses[0].chapter}:${formatVerseRanges(selectedVerses).ranges}`
      : "");

  React.useEffect(() => {
    if (visible) {
      setIsCreating(false);
      setNewTitle(defaultTitle);
      reloadFromStorage();
    }
  }, [visible, defaultTitle]);

  const buildVersesHtml = () => {
    if (customHtml) return customHtml;
    if (selectedVerses.length === 0) return "";
    const sorted = [...selectedVerses].sort((a, b) =>
      a.chapter !== b.chapter ? a.chapter - b.chapter : a.verse - b.verse,
    );

    const bookName = sorted[0].bookName;
    const chapter = sorted[0].chapter;

    const { ranges, sameChapter } = formatVerseRanges(sorted);
    let ref = sameChapter
      ? `${bookName} ${chapter}:${ranges}`
      : `${bookName} ${ranges}`;

    const version = sorted[0].version;

    const versesBody = sorted
      .map(
        (v) =>
          `<div class="verse-line"><span class="verse-num">${v.verse}</span> <span class="verse-text">${v.text}</span></div>`,
      )
      .join("");

    const hasCompare = sorted.some((v) => v.compareText);
    if (hasCompare) {
      const compareVersion =
        sorted.find((v) => v.compareVersion)?.compareVersion || "";
      const compareVersesBody = sorted
        .map((v) => {
          if (!v.compareText) return "";
          return `<div class="verse-line"><span class="verse-num">${v.verse}</span> <span class="verse-text">${v.compareText}</span></div>`;
        })
        .join("");

      const refPrimary = `${ref} (${version})`;
      const refCompare = `${ref} (${compareVersion})`;

      return `<blockquote class="bible-verse" contenteditable="false"><div class="remove-verse-btn" contenteditable="false">×</div><div class="verse-title">${refPrimary}</div>${versesBody}</blockquote><blockquote class="bible-verse" contenteditable="false"><div class="remove-verse-btn" contenteditable="false">×</div><div class="verse-title">${refCompare}</div>${compareVersesBody}</blockquote><p><br></p>`;
    }

    ref = `${ref} (${version})`;
    return `<blockquote class="bible-verse" contenteditable="false"><div class="remove-verse-btn" contenteditable="false">×</div><div class="verse-title">${ref}</div>${versesBody}</blockquote><p><br></p>`;
  };

  const handleAddToStudy = async (studyId: string) => {
    const html = buildVersesHtml();
    const isSaved = await appendToStudy(studyId, html);
    if (!isSaved) {
      onShowToast?.(STORAGE_FULL_MESSAGE, "warning");
      onClose();
      return;
    }
    onShowToast?.(
      customHtml ? "Adicionado ao estudo" : "Versículos adicionados ao estudo",
      "success",
      goToStudyAction(studyId),
    );
    onClose();
  };

  const handleCreateAndAdd = async () => {
    if (!newTitle.trim()) return;
    const html = buildVersesHtml();
    if (!(await canStoreStudyData(html.length))) {
      onShowToast?.(STORAGE_FULL_MESSAGE, "warning");
      onClose();
      return;
    }
    const studyId = createStudy(newTitle.trim(), html);
    onShowToast?.(
      customHtml
        ? "Estudo criado com o conteúdo"
        : "Estudo criado com os versículos",
      "success",
      goToStudyAction(studyId),
    );
    setIsCreating(false);
    setNewTitle("");
    onClose();
  };

  return (
    <BiblePageModal
      visible={visible}
      onClose={onClose}
      fullHeight={!isCreating}
      header={
        <View style={styles.header}>
          <BibleIcon
            name={isCreating ? "arrow-left" : "file-plus"}
            size={ms(DESIGN.spacing.lg)}
            color={colors.primary}
            backgroundColor={colors.primary + "25"}
            style={styles.headerIconWrap}
            onPress={isCreating ? () => setIsCreating(false) : undefined}
          />
          <BibleText
            style={[
              styles.title,
              {
                color: colors.primary,
                fontSize: ms(DESIGN.spacing.lg),
                fontWeight: "800",
              },
            ]}
          >
            {isCreating ? "Novo Estudo" : "Adicionar ao Estudo"}
          </BibleText>
          <BibleIcon
            name="x"
            color={colors.error}
            backgroundColor={colors.error + "20"}
            onPress={onClose}
            style={{ marginLeft: "auto" }}
          />
        </View>
      }
      footer={
        isCreating ? (
          <View style={styles.createActions}>
            <TouchableOpacity
              style={[
                styles.createBtn,
                { backgroundColor: colors.primary, flex: 1.5 },
              ]}
              onPress={handleCreateAndAdd}
            >
              <BibleText
                style={[
                  styles.createText,
                  { color: colors.onPrimary, fontSize: ms(DESIGN.spacing.lg) },
                ]}
              >
                Criar e Adicionar
              </BibleText>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => setIsCreating(true)}
          >
            <BibleText
              style={[
                styles.createText,
                { color: colors.onPrimary, fontSize: ms(DESIGN.spacing.lg) },
              ]}
            >
              Criar Novo Estudo
            </BibleText>
          </TouchableOpacity>
        )
      }
    >
      <View
        style={[
          isCreating ? undefined : styles.container,
          { padding: ms(DESIGN.spacing.lg) },
        ]}
      >
        {isCreating ? (
          <ScrollView keyboardShouldPersistTaps="handled">
            <BibleText
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              Título do Estudo
            </BibleText>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.onSurface,
                  backgroundColor: colors.surfaceHighlight,
                },
                Platform.select({
                  web: { outline: "none" } as any,
                  default: {},
                }),
              ]}
              placeholder="Ex: Esperança em Meio à Provação"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus={false}
              maxLength={LIMITS.STUDY_TITLE_MAX_LENGTH}
              underlineColorAndroid="transparent"
            />
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            <FlashList
              data={studies}
              keyExtractor={(item) => item.id}
              // @ts-ignore
              estimatedItemSize={ms(DESIGN.layout.settingsIconOffset)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: ms(DESIGN.spacing.md) }}
              ListEmptyComponent={
                <BiblePageEmpty
                  title="Nenhum estudo ainda"
                  description="Você ainda não tem estudos para adicionar os versículos selecionados."
                  icon="book"
                />
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.studyItem,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                    },
                  ]}
                  onPress={() => handleAddToStudy(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.studyItemContent}>
                    <BibleIcon
                      name="book-open"
                      color={colors.primary}
                      backgroundColor={colors.primary + "20"}
                    />
                    <View style={{ flex: 1, gap: ms(DESIGN.spacing.xs) }}>
                      <BibleText
                        style={{
                          color: colors.onSurface,
                          fontWeight: "600",
                          fontSize: ms(DESIGN.fontSize.lg),
                        }}
                        numberOfLines={1}
                      >
                        {item.title}
                      </BibleText>
                      <BibleText
                        style={{
                          color: colors.textMuted,
                          fontSize: ms(DESIGN.fontSize.md),
                        }}
                      >
                        {item.createdAt}
                      </BibleText>
                    </View>
                    <BibleIcon
                      name="chevron-right"
                      color={colors.textMuted}
                      size={ms(DESIGN.fontSize.xl)}
                    />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </View>
    </BiblePageModal>
  );
}
