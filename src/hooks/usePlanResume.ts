import { useCallback, useMemo } from "react";
import { DeviceEventEmitter } from "react-native";
import { BIBLE_PLAN_TEMPLATES } from "../data/bible-plan/biblePlanRegistry";
import { findResumeReading } from "../utils/planReading";
import { getPlanPosition } from "../utils/planReadingPositions";
import { useBible } from "./useBible";
import { useBiblePlan } from "./useBiblePlan";
import { PLAN_READING_NAVIGATED_EVENT } from "./usePlanReading";

export function usePlanResume() {
  const {
    activePlans,
    planReading,
    isDayCompleted,
    isChapterCompleted,
    startPlanReading,
  } = useBiblePlan();
  const { navigateTo } = useBible();

  const resume = useMemo(() => {
    if (planReading) return null;
    const found = activePlans.flatMap((plan) => {
      const template = BIBLE_PLAN_TEMPLATES.find(
        (t) => t.id === plan.templateId,
      );
      const next =
        template && !plan.pausedAt
          ? findResumeReading(
              template,
              (m, d) => isDayCompleted(plan, m, d),
              (m, d, a, c) => isChapterCompleted(plan, m, d, a, c),
            )
          : null;
      if (!template || !next) return [];
      return [
        {
          planId: plan.id,
          planTitle: plan.title,
          monthName:
            template.months.find((m) => m.monthNumber === next.monthNumber)
              ?.month ?? "",
          ...next,
        },
      ];
    });
    return found[0] ?? null;
  }, [activePlans, planReading, isDayCompleted, isChapterCompleted]);

  const start = useCallback(() => {
    if (!resume) return;
    startPlanReading(resume.planId, resume.monthNumber, resume.day.day);
    const verse = getPlanPosition(
      resume.chapter.abbrev,
      resume.chapter.chapter,
    );
    navigateTo({
      book: resume.chapter.abbrev,
      chapter: resume.chapter.chapter,
      verse,
    });
    DeviceEventEmitter.emit(PLAN_READING_NAVIGATED_EVENT, {
      chapter: resume.chapter.chapter,
      verse,
    });
  }, [resume, startPlanReading, navigateTo]);

  return {
    resume: resume
      ? {
          planTitle: resume.planTitle,
          monthName: resume.monthName,
          dayNumber: resume.day.day,
          label: `${resume.chapter.name} ${resume.chapter.chapter}`,
        }
      : null,
    start,
  };
}
