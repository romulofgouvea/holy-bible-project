import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/storage";
import { getBibleData } from "../data/bible-version";
import { BIBLE_PLAN_TEMPLATES } from "../data/bible-plan/biblePlanRegistry";
import { ActiveBiblePlan } from "../models";
import { findResumeReading, getReadingStreak } from "./planReading";
import {
  getLongestStreak,
  getReadChapterKeys,
  getReadingDays,
} from "./readingStats";

export type WidgetCard = {
  title: string;
  body: string;
  footer?: string;
  uri?: string;
};

const buildUri = (
  version: string,
  abbrev: string,
  chapter: number,
  verse: number,
) =>
  `holybible://bible/${version}/${encodeURIComponent(abbrev)}/${chapter}?verse=${verse}`;

export const getLastReadCard = async (): Promise<WidgetCard | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_READ);
    if (!raw) return null;
    const { version, book, chapter, verse } = JSON.parse(raw);
    const found = getBibleData(version).find((b) => b.abbrev === book);
    const text = found?.chapters[chapter - 1]?.[(verse || 1) - 1];
    if (!found || !text) return null;
    return {
      title: "Continuar leitura",
      body: `“${text}”`,
      footer: `${found.name} ${chapter}:${verse || 1} · ${version}`,
      uri: buildUri(version, book, chapter, verse || 1),
    };
  } catch {
    return null;
  }
};

export const getPlanCard = async (): Promise<WidgetCard | null> => {
  try {
    const [rawPlans, rawRead] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.READING_PLAN + "_bible_plans"),
      AsyncStorage.getItem(STORAGE_KEYS.CURRENT_READ),
    ]);
    const plans: ActiveBiblePlan[] = rawPlans ? JSON.parse(rawPlans) : [];
    const version = (rawRead && JSON.parse(rawRead).version) || "NAA";
    for (const plan of plans) {
      const template = BIBLE_PLAN_TEMPLATES.find(
        (t) => t.id === plan.templateId,
      );
      if (!template || plan.pausedAt) continue;
      const next = findResumeReading(
        template,
        (m, d) => !!plan.completedDays[`${m}-${d}`]?.isCompleted,
        (m, d, a, c) =>
          !!plan.completedChapters?.[`${m}-${d}-${a}-${c}`]?.isCompleted,
      );
      if (!next) continue;
      return {
        title: plan.title,
        body: `Dia ${next.day.day}: ${next.day.reading}`,
        footer: `Continuar em ${next.chapter.name} ${next.chapter.chapter}`,
        uri: buildUri(version, next.chapter.abbrev, next.chapter.chapter, 1),
      };
    }
    return plans.length
      ? { title: "Plano de leitura", body: "Nenhuma leitura pendente" }
      : null;
  } catch {
    return null;
  }
};

export const getStatsCard = async (): Promise<WidgetCard | null> => {
  try {
    const raw = await AsyncStorage.getItem(
      STORAGE_KEYS.READING_PLAN + "_bible_plans",
    );
    const plans: ActiveBiblePlan[] = raw ? JSON.parse(raw) : [];
    const days = getReadingDays(plans);
    const chapters = getReadChapterKeys(plans, BIBLE_PLAN_TEMPLATES).size;
    return {
      title: "Estatísticas",
      body: `${getReadingStreak(days)} dias seguidos\n${chapters} capítulos lidos`,
      footer: `Melhor sequência: ${getLongestStreak(days)} · ${days.length} dias de leitura`,
      uri: "holybible:///stats",
    };
  } catch {
    return null;
  }
};
