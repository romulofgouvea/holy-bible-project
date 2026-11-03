import { BiblePlanDay, BiblePlanTemplate } from "../models/BiblePlanModels";

export type PlanChapter = { abbrev: string; name: string; chapter: number };

export type NextPlanReading = {
  monthNumber: number;
  day: BiblePlanDay;
  chapter: PlanChapter;
  isNewDay: boolean;
};

export type IsChapterRead = (
  monthNumber: number,
  day: number,
  abbrev: string,
  chapter: number,
) => boolean;

export const getDayChapters = (day: BiblePlanDay): PlanChapter[] =>
  day.books.flatMap((book) => {
    const chapters =
      book.chapters ??
      Array.from(new Set((book.verses ?? []).map((v) => v.chapter)));
    return chapters.map((chapter) => ({
      abbrev: book.abbrev,
      name: book.name,
      chapter,
    }));
  });

export const findNextPlanReading = (
  template: BiblePlanTemplate,
  monthNumber: number,
  dayNumber: number,
  abbrev: string,
  chapter: number,
  isRead: IsChapterRead,
): NextPlanReading | null => {
  const entries = template.months.flatMap((m) =>
    m.days.flatMap((day) =>
      getDayChapters(day).map((c) => ({
        monthNumber: m.monthNumber,
        day,
        chapter: c,
      })),
    ),
  );
  const current = entries.findIndex(
    (e) =>
      e.monthNumber === monthNumber &&
      e.day.day === dayNumber &&
      e.chapter.abbrev === abbrev &&
      e.chapter.chapter === chapter,
  );
  if (current < 0) return null;
  const isPending = (e: (typeof entries)[number]) =>
    !isRead(e.monthNumber, e.day.day, e.chapter.abbrev, e.chapter.chapter);
  const target =
    entries.slice(current + 1).find(isPending) ??
    entries.slice(0, current).find(isPending);
  if (!target) return null;
  return {
    ...target,
    isNewDay: !(
      target.monthNumber === monthNumber && target.day.day === dayNumber
    ),
  };
};

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (ms: number) => new Date(ms).setHours(0, 0, 0, 0);

export const getReadingStreak = (
  completedAts: number[],
  now: number = Date.now(),
): number => {
  const days = new Set(completedAts.map(startOfDay));
  const today = startOfDay(now);
  let cursor = days.has(today) ? today : today - DAY_MS;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = startOfDay(cursor - DAY_MS / 2);
  }
  return streak;
};

export const STREAK_MILESTONES = [7, 30, 100];

export const getCompletionTimes = (plan: {
  completedDays: Record<string, { isCompleted: boolean; completedAt?: number }>;
}): number[] =>
  Object.values(plan.completedDays).flatMap((d) =>
    d.isCompleted && d.completedAt ? [d.completedAt] : [],
  );

export const findResumeReading = (
  template: BiblePlanTemplate,
  isDayDone: (monthNumber: number, day: number) => boolean,
  isRead: IsChapterRead,
): Omit<NextPlanReading, "isNewDay"> | null => {
  for (const month of template.months) {
    for (const day of month.days) {
      if (isDayDone(month.monthNumber, day.day)) continue;
      const chapter = getDayChapters(day).find(
        (c) => !isRead(month.monthNumber, day.day, c.abbrev, c.chapter),
      );
      if (chapter) return { monthNumber: month.monthNumber, day, chapter };
    }
  }
  return null;
};
