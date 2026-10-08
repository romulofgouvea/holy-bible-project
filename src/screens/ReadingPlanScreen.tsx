import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BibleDrawerMenu } from "../components/BibleDrawerMenu";
import { BibleHeader } from "../components/BibleHeader";
import { BibleIcon } from "../components/BibleIcon";
import { BiblePageEmpty } from "../components/BiblePageEmpty";
import { BiblePlanStatusBadge } from "../components/BiblePlanStatusBadge";
import { BibleText } from "../components/BibleText";
import { BibleToast } from "../components/BibleToast";
import { BibleActionsDrawer } from "../components/modals/BibleActionsDrawer";
import { BibleConfirmModal } from "../components/modals/BibleConfirmModal";
import { DonateModal } from "../components/modals/DonateModal";
import { ROUTE_LABELS, ROUTES } from "../constants/routes";
import { BIBLE_PLAN_TEMPLATES } from "../data/bible-plan/biblePlanRegistry";
import { useBible } from "../hooks/useBible";
import { useBiblePlan } from "../hooks/useBiblePlan";
import { useReadingPlanNotifications } from "../hooks/useReadingPlanNotifications";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { useToast } from "../hooks/useToast";
import { ActiveBiblePlan } from "../models";
import {
  BiblePlanDay,
  BiblePlanMonth,
  BiblePlanTemplate,
} from "../models/BiblePlanModels";

import { BiblePageModal } from "../components/modals/BiblePageModal";

type ScreenView = "list" | "detail";

type FlatDayItem = BiblePlanDay & {
  monthNumber: number;
  monthName: string;
  isFirstInMonth: boolean;
  monthTheme: string;
  globalIndex: number;
};

function flattenMonths(months: BiblePlanMonth[]): FlatDayItem[] {
  const result: FlatDayItem[] = [];
  let globalIndex = 0;
  for (const month of months) {
    for (let i = 0; i < month.days.length; i++) {
      result.push({
        ...month.days[i],
        monthNumber: month.monthNumber,
        monthName: month.month,
        monthTheme: month.theme,
        isFirstInMonth: i === 0,
        globalIndex,
      });
      globalIndex++;
    }
  }
  return result;
}

