import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/storage";
import { DAILY_VERSES } from "../data/daily-verses";
import { getBibleData } from "../data/bible-version";

const DEFAULT_VERSION = "NAA";
const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyVerse = {
  reference: string;
  text: string;
  uri: string;
};

export const getDailyVerseIndex = (date: Date): number =>
  Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS,
  ) % DAILY_VERSES.length;

export const buildDailyVerse = (
  version: string,
  date: Date = new Date(),
): DailyVerse | null => {
  const ref = DAILY_VERSES[getDailyVerseIndex(date)];
  const book = getBibleData(version).find((b) => b.abbrev === ref.abbrev);
  const text = book?.chapters[ref.chapter - 1]?.[ref.verse - 1];
  if (!book || !text) return null;
  return {
    reference: `${book.name} ${ref.chapter}:${ref.verse}`,
    text,
    uri: `holybible://bible/${version}/${encodeURIComponent(ref.abbrev)}/${ref.chapter}?verse=${ref.verse}`,
  };
};

export const getDailyVerse = async (
  date: Date = new Date(),
): Promise<DailyVerse | null> => {
  let version = DEFAULT_VERSION;
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_READ);
    version = (saved && JSON.parse(saved).version) || DEFAULT_VERSION;
  } catch {}
  return (
    buildDailyVerse(version, date) ?? buildDailyVerse(DEFAULT_VERSION, date)
  );
};
