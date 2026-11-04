import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BibleDrawerMenu } from "../components/BibleDrawerMenu";
import { BibleHeader } from "../components/BibleHeader";
import { BibleIcon } from "../components/BibleIcon";
import { BiblePageEmpty } from "../components/BiblePageEmpty";
import { BibleSkeleton } from "../components/BibleSkeleton";
import { BibleText } from "../components/BibleText";
import { BibleConfirmModal } from "../components/modals/BibleConfirmModal";
import { BiblePageModal } from "../components/modals/BiblePageModal";
import { DonateModal } from "../components/modals/DonateModal";
import { LIMITS } from "../constants/limits";
import { ROUTES, ROUTE_LABELS } from "../constants/routes";
import { getBibleData } from "../data/bible-version";
import { useBible } from "../hooks/useBible";
import { getCollectionVerseKey, useCollections } from "../hooks/useCollections";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { VerseReference } from "../models";
import { impactLight } from "../utils/haptics";

const getVerseText = (v: VerseReference) =>
  getBibleData(v.version).find(
    (b) => b.abbrev.toLowerCase() === v.bookAbbrev.toLowerCase(),
  )?.chapters[v.chapter - 1]?.[v.verse - 1] ?? "";

export default function CollectionsScreen() {
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const router = useRouter();
  const { navigateTo } = useBible();
  const {
    collections,
    isLoaded,
    createCollection,
    removeVerse,
    deleteCollection,
  } = useCollections();

  const [openId, setOpenId] = useState<string | null>(null);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isDeleteVisible, setIsDeleteVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDonateVisible, setIsDonateVisible] = useState(false);
  const [newName, setNewName] = useState("");

  const open = collections.find((c) => c.id === openId) ?? null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        listContent: {
          padding: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.layout.listPaddingBottom),
          flexGrow: 1,
        },
        card: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.md),
          padding: ms(DESIGN.spacing.md),
          marginBottom: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.lg),
          borderWidth: 1,
        },
        cardBody: { flex: 1, gap: ms(DESIGN.spacing.xs) },
        createBtn: {
          paddingVertical: ms(DESIGN.spacing.lg),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
        },
        input: {
          borderRadius: ms(DESIGN.borderRadius.md),
          padding: ms(DESIGN.spacing.lg),
          margin: ms(DESIGN.spacing.lg),
        },
        modalHeader: { flexDirection: "row", alignItems: "center" },
      }),
    [ms, DESIGN],
  );

  const handleCreate = () => {
    if (!newName.trim()) return;
    Keyboard.dismiss();
    createCollection(newName);
    setNewName("");
    setIsCreateVisible(false);
  };

  const handleOpenVerse = (v: VerseReference) => {
    impactLight();
    navigateTo({
      version: v.version,
      book: v.bookAbbrev,
      chapter: v.chapter,
      verse: v.verse,
    });
    router.navigate(ROUTES.BIBLE as any);
  };

  const handleDelete = () => {
    if (open) deleteCollection(open.id);
    setIsDeleteVisible(false);
    setOpenId(null);
  };

  if (!isLoaded) return <BibleSkeleton />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {open ? (
        <BibleHeader
          title={open.name}
          showMenu={false}
          showBack
          onBack={() => setOpenId(null)}
          rightContent={
            <BibleIcon
              name="trash-2"
              color={colors.onPrimary}
              onPress={() => setIsDeleteVisible(true)}
            />
          }
        />
      ) : (
        <BibleHeader
          title={ROUTE_LABELS[ROUTES.COLLECTIONS]}
          onMenuPress={() => setIsDrawerVisible(true)}
          rightContent={
            <BibleIcon
              name="plus"
              color={colors.onPrimary}
              onPress={() => setIsCreateVisible(true)}
            />
          }
        />
      )}

      {open ? (
        <FlashList
          data={open.verses}
          keyExtractor={getCollectionVerseKey}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <BiblePageEmpty
              title="Coleção vazia"
              description="Selecione versículos na leitura e toque no marcador para adicioná-los aqui."
              icon="bookmark"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => handleOpenVerse(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardBody}>
                <BibleText
                  style={{
                    color: colors.primary,
                    fontWeight: "700",
                    fontSize: ms(DESIGN.fontSize.lg),
                  }}
                >
                  {`${item.bookName} ${item.chapter}:${item.verse} (${item.version})`}
                </BibleText>
                <BibleText
                  numberOfLines={3}
                  style={{
                    color: colors.onSurface,
                    fontSize: ms(DESIGN.fontSize.md),
                  }}
                >
                  {getVerseText(item)}
                </BibleText>
              </View>
              <BibleIcon
                name="x"
                color={colors.error}
                backgroundColor={colors.error + "20"}
                onPress={() => removeVerse(open.id, item)}
              />
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlashList
          data={collections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <BiblePageEmpty
              title="Nenhuma coleção"
              description="Agrupe versículos por tema, como Promessas ou Ansiedade."
              icon="bookmark"
              actionLabel="Nova coleção"
              onAction={() => setIsCreateVisible(true)}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setOpenId(item.id)}
              activeOpacity={0.7}
            >
              <BibleIcon
                name="bookmark"
                color={colors.primary}
                backgroundColor={colors.primary + "20"}
              />
              <View style={styles.cardBody}>
                <BibleText
                  numberOfLines={1}
                  style={{
                    color: colors.onSurface,
                    fontWeight: "600",
                    fontSize: ms(DESIGN.fontSize.lg),
                  }}
                >
                  {item.name}
                </BibleText>
                <BibleText
                  style={{
                    color: colors.textMuted,
                    fontSize: ms(DESIGN.fontSize.md),
                  }}
                >
                  {`${item.verses.length} versículo${item.verses.length === 1 ? "" : "s"}`}
                </BibleText>
              </View>
              <BibleIcon name="chevron-right" color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      <BiblePageModal
        visible={isCreateVisible}
        onClose={() => setIsCreateVisible(false)}
        header={
          <View style={styles.modalHeader}>
            <BibleText
              style={{
                flex: 1,
                color: colors.primary,
                fontSize: ms(DESIGN.spacing.lg),
                fontWeight: "800",
              }}
            >
              Nova Coleção
            </BibleText>
            <BibleIcon
              name="x"
              color={colors.error}
              backgroundColor={colors.error + "20"}
              onPress={() => setIsCreateVisible(false)}
            />
          </View>
        }
        footer={
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={handleCreate}
          >
            <BibleText
              style={{
                color: colors.onPrimary,
                fontWeight: "700",
                fontSize: ms(DESIGN.spacing.lg),
              }}
            >
              Criar
            </BibleText>
          </TouchableOpacity>
        }
      >
        <TextInput
          style={[
            styles.input,
            {
              color: colors.onSurface,
              backgroundColor: colors.surfaceHighlight,
            },
            Platform.select({ web: { outline: "none" } as any, default: {} }),
          ]}
          placeholder="Ex: Promessas"
          placeholderTextColor={colors.textMuted}
          value={newName}
          onChangeText={setNewName}
          maxLength={LIMITS.STUDY_TITLE_MAX_LENGTH}
          underlineColorAndroid="transparent"
        />
      </BiblePageModal>

      <BibleConfirmModal
        visible={isDeleteVisible}
        title="Excluir coleção"
        message="Os versículos continuam na Bíblia; apenas a coleção será removida."
        confirmText="Excluir"
        isDanger
        onCancel={() => setIsDeleteVisible(false)}
        onConfirm={handleDelete}
      />

      <BibleDrawerMenu
        visible={isDrawerVisible}
        activeItem="collections"
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
