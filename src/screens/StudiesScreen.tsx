import { BibleIcon } from "@/components/BibleIcon";
import { BibleActionsDrawer } from "@/components/modals/BibleActionsDrawer";
import { BibleConfirmModal } from "@/components/modals/BibleConfirmModal";
import { BiblePageModal } from "@/components/modals/BiblePageModal";
import { FlashList } from "@shopify/flash-list";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BibleDrawerMenu } from "../components/BibleDrawerMenu";
import { BibleHeader } from "../components/BibleHeader";
import { BiblePageEmpty } from "../components/BiblePageEmpty";
import { BibleSkeleton } from "../components/BibleSkeleton";
import { BibleText } from "../components/BibleText";
import { DonateModal } from "../components/modals/DonateModal";
import { LIMITS } from "../constants/limits";
import { ROUTES, ROUTE_LABELS } from "../constants/routes";
import { useResponsive } from "../hooks/useResponsive";
import { Study, useStudies } from "../hooks/useStudies";
import { useTheme } from "../hooks/useTheme";
import { exportToPDF } from "../utils/export";

export default function EstudosScreen() {
  const { ms, DESIGN } = useResponsive();
  const router = useRouter();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        listContent: {
          padding: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.layout.listPaddingBottom),
          flexGrow: 1,
        },
        emptyContainer: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: ms(DESIGN.layout.emptyPaddingTop),
          gap: ms(DESIGN.spacing.md),
        },
        emptyTitle: { fontWeight: "700" },
        emptySubtitle: {
          textAlign: "center",
          paddingHorizontal: ms(DESIGN.spacing.xxl),
        },
        card: {
          borderWidth: 1,
          marginBottom: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.lg),
          overflow: "hidden",
          elevation: 1,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: ms(DESIGN.borderRadius.xs),
        },
        cardContent: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: ms(DESIGN.spacing.sm),
          paddingVertical: ms(DESIGN.spacing.sm),
          gap: ms(DESIGN.spacing.md),
        },
        cardIcon: {
          width: ms(DESIGN.icon.md),
          height: ms(DESIGN.icon.md),
          borderRadius: ms(DESIGN.borderRadius.sm),
          alignItems: "center",
          justifyContent: "center",
        },
        cardText: { flex: 1, gap: ms(DESIGN.spacing.xs) },
        cardTitle: { fontWeight: "700" },
        cardDate: { marginTop: ms(DESIGN.spacing.tiny) },
        deleteBtn: {
          width: ms(DESIGN.height.sm),
          height: ms(DESIGN.height.sm),
          alignItems: "center",
          justifyContent: "center",
          borderRadius: ms(DESIGN.borderRadius.md),
        },
        modalHeader: { flexDirection: "row", alignItems: "center" },
        modalTitle: { fontWeight: "800" },
        input: {
          borderRadius: ms(DESIGN.borderRadius.md),
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingVertical: ms(DESIGN.spacing.md),
          marginBottom: ms(DESIGN.spacing.sm),
          borderWidth: 1,
          borderColor: "transparent",
        },
        inputMultiline: {
          minHeight: ms(DESIGN.layout.emptyPaddingTop),
          textAlignVertical: "top",
        },
        modalActions: {
          flexDirection: "row",
          gap: ms(DESIGN.spacing.md),
          marginTop: ms(DESIGN.spacing.xs),
        },
        cancelBtn: {
          flex: 1,
          paddingVertical: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
        },
        cancelText: { fontWeight: "700" },
        createBtn: {
          flex: 1,
          paddingVertical: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
        },
        createBtnDisabled: { opacity: 0.5 },
        createText: { fontWeight: "700" },
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

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  React.useEffect(() => {
    if (isModalVisible) {
      setNewTitle("");
      setNewDescription("");
    }
  }, [isModalVisible]);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [studyToDelete, setStudyToDelete] = useState<string | null>(null);
  const [isMultiDeleteVisible, setIsMultiDeleteVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isHeaderMenuVisible, setIsHeaderMenuVisible] = useState(false);
  const [isShareMenuVisible, setIsShareMenuVisible] = useState(false);
  const [isDonateVisible, setIsDonateVisible] = useState(false);
  const [selectionPurpose, setSelectionPurpose] = useState<
    "delete" | "share" | null
  >(null);
  const insets = useSafeAreaInsets();

  const {
    deleteMultiple,
    studies,
    createStudy,
    deleteStudy,
    importBulk,
    isLoaded,
  } = useStudies();
  const currentStudies = studies;

  if (!isLoaded) {
    return <BibleSkeleton />;
  }

  const isSelectionMode = selectedIds.size > 0 || !!selectionPurpose;

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportBackup = async (ids: Set<string>) => {
    setIsShareMenuVisible(false);
    try {
      const selectedStudies = studies.filter((s) => ids.has(s.id));
      if (selectedStudies.length === 0) return;

      const safeTitle =
        selectedStudies.length === 1
          ? selectedStudies[0].title.replace(/[^a-zA-Z0-9]/g, "_")
          : "backup_estudos";
      const jsonString = JSON.stringify(selectedStudies, null, 2);

      if (Platform.OS === "web") {
        const blob = new Blob([jsonString], {
          type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${safeTitle}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const Sharing = require("expo-sharing");
        const newUri = `${(FileSystem as any).documentDirectory}${safeTitle}.json`;
        await FileSystem.writeAsStringAsync(newUri, jsonString);
        await Sharing.shareAsync(newUri, { mimeType: "application/json" });
      }
      setSelectedIds(new Set());
      setSelectionPurpose(null);
    } catch (e) {}
  };

  const exportPDFs = async (ids: Set<string>) => {
    setIsShareMenuVisible(false);
    const selectedStudies = studies.filter((s) => ids.has(s.id));
    if (selectedStudies.length === 0) return;

    const bodyHtml = selectedStudies
      .map(
        (study, index) => `
      <div style="${index > 0 ? "page-break-before: always;" : ""}">
        <h1 class="main-title">Estudo: ${study.title}</h1>
        ${study.content}
      </div>
    `,
      )
      .join("");

    const title =
      selectedStudies.length === 1
        ? `Estudo: ${selectedStudies[0].title}`
        : "Meus Estudos";
    await exportToPDF(title, bodyHtml, false);
    setSelectedIds(new Set());
    setSelectionPurpose(null);
  };

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const id = createStudy(newTitle.trim(), undefined, newDescription.trim());
    setNewTitle("");
    setNewDescription("");
    setIsModalVisible(false);
    router.push(ROUTES.STUDY_EDITOR(id) as any);
  };

  const renderEmpty = () => (
    <BiblePageEmpty
      title="Nenhum estudo ainda"
      description="Abra o menu superior nos três pontos para criar seu primeiro estudo"
      icon="feather"
    />
  );

  const renderItem = ({ item }: { item: Study }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: isSelected
              ? colors.primary + "20"
              : colors.surface,
            borderColor: isSelected ? colors.primary + "20" : colors.border,
            borderWidth: isSelected ? ms(2) : 1,
            elevation: isSelected ? 0 : 1,
          },
        ]}
        onPress={() =>
          isSelectionMode
            ? toggleSelection(item.id)
            : router.push(ROUTES.STUDY_EDITOR(item.id) as any)
        }
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {isSelectionMode ? (
            <TouchableOpacity
              onPress={() => toggleSelection(item.id)}
              style={[
                styles.cardIcon,
                {
                  backgroundColor: isSelected ? colors.primary : "transparent",
                  borderWidth: ms(2),
                  borderColor: isSelected ? "transparent" : colors.border,
                },
              ]}
            >
              {isSelected ? (
                <BibleIcon
                  name="check"
                  color={colors.onPrimary}
                  size={ms(DESIGN.spacing.lg)}
                />
              ) : null}
            </TouchableOpacity>
          ) : (
            <BibleIcon
              name="feather"
              color={colors.primary}
              backgroundColor={colors.primary + "20"}
              containerSize={ms(DESIGN.icon.xl)}
              borderRadius={ms(DESIGN.borderRadius.md)}
            />
          )}
          <View style={styles.cardText}>
            <BibleText
              style={[
                styles.cardTitle,
                {
                  fontSize: ms(DESIGN.fontSize.lg),
                  color: colors.onSurface,
                  fontWeight: "600",
                },
              ]}
              numberOfLines={2}
            >
              {item.title}
            </BibleText>
            <BibleText
              style={[
                styles.cardDate,
                { fontSize: ms(DESIGN.fontSize.md), color: colors.textMuted },
              ]}
            >
              {item.createdAt}
            </BibleText>
          </View>
          <View style={{ opacity: isSelectionMode ? 0.2 : 0.8 }}>
            <BibleIcon
              name="chevron-right"
              color={colors.textMuted}
              size={ms(DESIGN.fontSize.xl)}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isSelectionMode ? (
        <BibleHeader
          title={`${selectedIds.size} selecionado${selectedIds.size > 1 ? "s" : ""}`}
          showMenu={false}
          showBack={true}
          backIcon="x"
          onBack={() => {
            setSelectedIds(new Set());
            setSelectionPurpose(null);
          }}
          rightContent={
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: ms(DESIGN.spacing.lg),
              }}
            >
              {(!selectionPurpose || selectionPurpose === "share") && (
                <TouchableOpacity
                  onPress={() => setIsShareMenuVisible(true)}
                  disabled={selectedIds.size === 0}
                  style={{ opacity: selectedIds.size === 0 ? 0.3 : 1 }}
                >
                  <BibleIcon name="share-2" color={colors.onPrimary} />
                </TouchableOpacity>
              )}
              {(!selectionPurpose || selectionPurpose === "delete") && (
                <TouchableOpacity
                  onPress={() => setIsMultiDeleteVisible(true)}
                  disabled={selectedIds.size === 0}
                  style={{ opacity: selectedIds.size === 0 ? 0.3 : 1 }}
                >
                  <BibleIcon name="trash-2" color={colors.onPrimary} />
                </TouchableOpacity>
              )}
            </View>
          }
        />
      ) : (
        <BibleHeader
          title={ROUTE_LABELS[ROUTES.STUDIES]}
          onMenuPress={() => setIsDrawerVisible(true)}
          rightContent={
            <TouchableOpacity
              onPress={() => setIsHeaderMenuVisible(true)}
              style={{ padding: ms(DESIGN.spacing.xs) }}
            >
              <BibleIcon name="more-vertical" color={colors.onPrimary} />
            </TouchableOpacity>
          }
        />
      )}

      <View style={{ flex: 1 }}>
        <FlashList
          data={currentStudies}
          keyExtractor={(item) => item.id}
          // @ts-ignore
          estimatedItemSize={ms(DESIGN.layout.settingsIconOffset * 1.15)}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <BiblePageModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        header={
          <View style={styles.modalHeader}>
            <BibleIcon
              name="file-plus"
              color={colors.primary}
              backgroundColor={colors.primary + "15"}
              style={{ marginRight: ms(DESIGN.spacing.sm) }}
            />
            <BibleText
              style={[
                styles.modalTitle,
                {
                  fontSize: ms(DESIGN.fontSize.lg),
                  color: colors.onSurface,
                  fontWeight: "700",
                },
              ]}
            >
              Novo Estudo
            </BibleText>
            <BibleIcon
              name="x"
              color={colors.error}
              backgroundColor={colors.error + "20"}
              onPress={() => setIsModalVisible(false)}
              style={{ marginLeft: "auto" }}
            />
          </View>
        }
        footer={
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[
                styles.createBtn,
                { backgroundColor: colors.primary },
                !newTitle.trim() && styles.createBtnDisabled,
              ]}
              onPress={handleCreate}
              disabled={!newTitle.trim()}
            >
              <BibleText
                style={[
                  styles.createText,
                  { fontSize: ms(DESIGN.fontSize.md), color: colors.onPrimary },
                ]}
              >
                Criar
              </BibleText>
            </TouchableOpacity>
          </View>
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: ms(DESIGN.spacing.md) }}
        >
          <BibleText style={[styles.sectionTitle, { color: colors.textMuted }]}>
            Título do Estudo
          </BibleText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceHighlight,
                color: colors.onSurface,
              },
              Platform.select({ web: { outline: "none" } as any, default: {} }),
            ]}
            placeholder="Ex: Esperança em Meio à Provação"
            placeholderTextColor={colors.textMuted}
            value={newTitle}
            onChangeText={setNewTitle}
            maxLength={LIMITS.STUDY_TITLE_MAX_LENGTH}
            underlineColorAndroid="transparent"
          />
          <BibleText
            style={[
              styles.sectionTitle,
              { color: colors.textMuted, marginTop: ms(DESIGN.spacing.sm) },
            ]}
          >
            Descrição (Opcional)
          </BibleText>
          <TextInput
            style={[
              styles.input,
              styles.inputMultiline,
              {
                backgroundColor: colors.surfaceHighlight,
                color: colors.onSurface,
              },
              Platform.select({ web: { outline: "none" } as any, default: {} }),
            ]}
            placeholder="Uma breve introdução sobre este estudo"
            placeholderTextColor={colors.textMuted}
            value={newDescription}
            onChangeText={setNewDescription}
            multiline
            numberOfLines={3}
            underlineColorAndroid="transparent"
          />
        </ScrollView>
      </BiblePageModal>

      <BibleConfirmModal
        visible={!!studyToDelete}
        title="Mover para lixeira"
        message="O estudo ficará na lixeira por 30 dias e depois será excluído permanentemente. Você pode recuperá-lo a qualquer momento nesse período."
        confirmText="Excluir"
        isDanger={true}
        onCancel={() => setStudyToDelete(null)}
        onConfirm={() => {
          if (studyToDelete) {
            deleteStudy(studyToDelete);
          }
          setStudyToDelete(null);
        }}
      />

      <BibleConfirmModal
        visible={isMultiDeleteVisible}
        title="Excluir estudos selecionados"
        message={`Deseja mover ${selectedIds.size} estudo(s) para a lixeira?`}
        confirmText="Excluir"
        isDanger={true}
        onCancel={() => setIsMultiDeleteVisible(false)}
        onConfirm={() => {
          deleteMultiple(Array.from(selectedIds));
          setSelectedIds(new Set());
          setSelectionPurpose(null);
          setIsMultiDeleteVisible(false);
        }}
      />

      <BibleDrawerMenu
        visible={isDrawerVisible}
        activeItem="studies"
        onClose={() => setIsDrawerVisible(false)}
        onSelectItem={() => {}}
        onOpenDonate={() => {
          setIsDrawerVisible(false);
          setTimeout(() => setIsDonateVisible(true), 250);
        }}
      />

      <BibleActionsDrawer
        visible={isHeaderMenuVisible}
        onClose={() => setIsHeaderMenuVisible(false)}
        title="Ações"
        items={[
          {
            icon: "file-plus",
            label: "Novo Estudo",
            onPress: () => setIsModalVisible(true),
          },
          {
            icon: "trash-2",
            label: "Excluir Estudos",
            onPress: () => setSelectionPurpose("delete"),
          },
          {
            icon: "share-2",
            label: "Compartilhar",
            onPress: () => setSelectionPurpose("share"),
          },
        ]}
      />

      <BibleActionsDrawer
        visible={isShareMenuVisible}
        onClose={() => setIsShareMenuVisible(false)}
        title="Compartilhar"
        items={[
          {
            icon: "file-text",
            label: "Compartilhar em PDF",
            onPress: () => exportPDFs(selectedIds),
          },
          {
            icon: "file",
            label: "Compartilhar em arquivo",
            onPress: () => exportBackup(selectedIds),
          },
        ]}
      />

      <DonateModal
        visible={isDonateVisible}
        onClose={() => setIsDonateVisible(false)}
      />
    </View>
  );
}