export default function ReadingPlanScreen() {
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const { navigateTo } = useBible();
  const router = useRouter();
  const {
    activePlans,
    isLoaded,
    createBiblePlan,
    toggleDay,
    toggleChapter,
    toggleAllChaptersForDay,
    isDayCompleted,
    isChapterCompleted,
    getDayCompletedAt,
    removeBiblePlan,
    removeBiblePlans,
    getBiblePlanStats,
    getBiblePlanStreak,
    updateStartDate,
    pausePlan,
    resumePlan,
  } = useBiblePlan();
  useReadingPlanNotifications();
  const { toast, opacity, show } = useToast();

  const [screenView, setScreenView] = useState<ScreenView>("list");
  const [isTemplateModalVisible, setIsTemplateModalVisible] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [isDonateVisible, setIsDonateVisible] = useState(false);
  const [isActionsVisible, setIsActionsVisible] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedDeleteIds, setSelectedDeleteIds] = useState<Set<string>>(
    new Set(),
  );
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [isStartDatePickerVisible, setIsStartDatePickerVisible] =
    useState(false);
  const [pendingStartDate, setPendingStartDate] = useState("");
  const [startDatePlanId, setStartDatePlanId] = useState<string | null>(null);
  const [selectedDayInfo, setSelectedDayInfo] = useState<FlatDayItem | null>(
    null,
  );
  const [isChapterModalVisible, setIsChapterModalVisible] = useState(false);
  const listRef = useRef<any>(null);
  const hasScrolledRef = useRef(false);

  const selectedPlan = useMemo(
    () => activePlans.find((p) => p.id === selectedPlanId) ?? null,
    [activePlans, selectedPlanId],
  );

  const selectedTemplate = useMemo(() => {
    if (!selectedPlan) return null;
    return (
      BIBLE_PLAN_TEMPLATES.find((t) => t.id === selectedPlan.templateId) ?? null
    );
  }, [selectedPlan]);

  const flatDays = useMemo(() => {
    if (!selectedTemplate) return [];
    return flattenMonths(selectedTemplate.months);
  }, [selectedTemplate]);

  const lastCompletedIndex = useMemo(() => {
    if (!selectedPlan || flatDays.length === 0) return -1;
    let lastIdx = -1;
    for (let i = 0; i < flatDays.length; i++) {
      const item = flatDays[i];
      if (isDayCompleted(selectedPlan, item.monthNumber, item.day)) {
        lastIdx = i;
      }
    }
    return lastIdx;
  }, [selectedPlan, flatDays, isDayCompleted]);

  const selectedStats = useMemo(() => {
    if (!selectedPlan || !selectedTemplate) return null;
    return getBiblePlanStats(selectedPlan, selectedTemplate.months);
  }, [selectedPlan, selectedTemplate, getBiblePlanStats]);

  const selectedStreak = useMemo(() => {
    if (!selectedPlan) return 0;
    return getBiblePlanStreak(selectedPlan);
  }, [selectedPlan, getBiblePlanStreak]);

  const todayIndex = useMemo(() => {
    if (!selectedStats || flatDays.length === 0) return -1;
    if (selectedStats.isPaused || selectedStats.isCompleted) return -1;
    return Math.min(
      Math.max(selectedStats.elapsed - 1, 0),
      flatDays.length - 1,
    );
  }, [selectedStats, flatDays.length]);

  // Auto-scroll remoted by user request

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (screenView === "detail") {
          setScreenView("list");
          setSelectedPlanId(null);
          return true;
        }
        if (isDeleteMode || selectedDeleteIds.size > 0) {
          setIsDeleteMode(false);
          setSelectedDeleteIds(new Set());
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [screenView, isDeleteMode, selectedDeleteIds.size]),
  );

  const isSelectionMode = isDeleteMode || selectedDeleteIds.size > 0;

  const toggleDeleteSelection = useCallback((id: string) => {
    setSelectedDeleteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirmDelete = useCallback(() => {
    removeBiblePlans(Array.from(selectedDeleteIds));
    setSelectedDeleteIds(new Set());
    setIsDeleteMode(false);
    setIsDeleteConfirmVisible(false);
  }, [selectedDeleteIds, removeBiblePlans]);

  const exitDeleteMode = useCallback(() => {
    setIsDeleteMode(false);
    setSelectedDeleteIds(new Set());
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        listContent: {
          padding: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.layout.listPaddingBottom),
          flexGrow: 1,
        },
        sectionLabel: {
          fontSize: ms(DESIGN.fontSize.xs),
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 1,
          opacity: 0.6,
          paddingBottom: ms(DESIGN.spacing.sm),
        },
        monthHeader: {
          flexDirection: "row",
          alignItems: "center",
          marginVertical: ms(DESIGN.spacing.xl),
          paddingHorizontal: ms(DESIGN.spacing.xs),
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
        planCardContent: {
          padding: ms(DESIGN.spacing.lg),
        },
        planCardRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.md),
        },
        templateCardContent: {
          flexDirection: "row",
          alignItems: "center",
          padding: ms(DESIGN.spacing.lg),
          gap: ms(DESIGN.spacing.md),
        },
        iconWrap: {
          width: ms(DESIGN.icon.xl),
          height: ms(DESIGN.icon.xl),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        progressBarBg: {
          height: ms(5),
          borderRadius: ms(DESIGN.borderRadius.sm),
          marginTop: ms(DESIGN.spacing.sm),
          overflow: "hidden",
        },
        progressBarFill: {
          height: "100%",
          borderRadius: ms(DESIGN.borderRadius.sm),
        },
        dayCard: {
          borderWidth: 1,
          marginBottom: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.lg),
          overflow: "hidden",
          elevation: 1,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: ms(DESIGN.borderRadius.xs),
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingVertical: ms(DESIGN.spacing.md),
          gap: ms(DESIGN.spacing.md),
        },
        checkbox: {
          width: ms(DESIGN.icon.md),
          height: ms(DESIGN.icon.md),
          borderRadius: ms(DESIGN.borderRadius.sm),
          borderWidth: ms(2),
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        daysTag: {
          alignSelf: "flex-start",
          borderRadius: ms(DESIGN.borderRadius.sm),
          paddingHorizontal: ms(DESIGN.spacing.sm),
          paddingVertical: ms(2),
          marginTop: ms(DESIGN.spacing.xs),
        },
        dateInput: {
          borderWidth: 1,
          borderRadius: ms(DESIGN.borderRadius.md),
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingVertical: ms(DESIGN.spacing.md),
          fontSize: ms(DESIGN.fontSize.lg),
          textAlign: "center",
        },
        cardIcon: {
          width: ms(DESIGN.icon.md),
          height: ms(DESIGN.icon.md),
          borderRadius: ms(DESIGN.borderRadius.sm),
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [ms, DESIGN],
  );

  const handleOpenPlan = useCallback((planId: string) => {
    setSelectedPlanId(planId);
    setScreenView("detail");
  }, []);

  const handleBack = useCallback(() => {
    if (screenView === "detail") {
      setScreenView("list");
      setSelectedPlanId(null);
    }
  }, [screenView]);

  const handleSelectTemplate = useCallback(
    (template: BiblePlanTemplate) => {
      const existingPlan = activePlans.find(
        (p) => p.templateId === template.id,
      );
      if (existingPlan) {
        setIsTemplateModalVisible(false);
        setTimeout(() => {
          show("Você já possui este plano em andamento.", "warning");
        }, 300);
        return;
      }

      setIsTemplateModalVisible(false);
      setTimeout(() => {
        createBiblePlan(template);
        show("Plano adicionado", "success");
      }, 300);
    },
    [activePlans, createBiblePlan, show],
  );

  const handleDayPress = useCallback((item: FlatDayItem) => {
    setSelectedDayInfo(item);
    setIsChapterModalVisible(true);
  }, []);

  const handleNavigateToChapter = useCallback(
    (bookAbbrev: string, chapter: number) => {
      setIsChapterModalVisible(false);
      navigateTo({ book: bookAbbrev, chapter, verse: 1 });
      router.navigate(ROUTES.BIBLE as any);
    },
    [navigateTo, router],
  );

  const handleToggleDay = useCallback(
    (planId: string, monthNumber: number, day: number) => {
      toggleDay(planId, monthNumber, day);
    },
    [toggleDay],
  );

  const handleSetStartDate = useCallback(
    (planId: string) => {
      const plan = activePlans.find((p) => p.id === planId);
      if (!plan) return;
      setStartDatePlanId(planId);
      setPendingStartDate(formatDateForInput(new Date(plan.startedAt)));
      setIsStartDatePickerVisible(true);
    },
    [activePlans],
  );

  const handleConfirmStartDate = useCallback(() => {
    if (!startDatePlanId || !pendingStartDate) return;
    const parts = pendingStartDate.split("/");
    if (parts.length === 3) {
      const dateObj = new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
      );
      if (!isNaN(dateObj.getTime())) {
        updateStartDate(startDatePlanId, dateObj.getTime());
      }
    }
    setIsStartDatePickerVisible(false);
    setStartDatePlanId(null);

    const plan = activePlans.find((p) => p.id === startDatePlanId);
    if (plan && !selectedPlanId) {
      setSelectedPlanId(plan.id);
      setScreenView("detail");
    }
  }, [
    startDatePlanId,
    pendingStartDate,
    updateStartDate,
    activePlans,
    selectedPlanId,
  ]);

  const actionsItems = useMemo(
    () => [
      {
        icon: "plus" as const,
        label: "Novo Plano",
        onPress: () => {
          setIsActionsVisible(false);
          setTimeout(() => setIsTemplateModalVisible(true), 300);
        },
      },
      {
        icon: "trash-2" as const,
        label: "Excluir Planos",
        onPress: () => setIsDeleteMode(true),
      },
    ],
    [colors.error],
  );

  const detailActionsItems = useMemo(() => {
    if (!selectedPlanId) return [];
    const items: {
      icon: React.ComponentProps<typeof BibleIcon>["name"];
      label: string;
      onPress: () => void;
    }[] = [
      {
        icon: "calendar",
        label: "Alterar Data de Início",
        onPress: () => handleSetStartDate(selectedPlanId),
      },
    ];
    if (!selectedStats?.isCompleted) {
      items.push(
        selectedStats?.isPaused
          ? {
              icon: "play",
              label: "Retomar Plano",
              onPress: () => resumePlan(selectedPlanId),
            }
          : {
              icon: "pause",
              label: "Pausar Plano",
              onPress: () => pausePlan(selectedPlanId),
            },
      );
    }
    return items;
  }, [
    selectedPlanId,
    handleSetStartDate,
    selectedStats?.isCompleted,
    selectedStats?.isPaused,
    pausePlan,
    resumePlan,
  ]);

  const renderPlanListItem = useCallback(
    ({ item }: { item: ActiveBiblePlan }) => {
      const template = BIBLE_PLAN_TEMPLATES.find(
        (t) => t.id === item.templateId,
      );
      if (!template) return null;
      const {
        completedCount,
        totalDays,
        progressPercent,
        delayDays,
        aheadDays,
        isPaused,
        isCompleted,
        completedAtMs,
      } = getBiblePlanStats(item, template.months);
      const isSelected = selectedDeleteIds.has(item.id);

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
              ? toggleDeleteSelection(item.id)
              : handleOpenPlan(item.id)
          }
          activeOpacity={0.7}
        >
          <View style={styles.planCardContent}>
            <View style={styles.planCardRow}>
              {isSelectionMode ? (
                <TouchableOpacity
                  onPress={() => toggleDeleteSelection(item.id)}
                  style={[
                    styles.cardIcon,
                    {
                      backgroundColor: isSelected
                        ? colors.primary
                        : "transparent",
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
                  name="book-open"
                  color={colors.primary}
                  backgroundColor={colors.primary + "20"}
                  containerSize={ms(DESIGN.icon.xl)}
                  borderRadius={ms(DESIGN.borderRadius.md)}
                />
              )}
              <View style={{ flex: 1 }}>
                <BibleText
                  style={{
                    fontWeight: "600",
                    fontSize: ms(DESIGN.fontSize.lg),
                    color: colors.onSurface,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </BibleText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: ms(8),
                    marginTop: ms(4),
                  }}
                >
                  <BibleText
                    style={{
                      fontSize: ms(DESIGN.fontSize.md),
                      color: colors.textMuted,
                    }}
                  >
                    {completedCount} de {totalDays} dias · {progressPercent}%
                  </BibleText>
                  <BiblePlanStatusBadge
                    delayDays={delayDays}
                    aheadDays={aheadDays}
                    isPaused={isPaused}
                    isCompleted={isCompleted}
                    completedAtMs={completedAtMs}
                  />
                </View>
              </View>
              <View style={{ opacity: isSelectionMode ? 0.2 : 0.8 }}>
                <BibleIcon
                  name="chevron-right"
                  color={colors.textMuted}
                  size={ms(DESIGN.fontSize.xl)}
                />
              </View>
            </View>
            <View
              style={[
                styles.progressBarBg,
                {
                  backgroundColor: colors.border,
                  marginTop: ms(DESIGN.spacing.md),
                },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [
      styles,
      colors,
      ms,
      DESIGN,
      getBiblePlanStats,
      handleOpenPlan,
      isSelectionMode,
      selectedDeleteIds,
      toggleDeleteSelection,
    ],
  );

  const groupedTemplates = useMemo(() => {
    return [
      { id: "header-3", type: "header", title: "3 Meses" },
      ...BIBLE_PLAN_TEMPLATES.filter((t) => t.id.includes("three-months")),
      { id: "header-6", type: "header", title: "6 Meses" },
      ...BIBLE_PLAN_TEMPLATES.filter((t) => t.id.includes("six-months")),
      { id: "header-12", type: "header", title: "1 Ano" },
      ...BIBLE_PLAN_TEMPLATES.filter(
        (t) => !t.id.includes("three-months") && !t.id.includes("six-months"),
      ),
    ];
  }, []);

  const renderTemplateItem = useCallback(
    ({ item }: { item: any }) => {
      if (item.type === "header") {
        return (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: ms(DESIGN.spacing.md),
              marginBottom: ms(DESIGN.spacing.xs),
            }}
          >
            <BibleText
              style={[
                styles.sectionLabel,
                { color: colors.textMuted, flex: 1 },
              ]}
            >
              {item.title}
            </BibleText>
            <View
              style={{
                height: 1,
                backgroundColor: colors.border,
                flex: 1,
                opacity: 0.5,
              }}
            />
          </View>
        );
      }

      const template = item as BiblePlanTemplate;
      const totalDays = template.months.reduce(
        (acc, m) => acc + m.days.length,
        0,
      );
      return (
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
          ]}
          onPress={() => handleSelectTemplate(template)}
          activeOpacity={0.7}
        >
          <View style={styles.templateCardContent}>
            <BibleIcon
              name={
                template.icon as React.ComponentProps<typeof BibleIcon>["name"]
              }
              color={colors.primary}
              backgroundColor={colors.primary + "20"}
              containerSize={ms(DESIGN.icon.lg)}
              borderRadius={ms(DESIGN.borderRadius.md)}
            />
            <View style={{ flex: 1 }}>
              <BibleText
                style={{
                  fontWeight: "700",
                  fontSize: ms(DESIGN.fontSize.lg),
                  color: colors.onSurface,
                }}
                numberOfLines={1}
              >
                {template.title}
              </BibleText>
              <BibleText
                style={{
                  fontSize: ms(DESIGN.fontSize.sm),
                  color: colors.textMuted,
                  fontWeight: "400",
                  marginTop: ms(2),
                }}
                numberOfLines={2}
              >
                {template.description}
              </BibleText>
            </View>
            <View
              style={[
                styles.daysTag,
                {
                  backgroundColor: colors.primary + "20",
                  marginTop: 0,
                  alignSelf: "center",
                  flexShrink: 0,
                },
              ]}
            >
              <BibleText
                style={{
                  fontSize: ms(DESIGN.fontSize.sm),
                  color: colors.primary,
                  fontWeight: "700",
                }}
              >
                {totalDays} dias
              </BibleText>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [styles, colors, ms, DESIGN, handleSelectTemplate],
  );

  const renderDayItem = useCallback(
    ({ item }: { item: FlatDayItem }) => {
      if (!selectedPlan) return null;
      const isCompleted = isDayCompleted(
        selectedPlan,
        item.monthNumber,
        item.day,
      );
      const completedAt = getDayCompletedAt(
        selectedPlan,
        item.monthNumber,
        item.day,
      );
      const isToday = !isCompleted && item.globalIndex === todayIndex;

      return (
        <View>
          {item.isFirstInMonth && (
            <View style={styles.monthHeader}>
              <View
                style={{
                  width: ms(DESIGN.spacing.xs),
                  height: "100%",
                  backgroundColor: colors.primary,
                  borderRadius: ms(DESIGN.borderRadius.full),
                  marginRight: ms(DESIGN.spacing.sm),
                }}
              />
              <View style={{ flex: 1 }}>
                <BibleText
                  style={{
                    fontWeight: "800",
                    fontSize: ms(DESIGN.fontSize.xxl),
                    color: colors.onSurface,
                    letterSpacing: 0.3,
                  }}
                >
                  {item.monthName}
                </BibleText>
                {!!item.monthTheme && (
                  <BibleText
                    style={{
                      fontSize: ms(DESIGN.fontSize.sm),
                      color: colors.textMuted,
                      marginTop: ms(2),
                    }}
                  >
                    {item.monthTheme}
                  </BibleText>
                )}
              </View>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.dayCard,
              {
                backgroundColor: isToday
                  ? colors.primary + "15"
                  : colors.surface,
                borderColor: isToday ? colors.primary : colors.border,
                borderWidth: isToday ? ms(2) : 1,
                shadowColor: colors.shadow,
                elevation: isToday ? 0 : 1,
                opacity: isCompleted ? 0.6 : 1,
              },
            ]}
            onPress={() => handleDayPress(item)}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: ms(DESIGN.spacing.xs),
                }}
              >
                <BibleText
                  style={{
                    fontSize: ms(DESIGN.fontSize.sm),
                    fontWeight: "700",
                    color: isToday ? colors.primary : colors.textMuted,
                  }}
                >
                  Dia {item.day}
                </BibleText>
                {isToday && (
                  <View
                    style={{
                      backgroundColor: colors.primary,
                      paddingHorizontal: ms(6),
                      paddingVertical: ms(1),
                      borderRadius: ms(DESIGN.borderRadius.sm),
                    }}
                  >
                    <BibleText
                      style={{
                        fontSize: ms(DESIGN.fontSize.xs),
                        fontWeight: "800",
                        color: colors.onPrimary,
                      }}
                    >
                      Hoje
                    </BibleText>
                  </View>
                )}
              </View>
              <BibleText
                style={{
                  fontSize: ms(DESIGN.fontSize.md),
                  color: isCompleted ? colors.textMuted : colors.onSurface,
                }}
                numberOfLines={2}
              >
                {item.reading}
              </BibleText>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: ms(DESIGN.spacing.sm),
              }}
            >
              {isCompleted && completedAt && (
                <BibleText
                  style={{
                    fontSize: ms(DESIGN.fontSize.xs),
                    color: colors.textMuted,
                  }}
                >
                  {new Date(completedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </BibleText>
              )}
              {isCompleted ? (
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderWidth: 0,
                      backgroundColor: colors.primary,
                    },
                  ]}
                >
                  <BibleIcon
                    name="check"
                    size={ms(DESIGN.fontSize.md)}
                    color={colors.onPrimary}
                  />
                </View>
              ) : (
                <BibleIcon
                  name="chevron-right"
                  color={colors.textMuted}
                  size={ms(DESIGN.fontSize.xl)}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [
      styles,
      colors,
      ms,
      DESIGN,
      selectedPlan,
      isDayCompleted,
      getDayCompletedAt,
      handleDayPress,
      handleToggleDay,
      todayIndex,
    ],
  );

  const detailHeader = useMemo(() => {
    if (!selectedPlan || !selectedTemplate || !selectedStats) return null;
    const {
      completedCount,
      totalDays,
      progressPercent,
      delayDays,
      aheadDays,
      startedAt,
      expectedEndMs,
      estimatedEndMs,
      isPaused,
      isCompleted,
      completedAtMs,
    } = selectedStats;
    const startDateText = new Date(startedAt).toLocaleDateString("pt-BR");
    const showGoToToday = !isPaused && todayIndex >= 0;
    const showGoToLast =
      !isPaused && lastCompletedIndex >= 0 && lastCompletedIndex !== todayIndex;

    return (
      <View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
              marginBottom: ms(DESIGN.spacing.md),
              position: "relative",
            },
          ]}
        >
          <View
            style={{
              position: "absolute",
              top: ms(DESIGN.spacing.sm),
              right: ms(DESIGN.spacing.sm),
              zIndex: 1,
            }}
          >
            <BiblePlanStatusBadge
              delayDays={delayDays}
              aheadDays={aheadDays}
              isPaused={isPaused}
              isCompleted={isCompleted}
              completedAtMs={completedAtMs}
            />
          </View>

          <View style={styles.planCardContent}>
            <BibleText
              style={{
                fontWeight: "800",
                fontSize: ms(DESIGN.fontSize.lg),
                color: colors.onSurface,
                paddingRight: ms(80),
              }}
            >
              {selectedPlan.title}
            </BibleText>

            <View style={{ marginTop: ms(16), marginBottom: ms(16) }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: ms(12),
                }}
              >
                <View style={{ flex: 1 }}>
                  <BibleText
                    style={{
                      fontSize: ms(DESIGN.fontSize.xs),
                      color: colors.textMuted,
                      textTransform: "uppercase",
                      fontWeight: "800",
                    }}
                  >
                    Início
                  </BibleText>
                  <BibleText
                    style={{
                      fontSize: ms(DESIGN.fontSize.sm),
                      color: colors.onSurface,
                      fontWeight: "600",
                      marginTop: ms(2),
                    }}
                  >
                    {startDateText}
                  </BibleText>
                </View>
                <View style={{ flex: 1 }}>
                  <BibleText
                    style={{
                      fontSize: ms(DESIGN.fontSize.xs),
                      color: isCompleted ? colors.success : colors.textMuted,
                      textTransform: "uppercase",
                      fontWeight: "800",
                    }}
                  >
                    {isCompleted ? "Concluído em" : "Fim previsto"}
                  </BibleText>
                  <BibleText
                    style={{
                      fontSize: ms(DESIGN.fontSize.sm),
                      color: isCompleted ? colors.success : colors.onSurface,
                      fontWeight: "600",
                      marginTop: ms(2),
                    }}
                  >
                    {isCompleted && completedAtMs
                      ? new Date(completedAtMs).toLocaleDateString("pt-BR")
                      : new Date(expectedEndMs).toLocaleDateString("pt-BR")}
                  </BibleText>
                </View>
              </View>

              {!isCompleted && (delayDays > 0 || aheadDays > 0) && (
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <BibleText
                      style={{
                        fontSize: ms(DESIGN.fontSize.xs),
                        color: delayDays > 0 ? colors.error : colors.success,
                        textTransform: "uppercase",
                        fontWeight: "800",
                      }}
                    >
                      Conclusão estimada
                    </BibleText>
                    <BibleText
                      style={{
                        fontSize: ms(DESIGN.fontSize.sm),
                        color: delayDays > 0 ? colors.error : colors.success,
                        fontWeight: "700",
                        marginTop: ms(2),
                      }}
                    >
                      {new Date(estimatedEndMs).toLocaleDateString("pt-BR")}
                    </BibleText>
                  </View>
                  <View style={{ flex: 1 }} />
                </View>
              )}
            </View>

            <View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginBottom: ms(DESIGN.spacing.xs),
                }}
              >
                <BibleText
                  style={{
                    fontSize: ms(DESIGN.fontSize.sm),
                    color: colors.textMuted,
                    textTransform: "uppercase",
                    fontWeight: "800",
                  }}
                >
                  Progresso de leitura:
                </BibleText>
                <BibleText
                  style={{
                    fontSize: ms(DESIGN.fontSize.sm),
                    color: colors.onSurface,
                    fontWeight: "700",
                  }}
                >
                  {completedCount} de {totalDays} dias · {progressPercent}%
                </BibleText>
              </View>
              <View
                style={[
                  styles.progressBarBg,
                  { backgroundColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: isCompleted
                        ? colors.success
                        : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>
        {selectedStreak > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: ms(DESIGN.spacing.xs),
              marginBottom: ms(DESIGN.spacing.md),
              marginLeft: ms(DESIGN.spacing.xs),
            }}
          >
            <BibleIcon
              name="zap"
              color={colors.primary}
              size={ms(DESIGN.fontSize.lg)}
            />
            <BibleText
              style={{
                fontSize: ms(DESIGN.fontSize.sm),
                color: colors.onSurface,
                fontWeight: "700",
              }}
            >
              {selectedStreak} {selectedStreak === 1 ? "dia" : "dias"} seguidos
            </BibleText>
          </View>
        )}

        {showGoToLast && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary + "15",
              padding: ms(DESIGN.spacing.md),
              borderRadius: ms(DESIGN.borderRadius.md),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: ms(DESIGN.spacing.md),
              gap: ms(8),
              borderWidth: 1,
              borderColor: colors.primary + "30",
            }}
            onPress={() => {
              listRef.current?.scrollToIndex({
                index: Math.min(lastCompletedIndex, flatDays.length - 1),
                animated: true,
                viewPosition: 0,
              });
            }}
            activeOpacity={0.7}
          >
            <BibleIcon
              name="arrow-down-circle"
              color={colors.primary}
              size={ms(DESIGN.icon.sm)}
            />
            <BibleText
              style={{
                color: colors.primary,
                fontWeight: "700",
                fontSize: ms(DESIGN.fontSize.md),
              }}
            >
              Ir para última leitura
            </BibleText>
          </TouchableOpacity>
        )}
        {showGoToToday && (
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary + "15",
              padding: ms(DESIGN.spacing.md),
              borderRadius: ms(DESIGN.borderRadius.md),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: ms(DESIGN.spacing.md),
              gap: ms(8),
              borderWidth: 1,
              borderColor: colors.primary + "30",
            }}
            onPress={() => {
              listRef.current?.scrollToIndex({
                index: Math.min(todayIndex, flatDays.length - 1),
                animated: true,
                viewPosition: 0,
              });
            }}
            activeOpacity={0.7}
          >
            <BibleIcon
              name="calendar"
              color={colors.primary}
              size={ms(DESIGN.icon.sm)}
            />
            <BibleText
              style={{
                color: colors.primary,
                fontWeight: "700",
                fontSize: ms(DESIGN.fontSize.md),
              }}
            >
              Ir para leitura de hoje
            </BibleText>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    selectedPlan,
    selectedTemplate,
    selectedStats,
    selectedStreak,
    styles,
    colors,
    ms,
    DESIGN,
    lastCompletedIndex,
    todayIndex,
    flatDays.length,
  ]);

  const listHeader = useMemo(
    () => (
      <BibleText
        style={[
          styles.sectionLabel,
          { color: colors.textMuted, marginBottom: ms(DESIGN.spacing.xs) },
        ]}
      >
        Meus planos
      </BibleText>
    ),
    [styles, colors, ms, DESIGN],
  );

  const isInSubView = screenView === "detail";

  if (!isLoaded) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isSelectionMode ? (
        <BibleHeader
          title={`${selectedDeleteIds.size} selecionado${selectedDeleteIds.size > 1 ? "s" : ""}`}
          showMenu={false}
          showBack={true}
          backIcon="x"
          onBack={exitDeleteMode}
          rightContent={
            <TouchableOpacity
              onPress={() => setIsDeleteConfirmVisible(true)}
              disabled={selectedDeleteIds.size === 0}
              style={{ opacity: selectedDeleteIds.size === 0 ? 0.3 : 1 }}
            >
              <BibleIcon
                name="trash-2"
                color={colors.onPrimary}
                size={ms(DESIGN.fontSize.xxl)}
              />
            </TouchableOpacity>
          }
        />
      ) : (
        <BibleHeader
          title={
            screenView === "detail"
              ? (selectedPlan?.title ?? "Plano de Leitura")
              : ROUTE_LABELS[ROUTES.READING_PLAN]
          }
          showMenu={!isInSubView}
          showBack={isInSubView}
          onMenuPress={() => setIsDrawerVisible(true)}
          onBack={handleBack}
          rightContent={
            <TouchableOpacity
              onPress={() => setIsActionsVisible(true)}
              style={{ padding: ms(DESIGN.spacing.xs) }}
            >
              <BibleIcon
                name="more-vertical"
                color={colors.onPrimary}
                size={ms(DESIGN.fontSize.xxl)}
              />
            </TouchableOpacity>
          }
        />
      )}

      <View style={{ flex: 1 }}>
        {screenView === "list" && (
          <FlashList
            data={activePlans}
            keyExtractor={(item) => item.id}
            // @ts-ignore
            estimatedItemSize={ms(100)}
            renderItem={renderPlanListItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <BiblePageEmpty
                title="Nenhum plano ativo"
                description="Toque nos 3 pontos para adicionar um plano de leitura"
                icon="calendar"
              />
            }
          />
        )}

        {screenView === "detail" && selectedPlan && (
          <FlashList
            ref={listRef}
            data={flatDays}
            keyExtractor={(item) => `${item.monthNumber}-${item.day}`}
            // @ts-ignore
            estimatedItemSize={ms(72)}
            renderItem={renderDayItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={detailHeader}
          />
        )}
      </View>

      <BibleActionsDrawer
        visible={isActionsVisible}
        onClose={() => setIsActionsVisible(false)}
        title="Ações"
        items={screenView === "detail" ? detailActionsItems : actionsItems}
      />

      <BibleDrawerMenu
        visible={isDrawerVisible}
        activeItem="reading-plan"
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

      <BibleConfirmModal
        visible={isDeleteConfirmVisible}
        title="Excluir Planos"
        message={`Tem certeza que deseja excluir ${selectedDeleteIds.size} plano${selectedDeleteIds.size > 1 ? "s" : ""}? O progresso será perdido permanentemente.`}
        confirmText="Excluir"
        isDanger
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteConfirmVisible(false)}
      />

      <BibleConfirmModal
        visible={isStartDatePickerVisible}
        title="Início do plano"
        icon="calendar"
        message="Informe a data de início do plano:"
        confirmText="Confirmar"
        onConfirm={handleConfirmStartDate}
        onCancel={() => {
          setIsStartDatePickerVisible(false);
          setStartDatePlanId(null);
        }}
        customContent={
          <View style={{ marginTop: ms(DESIGN.spacing.md) }}>
            <DateInputField
              value={pendingStartDate}
              onChangeText={setPendingStartDate}
              colors={colors}
              ms={ms}
              DESIGN={DESIGN}
              styles={styles}
            />
          </View>
        }
      />

      <BiblePageModal
        visible={isTemplateModalVisible}
        onClose={() => setIsTemplateModalVisible(false)}
        header={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <BibleIcon
              name="list"
              size={ms(DESIGN.spacing.lg)}
              color={colors.primary}
              backgroundColor={colors.primary + "25"}
              style={{ marginRight: ms(DESIGN.spacing.sm) }}
            />
            <BibleText
              style={{
                flex: 1,
                fontSize: ms(DESIGN.fontSize.lg),
                fontWeight: "800",
                color: colors.primary,
              }}
            >
              Escolher Plano
            </BibleText>
            <BibleIcon
              name="x"
              color={colors.error}
              backgroundColor={colors.error + "20"}
              onPress={() => setIsTemplateModalVisible(false)}
              style={{ marginLeft: "auto" }}
            />
          </View>
        }
        fullHeight={true}
      >
        <FlashList
          data={groupedTemplates}
          keyExtractor={(t) => t.id}
          // @ts-ignore
          estimatedItemSize={ms(110)}
          renderItem={renderTemplateItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: ms(DESIGN.spacing.lg) },
          ]}
          showsVerticalScrollIndicator={false}
        />
      </BiblePageModal>

      <BiblePageModal
        visible={isChapterModalVisible}
        onClose={() => setIsChapterModalVisible(false)}
        header={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <BibleIcon
              name="book-open"
              size={ms(DESIGN.spacing.lg)}
              color={colors.primary}
              backgroundColor={colors.primary + "25"}
              style={{ marginRight: ms(DESIGN.spacing.sm) }}
            />
            <BibleText
              style={{
                flex: 1,
                fontSize: ms(DESIGN.fontSize.lg),
                fontWeight: "800",
                color: colors.primary,
              }}
            >
              Dia {selectedDayInfo?.day}
            </BibleText>
            <BibleIcon
              name="x"
              color={colors.error}
              backgroundColor={colors.error + "20"}
              onPress={() => setIsChapterModalVisible(false)}
              style={{ marginLeft: "auto" }}
            />
          </View>
        }
        footer={
          selectedDayInfo && selectedPlan
            ? (() => {
                const isAllCompleted = isDayCompleted(
                  selectedPlan,
                  selectedDayInfo.monthNumber,
                  selectedDayInfo.day,
                );
                return (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: ms(DESIGN.spacing.md),
                      backgroundColor: isAllCompleted
                        ? colors.surface
                        : colors.primary + "15",
                      borderWidth: 1,
                      borderColor: isAllCompleted
                        ? colors.border
                        : colors.primary + "30",
                      borderRadius: ms(DESIGN.borderRadius.md),
                      marginHorizontal: ms(DESIGN.spacing.sm),
                    }}
                    onPress={() =>
                      toggleAllChaptersForDay(
                        selectedPlan.id,
                        selectedDayInfo.monthNumber,
                        selectedDayInfo,
                        !isAllCompleted,
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <BibleText
                      style={{
                        color: isAllCompleted
                          ? colors.textMuted
                          : colors.primary,
                        fontWeight: "700",
                        fontSize: ms(DESIGN.fontSize.md),
                      }}
                    >
                      {isAllCompleted
                        ? "Desmarcar todos"
                        : "Marcar todos como lidos"}
                    </BibleText>
                  </TouchableOpacity>
                );
              })()
            : null
        }
        fullHeight={false}
      >
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedDayInfo &&
            selectedDayInfo.books.map((book) => {
              const chapters =
                book.chapters ?? book.verses?.map((v) => v.chapter) ?? [];
              return chapters.map((chapter) => {
                const isCompleted = selectedPlan
                  ? isChapterCompleted(
                      selectedPlan,
                      selectedDayInfo.monthNumber,
                      selectedDayInfo.day,
                      book.abbrev,
                      chapter,
                    )
                  : false;
                return (
                  <TouchableOpacity
                    key={`${book.abbrev}-${chapter}`}
                    style={[
                      styles.dayCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        shadowColor: colors.shadow,
                      },
                    ]}
                    onPress={() =>
                      handleNavigateToChapter(book.abbrev, chapter)
                    }
                    activeOpacity={0.7}
                  >
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        {
                          borderColor: isCompleted
                            ? colors.primary
                            : colors.border,
                          backgroundColor: isCompleted
                            ? colors.primary
                            : "transparent",
                        },
                      ]}
                      onPress={() => {
                        if (selectedPlan) {
                          toggleChapter(
                            selectedPlan.id,
                            selectedDayInfo.monthNumber,
                            selectedDayInfo,
                            book.abbrev,
                            chapter,
                          );
                        }
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      {isCompleted && (
                        <BibleIcon
                          name="check"
                          size={ms(DESIGN.fontSize.md)}
                          color={colors.onPrimary}
                        />
                      )}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <BibleText
                        style={{
                          fontSize: ms(DESIGN.fontSize.md),
                          color: isCompleted
                            ? colors.textMuted
                            : colors.onSurface,
                          fontWeight: "600",
                        }}
                      >
                        {book.name} {chapter}
                      </BibleText>
                    </View>
                    <BibleIcon
                      name="chevron-right"
                      color={colors.textMuted}
                      size={ms(DESIGN.fontSize.xl)}
                    />
                  </TouchableOpacity>
                );
              });
            })}
        </ScrollView>
      </BiblePageModal>

      <BibleToast opacity={opacity} toast={toast} />
    </View>
  );
}

function formatDateForInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function DateInputField({
  value,
  onChangeText,
  colors,
  ms,
  DESIGN,
  styles,
}: {
  value: string;
  onChangeText: (t: string) => void;
  colors: any;
  ms: (v: number) => number;
  DESIGN: any;
  styles: any;
}) {
  const handleChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "");
    let formatted = "";
    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else if (cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    onChangeText(formatted);
  };

  return (
    <TextInput
      value={value}
      onChangeText={handleChange}
      placeholder="DD/MM/AAAA"
      placeholderTextColor={colors.textMuted}
      keyboardType={Platform.OS === "web" ? "default" : "number-pad"}
      maxLength={10}
      style={[
        styles.dateInput,
        {
          borderColor: colors.border,
          color: colors.onSurface,
          fontSize: ms(DESIGN.fontSize.lg),
        },
      ]}
    />
  );
}
