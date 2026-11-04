import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { STORAGE_KEYS } from "../constants/storage";
import { VerseCollection, VerseReference } from "../models";
import { BACKUP_RESTORED_EVENT, writeAutoBackupFile } from "../utils/backup";

const COLLECTIONS_UPDATED_EVENT = "COLLECTIONS_UPDATED_EVENT";

export const getCollectionVerseKey = (v: VerseReference) =>
  `${v.version}-${v.bookAbbrev}-${v.chapter}-${v.verse}`;

const makeId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

const mergeVerses = (current: VerseReference[], added: VerseReference[]) => {
  const keys = new Set(current.map(getCollectionVerseKey));
  const fresh = added.filter((v) => !keys.has(getCollectionVerseKey(v)));
  const ordered = fresh.sort((a, b) =>
    a.chapter !== b.chapter ? a.chapter - b.chapter : a.verse - b.verse,
  );
  return [...current, ...ordered];
};

export function useCollections() {
  const [collections, setCollections] = useState<VerseCollection[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const instanceId = useMemo(() => makeId(), []);

  const reloadFromStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTIONS);
      const parsed = raw ? JSON.parse(raw) : [];
      setCollections(Array.isArray(parsed) ? parsed : []);
    } catch {
      setCollections([]);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    reloadFromStorage();
    const subBackup = DeviceEventEmitter.addListener(
      BACKUP_RESTORED_EVENT,
      reloadFromStorage,
    );
    const subUpdate = DeviceEventEmitter.addListener(
      COLLECTIONS_UPDATED_EVENT,
      (data?: { senderId?: string }) => {
        if (data?.senderId !== instanceId) reloadFromStorage();
      },
    );
    return () => {
      subBackup.remove();
      subUpdate.remove();
    };
  }, [reloadFromStorage, instanceId]);

  const persist = useCallback(
    (updated: VerseCollection[]) => {
      setCollections(updated);
      AsyncStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(updated))
        .then(() =>
          DeviceEventEmitter.emit(COLLECTIONS_UPDATED_EVENT, {
            senderId: instanceId,
          }),
        )
        .catch(() => {});
      AsyncStorage.getItem(STORAGE_KEYS.AUTO_BACKUP)
        .then((val) => {
          if (val === "true") writeAutoBackupFile().catch(() => {});
        })
        .catch(() => {});
    },
    [instanceId],
  );

  const createCollection = useCallback(
    (name: string, verses: VerseReference[] = []) => {
      const now = Date.now();
      const collection: VerseCollection = {
        id: makeId(),
        name: name.trim(),
        createdAt: now,
        updatedAt: now,
        verses: mergeVerses([], verses),
      };
      persist([collection, ...collections]);
      return collection.id;
    },
    [collections, persist],
  );

  const addVerses = useCallback(
    (id: string, verses: VerseReference[]) =>
      persist(
        collections.map((c) =>
          c.id === id
            ? {
                ...c,
                verses: mergeVerses(c.verses, verses),
                updatedAt: Date.now(),
              }
            : c,
        ),
      ),
    [collections, persist],
  );

  const removeVerse = useCallback(
    (id: string, verse: VerseReference) =>
      persist(
        collections.map((c) =>
          c.id === id
            ? {
                ...c,
                verses: c.verses.filter(
                  (v) =>
                    getCollectionVerseKey(v) !== getCollectionVerseKey(verse),
                ),
                updatedAt: Date.now(),
              }
            : c,
        ),
      ),
    [collections, persist],
  );

  const deleteCollection = useCallback(
    (id: string) => persist(collections.filter((c) => c.id !== id)),
    [collections, persist],
  );

  return {
    collections,
    isLoaded,
    createCollection,
    addVerses,
    removeVerse,
    deleteCollection,
    reloadFromStorage,
  };
}
