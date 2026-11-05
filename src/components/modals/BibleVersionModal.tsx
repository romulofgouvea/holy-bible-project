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
import { ALIASES, BibleVersionInfo } from "../../data/bible-version";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { BibleCountPill } from "../BibleCountPill";
import { BibleGridBlock } from "../BibleGridBlock";
import { BibleIcon } from "../BibleIcon";
import { BibleListCard } from "../BibleListCard";
import { BibleText } from "../BibleText";
import { BiblePageModal } from "./BiblePageModal";

const LANGUAGE_LABELS: Record<string, string> = {
  pt: "Português",
  en: "Inglês",
};
const LANGUAGE_ORDER = ["pt", "en"];

type BibleVersionModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (version: BibleVersionInfo) => void;
  currentVersionSigla?: string;
};

export function BibleVersionModal({
  visible,
  onClose,
  onSelect,
  currentVersionSigla,
}: BibleVersionModalProps) {
  const { ms, height, width, DESIGN } = useResponsive();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          alignItems: "center",
        },
        title: {
          flex: 1,
          fontWeight: "700",
        },
        iconBtn: {
          width: ms(DESIGN.icon.lg),
          height: ms(DESIGN.icon.lg),
          borderRadius: ms(DESIGN.borderRadius.sm),
          justifyContent: "center",
          alignItems: "center",
        },
        headerActionSpacing: {
          marginLeft: ms(DESIGN.spacing.sm),
        },
        searchContainer: {
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderRadius: ms(DESIGN.borderRadius.md),
          paddingHorizontal: ms(DESIGN.spacing.md),
          marginTop: ms(DESIGN.spacing.lg),
          height: ms(DESIGN.height.md),
        },
        searchIcon: {
          marginRight: ms(DESIGN.spacing.sm),
        },
        searchInput: {
          flex: 1,
          height: "100%",
          ...({ outlineStyle: "none" } as any),
        },
        list: {
          flexGrow: 1,
          gap: ms(DESIGN.spacing.sm),
          padding: ms(DESIGN.spacing.lg),
        },
        viewToggles: {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: ms(DESIGN.borderRadius.sm),
          padding: ms(DESIGN.spacing.xs),
          gap: ms(DESIGN.spacing.xs),
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
          width: "100%",
        },
        languageGroup: {
          gap: ms(DESIGN.spacing.sm),
          marginBottom: ms(DESIGN.spacing.sm),
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const scrollViewRef = React.useRef<ScrollView>(null);
  const hasScrolledRef = React.useRef(false);

  React.useEffect(() => {
    if (visible) {
      hasScrolledRef.current = false;
      setSearchQuery("");
      AsyncStorage.getItem(STORAGE_KEYS.VIEW_MODE_VERSION)
        .then((val) => {
          if (val === "list" || val === "grid") setViewMode(val);
        })
        .catch(() => {});
    }
  }, [visible]);

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    AsyncStorage.setItem(STORAGE_KEYS.VIEW_MODE_VERSION, mode).catch(() => {});
  };

  const normalize = (str: string) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const filteredVersions = useMemo(() => {
    const query = normalize(searchQuery.trim());
    if (!query) return ALIASES;
    return ALIASES.filter(
      (item) =>
        normalize(item.name).includes(query) ||
        normalize(item.sigla).includes(query),
    );
  }, [searchQuery]);

  const groupedVersions = useMemo(() => {
    const groups = new Map<string, BibleVersionInfo[]>();
    filteredVersions.forEach((item) => {
      const language = item.language || "pt";
      if (!groups.has(language)) groups.set(language, []);
      groups.get(language)!.push(item);
    });
    return LANGUAGE_ORDER.filter((language) => groups.has(language)).map(
      (language) => ({
        language,
        label: LANGUAGE_LABELS[language] || language.toUpperCase(),
        versions: groups.get(language)!,
      }),
    );
  }, [filteredVersions]);

  const handleSelect = (item: BibleVersionInfo) => {
    onSelect(item);
    setSearchQuery("");
  };
  const paddingHorizontal = ms(DESIGN.spacing.lg) * 4;
  const availableWidth = width - paddingHorizontal;
  const numCols = Math.max(
    1,
    Math.floor(availableWidth / ms(DESIGN.spacing.giant)),
  );
  const itemWidth =
    (availableWidth - (numCols - 1) * ms(DESIGN.spacing.sm)) / numCols - 0.01;

  return (
    <BiblePageModal
      visible={visible}
      onClose={onClose}
      fullHeight
      header={
        <View>
          <View style={styles.header}>
            <BibleIcon
              name="book-open"
              color={colors.primary}
              backgroundColor={colors.primary + "20"}
              style={{ marginRight: ms(DESIGN.spacing.sm) }}
            />
            <BibleText
              style={[
                styles.title,
                {
                  fontSize: ms(DESIGN.fontSize.lg),
                  color: colors.primary,
                  fontWeight: "800",
                },
              ]}
            >
              Versões
            </BibleText>
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

          {isSearchVisible && (
            <View
              style={[
                styles.searchContainer,
                {
                  backgroundColor: colors.surfaceHighlight,
                  borderColor: colors.border,
                },
              ]}
              testID="bible-version-search-container"
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
                placeholder="Pesquisar versão..."
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
        <BibleCountPill
          count={filteredVersions.length}
          label="versão"
          labelPlural="versões"
        />
      }
    >
      <ScrollView
        testID="bible-version-list"
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="always"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {groupedVersions.map((group) => (
          <View key={group.language}>
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
                  { color: colors.textMuted, fontSize: ms(DESIGN.fontSize.xs) },
                ]}
              >
                {group.label.toUpperCase()}
              </BibleText>
              <View
                style={[
                  styles.groupLabelLine,
                  { backgroundColor: colors.border },
                ]}
              />
            </View>
            {viewMode === "list" ? (
              <View style={styles.languageGroup}>
                {group.versions.map((item) => {
                  const isSelected = item.sigla === currentVersionSigla;
                  return (
                    <View
                      key={item.sigla}
                      onLayout={
                        isSelected
                          ? (e) => {
                              if (
                                !hasScrolledRef.current &&
                                visible &&
                                !searchQuery
                              ) {
                                hasScrolledRef.current = true;
                                const y = Math.max(
                                  0,
                                  e.nativeEvent.layout.y -
                                    ms(DESIGN.spacing.lg),
                                );
                                scrollViewRef.current?.scrollTo({
                                  y,
                                  animated: false,
                                });
                              }
                            }
                          : undefined
                      }
                    >
                      <BibleListCard
                        title={item.name}
                        pillText={item.sigla}
                        isSelected={isSelected}
                        onPress={() => handleSelect(item)}
                      />
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.gridContainer}>
                {group.versions.map((item) => {
                  const isSelected = item.sigla === currentVersionSigla;
                  return (
                    <View
                      key={item.sigla}
                      style={{ width: itemWidth }}
                      onLayout={
                        isSelected
                          ? (e) => {
                              if (
                                !hasScrolledRef.current &&
                                visible &&
                                !searchQuery
                              ) {
                                hasScrolledRef.current = true;
                                const y = Math.max(
                                  0,
                                  e.nativeEvent.layout.y -
                                    ms(DESIGN.spacing.lg),
                                );
                                scrollViewRef.current?.scrollTo({
                                  y,
                                  animated: false,
                                });
                              }
                            }
                          : undefined
                      }
                    >
                      <BibleGridBlock
                        title={item.sigla}
                        exactWidth={itemWidth}
                        isSelected={isSelected}
                        onPress={() => handleSelect(item)}
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </BiblePageModal>
  );
}
