import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import { STORAGE_KEYS } from "../constants/storage";
import { availableVersions, getBibleData } from "../data/bible-version";

export const BACKUP_FORMAT_VERSION = 2;
export const BACKUP_RESTORED_EVENT = "app-backup-restored";

export type AppBackupPayload = {
  version: number;
  exportedAt: string;
  storage: Record<string, string | null>;
};

const BACKUP_EXCLUDED_KEYS: string[] = [
  STORAGE_KEYS.AUTO_BACKUP_FILE_URI,
  STORAGE_KEYS.APP_CLEARED,
];

export const BACKUP_STORAGE_KEYS = Object.values(STORAGE_KEYS).filter(
  (key) => !BACKUP_EXCLUDED_KEYS.includes(key),
);

export async function collectAppStorage(): Promise<
  Record<string, string | null>
> {
  const pairs = await AsyncStorage.multiGet(BACKUP_STORAGE_KEYS);
  const storage = Object.fromEntries(pairs.map(([key, value]) => [key, value]));
  const studies = storage[STORAGE_KEYS.STUDIES];
  if (studies) {
    try {
      const { inlineStudyImages } = require("./studyImages");
      const parsed = JSON.parse(studies);
      if (Array.isArray(parsed)) {
        storage[STORAGE_KEYS.STUDIES] = JSON.stringify(
          await Promise.all(
            parsed.map(async (study) =>
              typeof study?.content === "string"
                ? { ...study, content: await inlineStudyImages(study.content) }
                : study,
            ),
          ),
        );
      }
    } catch {}
  }
  return storage;
}

export async function buildAppBackupPayload(): Promise<AppBackupPayload> {
  return {
    version: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    storage: await collectAppStorage(),
  };
}

export async function buildAppBackupJson(pretty = true): Promise<string> {
  const payload = await buildAppBackupPayload();
  return JSON.stringify(payload, null, pretty ? 2 : 0);
}

export function parseBackupRaw(
  raw: string,
): AppBackupPayload | { legacyStudies: unknown[] } {
  const parsed = JSON.parse(raw);

  if (Array.isArray(parsed)) {
    return { legacyStudies: parsed };
  }

  if (
    parsed &&
    typeof parsed === "object" &&
    parsed.storage &&
    typeof parsed.storage === "object"
  ) {
    return {
      version: parsed.version ?? BACKUP_FORMAT_VERSION,
      exportedAt: parsed.exportedAt ?? new Date().toISOString(),
      storage: parsed.storage,
    };
  }

  throw new Error("INVALID_BACKUP_FORMAT");
}

export async function restoreAppStorage(
  storage: Record<string, string | null>,
): Promise<number> {
  const entries = Object.entries(storage).filter(
    ([key, value]) =>
      BACKUP_STORAGE_KEYS.includes(key) &&
      value !== null &&
      value !== undefined,
  ) as [string, string][];

  if (entries.length === 0) return 0;

  await AsyncStorage.multiSet(entries);
  DeviceEventEmitter.emit(BACKUP_RESTORED_EVENT);
  return entries.length;
}

export function countRestoredStudies(
  storage: Record<string, string | null>,
): number {
  const raw = storage[STORAGE_KEYS.STUDIES];
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

export async function writeAutoBackupFile(): Promise<void> {
  const { Platform } = require("react-native");
  if (Platform.OS === "web") return;

  const json = await buildAppBackupJson(true);
  const FileSystem = require("expo-file-system/legacy");

  if (Platform.OS === "android") {
    const fileUri = await AsyncStorage.getItem(
      STORAGE_KEYS.AUTO_BACKUP_FILE_URI,
    );
    if (fileUri) {
      await FileSystem.writeAsStringAsync(fileUri, json).catch(() => {});
    }
    return;
  }

  const path = `${FileSystem.documentDirectory}backup_estudos_automatico.json`;
  await FileSystem.writeAsStringAsync(path, json).catch(() => {});
}

export async function clearAllAppStorage(): Promise<void> {
  const firstVersion = availableVersions[0] || "NAA";
  const firstBook = getBibleData(firstVersion)[0]?.abbrev || "gn";

  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  DeviceEventEmitter.emit(BACKUP_RESTORED_EVENT);
}
