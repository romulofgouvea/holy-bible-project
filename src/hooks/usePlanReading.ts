import { useCallback, useEffect, useMemo, useRef } from "react";
import { DeviceEventEmitter } from "react-native";
import { BIBLE_PLAN_TEMPLATES } from "../data/bible-plan/biblePlanRegistry";
import {
  findNextPlanReading,
  getDayChapters,
  NextPlanReading,
} from "../utils/planReading";
import {
  getPlanPosition,
  savePlanPosition,
} from "../utils/planReadingPositions";
import { useBible } from "./useBible";
import { useBiblePlan } from "./useBiblePlan";

export const PLAN_READING_NAVIGATED_EVENT = "PlanReadingNavigated";

export type PlanReadingResult = {
  isDayDone: boolean;
  isPlanDone: boolean;
  undo: () => void;
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
  const setChapterCompletedRef = useRef(setChapterCompleted);

  useEffect(() => {
    setChapterCompletedRef.current = setChapterCompleted;
  }, [setChapterCompleted]);

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

  const open = useCallback(
    (planId: string, target: NextPlanReading) => {
      if (target.isNewDay) {
        startPlanReading(planId, target.monthNumber, target.day.day);
      }
      const verse = getPlanPosition(
        target.chapter.abbrev,
        target.chapter.chapter,
      );
      navigateTo({
        book: target.chapter.abbrev,
        chapter: target.chapter.chapter,
        verse,
      });
      DeviceEventEmitter.emit(PLAN_READING_NAVIGATED_EVENT, {
        chapter: target.chapter.chapter,
        verse,
      });
    },
    [startPlanReading, navigateTo],
  );

  const goNext = useCallback(() => {
    if (state?.next) open(state.plan.id, state.next);
  }, [state, open]);

  const markDone = useCallback((): (() => void) | null => {
    if (!state) return null;
    const { plan, monthNumber, day } = state;
    const abbrev = currentBook.abbrev;
    const previousVerse = getPlanPosition(abbrev, chapter);
    setChapterCompleted(plan.id, monthNumber, day, abbrev, chapter, true);
    savePlanPosition(abbrev, chapter, 1);
    return () => {
      setChapterCompletedRef.current(
        plan.id,
        monthNumber,
        day,
        abbrev,
        chapter,
        false,
      );
      savePlanPosition(abbrev, chapter, previousVerse);
    };
  }, [state, setChapterCompleted, currentBook.abbrev, chapter]);

  const completeAndGoNext = useCallback((): PlanReadingResult | null => {
    if (!state) return null;
    const undoMark = markDone();
    if (!undoMark) return null;
    const origin: NextPlanReading = {
      monthNumber: state.monthNumber,
      day: state.day,
      chapter: state.chapters[state.index],
      isNewDay: state.next?.isNewDay ?? true,
    };
    const planId = state.plan.id;
    if (state.next) open(planId, state.next);
    else stopPlanReading();
    return {
      isDayDone: !state.next || state.next.isNewDay,
      isPlanDone: !state.next,
      undo: () => {
        undoMark();
        open(planId, origin);
      },
    };
  }, [state, markDone, open, stopPlanReading]);

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
    markDone,
    goNext,
    completeAndGoNext,
  };
}
