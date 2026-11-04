import React, { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LIMITS } from "../../constants/limits";
import { useCollections } from "../../hooks/useCollections";
import { useResponsive } from "../../hooks/useResponsive";
import { ToastAction } from "../../hooks/useToast";
import { useTheme } from "../../hooks/useTheme";
import { SelectedVerse, VerseReference } from "../../models";
import { BibleIcon } from "../BibleIcon";
import { BiblePageEmpty } from "../BiblePageEmpty";
import { BibleText } from "../BibleText";
import { BiblePageModal } from "./BiblePageModal";

type BibleAddToCollectionModalProps = {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  selectedVerses: SelectedVerse[];
  onShowToast?: (
    msg: string,
    type?: "success" | "info" | "warning",
    action?: ToastAction,
  ) => void;
};

const toReference = ({
  version,
  bookAbbrev,
  bookName,
  chapter,
  verse,
}: SelectedVerse): VerseReference => ({
  version,
  bookAbbrev,
  bookName,
  chapter,
  verse,
});

export function BibleAddToCollectionModal({
  visible,
  onClose,
  onDismiss,
  selectedVerses,
  onShowToast,
}: BibleAddToCollectionModalProps) {
  const handleDismiss = onDismiss ?? onClose;
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const { collections, createCollection, addVerses, reloadFromStorage } =
    useCollections();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (visible) {
      setIsCreating(false);
      setNewName("");
      reloadFromStorage();
    }
  }, [visible, reloadFromStorage]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: { flexDirection: "row", alignItems: "center" },
        body: { padding: ms(DESIGN.spacing.lg) },
        item: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.md),
          padding: ms(DESIGN.spacing.sm),
          marginBottom: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.lg),
          borderWidth: 1,
        },
        button: {
          paddingVertical: ms(DESIGN.spacing.lg),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
        },
        input: {
          borderRadius: ms(DESIGN.borderRadius.md),
          padding: ms(DESIGN.spacing.lg),
        },
      }),
    [ms, DESIGN],
  );

  const verses = selectedVerses.map(toReference);

  const handleAdd = (id: string, name: string) => {
    addVerses(id, verses);
    onShowToast?.(`Adicionado a "${name}"`, "success");
    onClose();
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createCollection(newName, verses);
    onShowToast?.(`Coleção "${newName.trim()}" criada`, "success");
    onClose();
  };

  return (
    <BiblePageModal
      visible={visible}
      onClose={handleDismiss}
      header={
        <View style={styles.header}>
          <BibleIcon
            name={isCreating ? "arrow-left" : "bookmark"}
            size={ms(DESIGN.spacing.lg)}
            color={colors.primary}
            backgroundColor={colors.primary + "25"}
            onPress={isCreating ? () => setIsCreating(false) : undefined}
          />
          <BibleText
            style={{
              flex: 1,
              marginLeft: ms(DESIGN.spacing.sm),
              color: colors.primary,
              fontSize: ms(DESIGN.spacing.lg),
              fontWeight: "800",
            }}
          >
            {isCreating ? "Nova Coleção" : "Adicionar à Coleção"}
          </BibleText>
          <BibleIcon
            name="x"
            color={colors.error}
            backgroundColor={colors.error + "20"}
            onPress={handleDismiss}
          />
        </View>
      }
      footer={
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={isCreating ? handleCreate : () => setIsCreating(true)}
        >
          <BibleText
            style={{
              color: colors.onPrimary,
              fontWeight: "700",
              fontSize: ms(DESIGN.spacing.lg),
            }}
          >
            {isCreating ? "Criar e Adicionar" : "Criar Nova Coleção"}
          </BibleText>
        </TouchableOpacity>
      }
    >
      <ScrollView
        style={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isCreating ? (
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
        ) : collections.length === 0 ? (
          <BiblePageEmpty
            title="Nenhuma coleção ainda"
            description="Crie uma coleção para guardar os versículos selecionados."
            icon="bookmark"
          />
        ) : (
          collections.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.item,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => handleAdd(c.id, c.name)}
              activeOpacity={0.7}
            >
              <BibleIcon
                name="bookmark"
                color={colors.primary}
                backgroundColor={colors.primary + "20"}
              />
              <View style={{ flex: 1 }}>
                <BibleText
                  numberOfLines={1}
                  style={{
                    color: colors.onSurface,
                    fontWeight: "600",
                    fontSize: ms(DESIGN.fontSize.lg),
                  }}
                >
                  {c.name}
                </BibleText>
                <BibleText
                  style={{
                    color: colors.textMuted,
                    fontSize: ms(DESIGN.fontSize.md),
                  }}
                >
                  {`${c.verses.length} versículo${c.verses.length === 1 ? "" : "s"}`}
                </BibleText>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </BiblePageModal>
  );
}
