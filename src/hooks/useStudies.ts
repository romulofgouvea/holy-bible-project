import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { STORAGE_KEYS } from "../constants/storage";
import { Study } from "../models";
import { sanitizeHtml } from "../utils/sanitize";
import { BACKUP_RESTORED_EVENT, writeAutoBackupFile } from "../utils/backup";
export type { Study };

export const STUDIES_CHANGED_EVENT = "StudiesChanged";
export const STUDIES_STORAGE_LIMIT = 1_500_000;

export async function canStoreStudyData(extraLength: number) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDIES);
    return (raw?.length ?? 0) + extraLength <= STUDIES_STORAGE_LIMIT;
  } catch {
    return false;
  }
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function migrateBlocksToHtml(blocks: any[]) {
  if (!blocks || !Array.isArray(blocks)) return "<p><br></p>";
  return (
    blocks
      .map((b) => {
        if (b.type === "header") return `<h2>${b.content || ""}</h2>`;
        if (b.type === "h1") return `<h3>${b.content || ""}</h3>`;
        if (b.type === "h2") return `<h4>${b.content || ""}</h4>`;
        if (b.type === "paragraph") return `<p>${b.content || "<br>"}</p>`;
        if (b.type === "image")
          return `<img src="${b.uri || ""}" style="max-width:100%; border-radius:8px;"/>`;
        if (b.type === "video")
          return `<a href="${b.url || ""}">🎬 ${b.title || ""}</a>`;
        if (b.type === "verse") {
          const lines = (b.content || "")
            .split("\n")
            .map((line: string) => {
              const sp = line.indexOf(" ");
              if (sp === -1) return line;
              return `<div class="verse-line"><span class="verse-num">${line.slice(0, sp)}</span> <span class="verse-text">${line.slice(sp + 1)}</span></div>`;
            })
            .join("");
          return `<blockquote class="bible-verse"><b>${b.verseRef || ""}</b>${lines}</blockquote><p><br></p>`;
        }
        return "";
      })
      .join("") || "<p><br></p>"
  );
}

function parseStudiesFromRaw(raw: string | null): Study[] {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  return parsed
    .filter((s: any) => {
      if (
        s.isActive === false &&
        s.deletedAt &&
        now - s.deletedAt > THIRTY_DAYS
      )
        return false;
      return true;
    })
    .map((s: any) => {
      if (s.blocks && (!s.content || s.content.trim() === "")) {
        s.content = migrateBlocksToHtml(s.blocks);
      }
      if (!s.content) s.content = "<p><br></p>";
      delete s.blocks;
      return s as Study;
    });
}

export function useStudies() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const reloadFromStorage = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDIES);
      setStudies(parseStudiesFromRaw(raw));
    } catch {
      setStudies([]);
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
    const changedSub = DeviceEventEmitter.addListener(
      STUDIES_CHANGED_EVENT,
      reloadFromStorage,
    );
    return () => {
      sub.remove();
      changedSub.remove();
    };
  }, [reloadFromStorage]);

  const persist = useCallback((updated: Study[]) => {
    setStudies(updated);
    AsyncStorage.setItem(STORAGE_KEYS.STUDIES, JSON.stringify(updated))
      .then(() => DeviceEventEmitter.emit(STUDIES_CHANGED_EVENT))
      .catch(() => DeviceEventEmitter.emit(STUDIES_CHANGED_EVENT));

    AsyncStorage.getItem(STORAGE_KEYS.AUTO_BACKUP)
      .then((val) => {
        if (val === "true") writeAutoBackupFile().catch(() => {});
      })
      .catch(() => {});
  }, []);

  const mutate = useCallback(
    async (change: (current: Study[]) => Study[]) => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDIES);
      persist(change(parseStudiesFromRaw(raw)));
    },
    [persist],
  );

  const createStudy = useCallback(
    (title: string, content?: string, description?: string) => {
      let finalContent = "<p><br></p>";
      if (description && content) {
        finalContent = `<p>${description}</p>${content}`;
      } else if (description) {
        finalContent = `<p>${description}</p>`;
      } else if (content) {
        finalContent = content;
      }

      const study: Study = {
        id: makeId(),
        title,
        createdAt: new Date().toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }),
        timestamp: Date.now(),
        content: finalContent,
        isActive: true,
      };
      mutate((current) => [study, ...current]);
      return study.id;
    },
    [mutate],
  );

  const importBulk = useCallback(
    (importedStudies: any[]) => {
      const existingIds = new Set(studies.map((s) => s.id));
      const newStudies: Study[] = importedStudies
        .filter(
          (s) =>
            s.id &&
            s.title &&
            (s.content !== undefined || s.blocks) &&
            !existingIds.has(s.id),
        )
        .map((s) => {
          if (s.blocks && (!s.content || s.content.trim() === "")) {
            s.content = migrateBlocksToHtml(s.blocks);
          }
          if (!s.content) s.content = "<p><br></p>";
          delete s.blocks;
          return {
            id: s.id,
            title: s.title,
            createdAt:
              s.createdAt ||
              new Date().toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              }),
            timestamp: s.timestamp || Date.now(),
            content: sanitizeHtml(s.content),
            isActive: s.isActive !== false,
          };
        });

      if (newStudies.length > 0) {
        mutate((current) => {
          const currentIds = new Set(current.map((s) => s.id));
          const combined = [
            ...newStudies.filter((s) => !currentIds.has(s.id)),
            ...current,
          ];
          combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          return combined;
        });
      }
      return newStudies.length;
    },
    [studies, mutate],
  );

  const updateStudy = useCallback(
    (id: string, content: string, title?: string) => {
      mutate((current) =>
        current.map((s) =>
          s.id === id
            ? { ...s, content, ...(title !== undefined ? { title } : {}) }
            : s,
        ),
      );
    },
    [mutate],
  );

  const appendToStudy = useCallback(
    async (id: string, html: string) => {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDIES);
      if ((raw?.length ?? 0) + html.length > STUDIES_STORAGE_LIMIT) {
        return false;
      }
      persist(
        parseStudiesFromRaw(raw).map((s) =>
          s.id === id ? { ...s, content: s.content + html } : s,
        ),
      );
      return true;
    },
    [persist],
  );

  const deleteStudy = useCallback(
    (id: string) => {
      mutate((current) =>
        current.map((s) =>
          s.id === id ? { ...s, isActive: false, deletedAt: Date.now() } : s,
        ),
      );
    },
    [mutate],
  );

  const deleteMultiple = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      mutate((current) =>
        current.map((s) =>
          idSet.has(s.id)
            ? { ...s, isActive: false, deletedAt: Date.now() }
            : s,
        ),
      );
    },
    [mutate],
  );

  const restoreMultiple = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      mutate((current) =>
        current.map((s) =>
          idSet.has(s.id) ? { ...s, isActive: true, deletedAt: undefined } : s,
        ),
      );
    },
    [mutate],
  );

  const deleteMultiplePermanently = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      mutate((current) => current.filter((s) => !idSet.has(s.id)));
    },
    [mutate],
  );

  const getStudy = useCallback(
    (id: string) => {
      return studies.find((s) => s.id === id);
    },
    [studies],
  );

  const activeStudies = studies.filter((s) => s.isActive !== false);
  const trashedStudies = studies.filter((s) => s.isActive === false);

  return {
    studies: activeStudies,
    trashedStudies,
    allStudies: studies,
    isLoaded,
    createStudy,
    importBulk,
    reloadFromStorage,
    updateStudy,
    appendToStudy,
    deleteStudy,
    deleteMultiple,
    restoreMultiple,
    deleteMultiplePermanently,
    getStudy,
  };
}
