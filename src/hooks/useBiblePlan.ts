import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { STORAGE_KEYS } from "../constants/storage";
import { ActiveBiblePlan } from "../models";
import { BiblePlanMonth, BiblePlanTemplate } from "../models/BiblePlanModels";
import { BACKUP_RESTORED_EVENT, writeAutoBackupFile } from "../utils/backup";

const BIBLE_PLANS_KEY = STORAGE_KEYS.READING_PLAN + "_bible_plans";

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function dayKey(monthNumber: number, day: number): string {
  return `${monthNumber}-${day}`;
}

function chapterKey(
  monthNumber: number,
  day: number,
  abbrev: string,
  chapter: number,
): string {
  return `${monthNumber}-${day}-${abbrev}-${chapter}`;
}

function parsePlans(raw: string | null): ActiveBiblePlan[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useBiblePlan() {
  const [activePlans, setActivePlans] = useState<ActiveBiblePlan[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const reloadFromStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(BIBLE_PLANS_KEY);
      setActivePlans(parsePlans(raw));
    } catch {
      setActivePlans([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    reloadFromStorage();
    const sub = DeviceEventEmitter.addListener(
      BACKUP_RESTORED_EVENT,
      reloadFromStorage,
    );
    return () => sub.remove();
  }, [reloadFromStorage]);

  const persist = useCallback((updated: ActiveBiblePlan[]) => {
    setActivePlans(updated);
    AsyncStorage.setItem(BIBLE_PLANS_KEY, JSON.stringify(updated)).catch(
      () => {},
    );
    AsyncStorage.getItem(STORAGE_KEYS.AUTO_BACKUP)
      .then((val) => {
        if (val === "true") writeAutoBackupFile().catch(() => {});
      })
      .catch(() => {});
  }, []);

  const createBiblePlan = useCallback(
    (template: BiblePlanTemplate): ActiveBiblePlan => {
      const newPlan: ActiveBiblePlan = {
        id: makeId(),
        templateId: template.id,
        title: template.title,
        startedAt: Date.now(),
        completedDays: {},
        completedChapters: {},
      };
      persist([...activePlans, newPlan]);
      return newPlan;
    },
    [activePlans, persist],
  );

  const toggleDay = useCallback(
    (planId: string, monthNumber: number, day: number) => {
      const key = dayKey(monthNumber, day);
      persist(
        activePlans.map((p) => {
          if (p.id !== planId) return p;
          const existing = p.completedDays[key];
          const updated = { ...p.completedDays };
          if (existing?.isCompleted) {
            delete updated[key];
          } else {
            updated[key] = { isCompleted: true, completedAt: Date.now() };
          }
          return { ...p, completedDays: updated };
        }),
      );
    },
    [activePlans, persist],
  );

  const isDayCompleted = useCallback(
    (plan: ActiveBiblePlan, monthNumber: number, day: number): boolean => {
      return !!plan.completedDays[dayKey(monthNumber, day)]?.isCompleted;
    },
    [],
  );

  const getDayCompletedAt = useCallback(
    (
      plan: ActiveBiblePlan,
      monthNumber: number,
      day: number,
    ): number | undefined => {
      return plan.completedDays[dayKey(monthNumber, day)]?.completedAt;
    },
    [],
  );

  const toggleChapter = useCallback(
    (
      planId: string,
      monthNumber: number,
      dayInfo: any,
      abbrev: string,
      chapter: number,
    ) => {
      const key = chapterKey(monthNumber, dayInfo.day, abbrev, chapter);
      persist(
        activePlans.map((p) => {
          if (p.id !== planId) return p;
          const chapters = { ...(p.completedChapters || {}) };
          if (chapters[key]?.isCompleted) {
            delete chapters[key];
          } else {
            chapters[key] = { isCompleted: true, completedAt: Date.now() };
          }

          // check if day is fully read
          let isDayFullyRead = true;
          for (const book of dayInfo.books) {
            for (const chap of book.chapters || []) {
              if (
                !chapters[
                  chapterKey(monthNumber, dayInfo.day, book.abbrev, chap)
                ]?.isCompleted
              ) {
                isDayFullyRead = false;
                break;
              }
            }
            if (!isDayFullyRead) break;
          }

          const dKey = dayKey(monthNumber, dayInfo.day);
          const days = { ...p.completedDays };
          if (isDayFullyRead) {
            days[dKey] = { isCompleted: true, completedAt: Date.now() };
          } else {
            delete days[dKey];
          }

          return { ...p, completedChapters: chapters, completedDays: days };
        }),
      );
    },
    [activePlans, persist],
  );

  const toggleAllChaptersForDay = useCallback(
    (planId: string, monthNumber: number, dayInfo: any, status: boolean) => {
      persist(
        activePlans.map((p) => {
          if (p.id !== planId) return p;
          const chapters = { ...(p.completedChapters || {}) };

          for (const book of dayInfo.books) {
            const bookChapters =
              book.chapters ?? book.verses?.map((v: any) => v.chapter) ?? [];
            for (const chap of bookChapters) {
              const key = chapterKey(
                monthNumber,
                dayInfo.day,
                book.abbrev,
                chap,
              );
              if (status) {
                chapters[key] = { isCompleted: true, completedAt: Date.now() };
              } else {
                delete chapters[key];
              }
            }
          }

          const dKey = dayKey(monthNumber, dayInfo.day);
          const days = { ...p.completedDays };
          if (status) {
            days[dKey] = { isCompleted: true, completedAt: Date.now() };
          } else {
            delete days[dKey];
          }

          return { ...p, completedChapters: chapters, completedDays: days };
        }),
      );
    },
    [activePlans, persist],
  );

  const isChapterCompleted = useCallback(
    (
      plan: ActiveBiblePlan,
      monthNumber: number,
      day: number,
      abbrev: string,
      chapter: number,
    ): boolean => {
      return !!plan.completedChapters?.[
        chapterKey(monthNumber, day, abbrev, chapter)
      ]?.isCompleted;
    },
    [],
  );

  const removeBiblePlan = useCallback(
    (planId: string) => {
      persist(activePlans.filter((p) => p.id !== planId));
    },
    [activePlans, persist],
  );

  const removeBiblePlans = useCallback(
    (planIds: string[]) => {
      persist(activePlans.filter((p) => !planIds.includes(p.id)));
    },
    [activePlans, persist],
  );

  const clearAllBiblePlans = useCallback(() => {
    persist([]);
  }, [persist]);

  const updateStartDate = useCallback(
    (planId: string, timestamp: number) => {
      persist(
        activePlans.map((p) =>
          p.id !== planId ? p : { ...p, startedAt: timestamp },
        ),
      );
    },
    [activePlans, persist],
  );

  const pausePlan = useCallback(
    (planId: string) => {
      persist(
        activePlans.map((p) =>
          p.id !== planId || p.pausedAt ? p : { ...p, pausedAt: Date.now() },
        ),
      );
    },
    [activePlans, persist],
  );

  const resumePlan = useCallback(
    (planId: string) => {
      persist(
        activePlans.map((p) => {
          if (p.id !== planId || !p.pausedAt) return p;
          const { pausedAt, ...rest } = p;
          return {
            ...rest,
            pausedMs: (p.pausedMs ?? 0) + (Date.now() - pausedAt),
          };
        }),
      );
    },
    [activePlans, persist],
  );

  const getBiblePlanStats = useCallback(
    (plan: ActiveBiblePlan, months: BiblePlanMonth[]) => {
      const totalDays = months.reduce((acc, m) => acc + m.days.length, 0);
      const completedDaysList = Object.values(plan.completedDays).filter(
        (d) => d.isCompleted,
      );
      const completedCount = completedDaysList.length;
      let totalChapters = 0;
      let readChapters = 0;
      for (const month of months) {
        for (const day of month.days) {
          const isDayRead =
            !!plan.completedDays[dayKey(month.monthNumber, day.day)]
              ?.isCompleted;
          for (const book of day.books) {
            const chapters = new Set<number>(
              book.chapters ?? book.verses?.map((v) => v.chapter) ?? [],
            );
            totalChapters += chapters.size;
            for (const chapter of chapters) {
              if (
                isDayRead ||
                plan.completedChapters?.[
                  chapterKey(month.monthNumber, day.day, book.abbrev, chapter)
                ]?.isCompleted
              ) {
                readChapters++;
              }
            }
          }
        }
      }
      const progressPercent =
        totalChapters > 0
          ? Math.round((readChapters / totalChapters) * 100)
          : 0;
      const isPaused = !!plan.pausedAt;
      const isCompleted = totalDays > 0 && completedCount === totalDays;
      const completedAtMs = isCompleted
        ? Math.max(...completedDaysList.map((d) => d.completedAt ?? 0))
        : undefined;

      const startMidnight = new Date(plan.startedAt).setHours(0, 0, 0, 0);
      const effectiveNowMs = plan.pausedAt ?? Date.now();
      const pausedMs = plan.pausedMs ?? 0;
      const nowMidnight = new Date(effectiveNowMs - pausedMs).setHours(
        0,
        0,
        0,
        0,
      );
      const elapsedDays =
        Math.floor((nowMidnight - startMidnight) / (1000 * 60 * 60 * 24)) + 1;

      const differenceDays = completedCount - elapsedDays;
      const missedDays = Math.max(0, elapsedDays - 1 - completedCount);
      const delayDays = !isPaused && !isCompleted ? missedDays : 0;
      const aheadDays =
        !isPaused && !isCompleted && differenceDays > 0 ? differenceDays : 0;

      const expectedEndMs =
        startMidnight + (totalDays - 1) * 24 * 60 * 60 * 1000;
      const remainingDays = totalDays - completedCount;
      const hasReadingToday = completedCount < elapsedDays;
      const estimatedEndMs =
        nowMidnight +
        Math.max(0, hasReadingToday ? remainingDays - 1 : remainingDays) *
          24 *
          60 *
          60 *
          1000;

      return {
        totalDays,
        completedCount,
        totalChapters,
        readChapters,
        progressPercent,
        elapsed: elapsedDays,
        delayDays,
        aheadDays,
        expectedEndMs,
        estimatedEndMs,
        startedAt: plan.startedAt,
        isPaused,
        isCompleted,
        completedAtMs,
      };
    },
    [],
  );

  const getBiblePlanStreak = useCallback((plan: ActiveBiblePlan): number => {
    const dayMs = 24 * 60 * 60 * 1000;
    const completedDates = new Set(
      Object.values(plan.completedDays)
        .filter((d) => d.isCompleted && d.completedAt)
        .map((d) => new Date(d.completedAt as number).setHours(0, 0, 0, 0)),
    );
    if (completedDates.size === 0) return 0;

    let cursor = new Date(plan.pausedAt ?? Date.now()).setHours(0, 0, 0, 0);
    if (!completedDates.has(cursor)) {
      cursor -= dayMs;
      if (!completedDates.has(cursor)) return 0;
    }

    let streak = 0;
    while (completedDates.has(cursor)) {
      streak++;
      cursor -= dayMs;
    }
    return streak;
  }, []);

  return {
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
    clearAllBiblePlans,
    updateStartDate,
    pausePlan,
    resumePlan,
    getBiblePlanStats,
    getBiblePlanStreak,
    reloadFromStorage,
  };
}
