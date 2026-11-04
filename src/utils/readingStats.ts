import { BiblePlanTemplate } from "../models/BiblePlanModels";
import { ActiveBiblePlan } from "../models";
import { getCompletionTimes, getDayChapters } from "./planReading";

const DAY_MS = 24 * 60 * 60 * 1000;

export const getReadChapterKeys = (
  plans: ActiveBiblePlan[],
  templates: BiblePlanTemplate[],
): Set<string> => {
  const keys = new Set<string>();
  for (const plan of plans) {
    const template = templates.find((t) => t.id === plan.templateId);
    if (!template) continue;
    for (const month of template.months) {
      for (const day of month.days) {
        const isDayDone =
          !!plan.completedDays[`${month.monthNumber}-${day.day}`]?.isCompleted;
        for (const c of getDayChapters(day)) {
          const isChapterDone =
            !!plan.completedChapters?.[
              `${month.monthNumber}-${day.day}-${c.abbrev}-${c.chapter}`
            ]?.isCompleted;
          if (isDayDone || isChapterDone) keys.add(`${c.abbrev}-${c.chapter}`);
        }
      }
    }
  }
  return keys;
};

export const getReadingDays = (plans: ActiveBiblePlan[]): number[] =>
  Array.from(
    new Set(
      plans
        .flatMap(getCompletionTimes)
        .map((t) => new Date(t).setHours(0, 0, 0, 0)),
    ),
  ).sort((a, b) => a - b);

export const getLongestStreak = (sortedDays: number[]): number => {
  let longest = 0;
  let current = 0;
  sortedDays.forEach((day, i) => {
    const isConsecutive =
      i > 0 && Math.round((day - sortedDays[i - 1]) / DAY_MS) === 1;
    current = isConsecutive ? current + 1 : 1;
    longest = Math.max(longest, current);
  });
  return longest;
};
