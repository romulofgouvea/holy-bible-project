import { useCallback, useMemo } from "react";
import { DeviceEventEmitter } from "react-native";
import { BIBLE_PLAN_TEMPLATES } from "../data/bible-plan/biblePlanRegistry";
import {
  findNextPlanReading,
  getDayChapters,
  NextPlanReading,
} from "../utils/planReading";
import { useBible } from "./useBible";
import { useBiblePlan } from "./useBiblePlan";

export const PLAN_READING_NAVIGATED_EVENT = "PlanReadingNavigated";

export type PlanReadingResult = {
  isDayDone: boolean;
  isPlanDone: boolean;
};

export function usePlanReading() {
  const {
    planReading,
    activePlans,
    isDayCompleted,
    isChapterCompleted,
    getBiblePlanStats,
    setChapterCompleted,
    startPlanReading,
    stopPlanReading,
  } = useBiblePlan();
  const { chapter, currentBook, navigateTo } = useBible();

  const state = useMemo(() => {
    if (!planReading) return null;
    const plan = activePlans.find((p) => p.id === planReading.planId);
    const template = BIBLE_PLAN_TEMPLATES.find(
      (t) => t.id === plan?.templateId,
    );
    const day = template?.months
      .find((m) => m.monthNumber === planReading.monthNumber)
      ?.days.find((d) => d.day === planReading.day);
    if (!plan || !template || !day) return null;
    const chapters = getDayChapters(day);
    const index = chapters.findIndex(
      (c) => c.abbrev === currentBook.abbrev && c.chapter === chapter,
    );
    if (index < 0) return null;
    const monthNumber = planReading.monthNumber;
    return {
      plan,
      day,
      chapters,
      index,
      monthNumber,
      monthName:
        template.months.find((m) => m.monthNumber === monthNumber)?.month ?? "",
      stats: getBiblePlanStats(plan, template.months),
      next: findNextPlanReading(
        template,
        monthNumber,
        day.day,
        currentBook.abbrev,
        chapter,
        (m, d, a, c) =>
          isDayCompleted(plan, m, d) || isChapterCompleted(plan, m, d, a, c),
      ),
    };
  }, [
    planReading,
    activePlans,
    currentBook.abbrev,
    chapter,
    getBiblePlanStats,
    isDayCompleted,
    isChapterCompleted,
  ]);

  const isChapterDone = state
    ? isChapterCompleted(
        state.plan,
        state.monthNumber,
        state.day.day,
        currentBook.abbrev,
        chapter,
      )
    : false;

  const dayChapters = useMemo(
    () =>
      state
        ? state.chapters.map((c, i) => ({
            key: `${c.abbrev}-${c.chapter}`,
            label: `${c.name} ${c.chapter}`,
            isCurrent: i === state.index,
            isDone: isChapterCompleted(
              state.plan,
              state.monthNumber,
              state.day.day,
              c.abbrev,
              c.chapter,
            ),
          }))
        : [],
    [state, isChapterCompleted],
  );

  const goTo = useCallback(
    (target: NextPlanReading) => {
      if (!state) return;
      if (target.isNewDay) {
        startPlanReading(state.plan.id, target.monthNumber, target.day.day);
      }
      navigateTo({
        book: target.chapter.abbrev,
        chapter: target.chapter.chapter,
        verse: 1,
      });
      DeviceEventEmitter.emit(PLAN_READING_NAVIGATED_EVENT);
    },
    [state, startPlanReading, navigateTo],
  );

  const goNext = useCallback(() => {
    if (state?.next) goTo(state.next);
  }, [state, goTo]);

  const completeAndGoNext = useCallback((): PlanReadingResult | null => {
    if (!state) return null;
    setChapterCompleted(
      state.plan.id,
      state.monthNumber,
      state.day,
      currentBook.abbrev,
      chapter,
      true,
    );
    if (state.next) goTo(state.next);
    else stopPlanReading();
    return {
      isDayDone: !state.next || state.next.isNewDay,
      isPlanDone: !state.next,
    };
  }, [
    state,
    setChapterCompleted,
    currentBook.abbrev,
    chapter,
    goTo,
    stopPlanReading,
  ]);

  return {
    isActive: !!state,
    planTitle: state?.plan.title ?? "",
    dayNumber: state?.day.day ?? 0,
    monthName: state?.monthName ?? "",
    position: state ? state.index + 1 : 0,
    total: state?.chapters.length ?? 0,
    dayChapters,
    completedDays: state?.stats.completedCount ?? 0,
    totalDays: state?.stats.totalDays ?? 0,
    progressPercent: state?.stats.progressPercent ?? 0,
    hasNext: !!state?.next,
    nextLabel: state?.next
      ? `${state.next.chapter.name} ${state.next.chapter.chapter}`
      : "",
    nextDayNumber: state?.next?.day.day ?? 0,
    nextIsNewDay: state?.next?.isNewDay ?? false,
    isChapterDone,
    goNext,
    completeAndGoNext,
  };
}
