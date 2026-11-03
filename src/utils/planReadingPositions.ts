import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../constants/storage";

let positions: Record<string, number> = {};

AsyncStorage.getItem(STORAGE_KEYS.PLAN_READING_POSITIONS)
  .then((raw) => {
    if (raw) positions = { ...JSON.parse(raw), ...positions };
  })
  .catch(() => {});

const keyOf = (abbrev: string, chapter: number) => `${abbrev}-${chapter}`;

export const getPlanPosition = (abbrev: string, chapter: number) =>
  positions[keyOf(abbrev, chapter)] ?? 1;

export const savePlanPosition = (
  abbrev: string,
  chapter: number,
  verse: number,
) => {
  if (getPlanPosition(abbrev, chapter) === verse) return;
  positions[keyOf(abbrev, chapter)] = verse;
  AsyncStorage.setItem(
    STORAGE_KEYS.PLAN_READING_POSITIONS,
    JSON.stringify(positions),
  ).catch(() => {});
};
