import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { DEFAULT_VOICE_ID } from "../constants/audioVoices";
import { isSafeVoiceId } from "../utils/sanitize";
import { ChapterAudioManifest } from "../models";

const IS_WEB = Platform.OS === "web";

export const AUDIO_EXTENSIONS = ["mp3", "wav", "flac"] as const;

const CHAPTER_DOWNLOAD_MAX_ATTEMPTS = 3;
const CHAPTER_DOWNLOAD_RETRY_BASE_DELAY_MS = 1200;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface LocalChapterAudio {
  abbrev: string;
  chapter: number;
}

export class AudioService {
  private static R2_ACCOUNT_ID = process.env.EXPO_PUBLIC_R2_ACCOUNT_ID;
  private static R2_BUCKET_NAME = process.env.EXPO_PUBLIC_R2_BUCKET_NAME;
  private static R2_PUBLIC_URL = process.env.EXPO_PUBLIC_R2_PUBLIC_URL;

  private static getR2BaseUrl(): string | null {
    if (this.R2_PUBLIC_URL) {
      return this.R2_PUBLIC_URL;
    }
    if (this.R2_ACCOUNT_ID && this.R2_BUCKET_NAME) {
      if (this.R2_ACCOUNT_ID.startsWith("http")) {
        return `${this.R2_ACCOUNT_ID}/${this.R2_BUCKET_NAME}`;
      }
      return `https://${this.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.R2_BUCKET_NAME}`;
    }
    return null;
  }

  private static getVoiceAudioPath(
    version: string,
    abbrev: string,
    chapter: number,
    voice: string,
    ext: string,
  ): string {
    const file = `${abbrev.toLowerCase()}-${chapter}`;
    return `${version.toLowerCase()}/audios/${voice}/${file}.${ext}`;
  }

  static async getVerseTimings(
    version: string,
    abbrev: string,
    chapter: number,
    voice?: string,
  ): Promise<ChapterAudioManifest | null> {
    const r2Base = this.getR2BaseUrl();
    if (!r2Base) return null;

    const path = this.getVoiceAudioPath(
      version,
      abbrev,
      chapter,
      voice ?? DEFAULT_VOICE_ID,
      "json",
    );
    const r2Url = `${r2Base}/${path}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(r2Url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) return null;
      return (await response.json()) as ChapterAudioManifest;
    } catch {
      return null;
    }
  }

  static getLocalAudioDir(version: string, voice: string): string {
    const safeVersion = isSafeVoiceId(version)
      ? version.toLowerCase()
      : "invalid";
    const safeVoice = isSafeVoiceId(voice) ? voice : DEFAULT_VOICE_ID;
    return `${FileSystem.documentDirectory}audios/${safeVersion}/${safeVoice}/`;
  }

  static async ensureLocalAudioDir(
    version: string,
    voice: string,
  ): Promise<string> {
    const dir = this.getLocalAudioDir(version, voice);
    if (IS_WEB) return dir;
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
    return dir;
  }

  static async findLocalAudioUri(
    version: string,
    abbrev: string,
    chapter: number,
    voice: string,
  ): Promise<string | null> {
    if (IS_WEB) return null;
    const dir = this.getLocalAudioDir(version, voice);
    for (const ext of AUDIO_EXTENSIONS) {
      const uri = `${dir}${abbrev.toLowerCase()}-${chapter}.${ext}`;
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (info.exists && info.size > 0) return uri;
      } catch {}
    }
    return null;
  }

  static async downloadChapterAudio(
    version: string,
    abbrev: string,
    chapter: number,
    voice: string,
    onProgress?: (bytesWritten: number, bytesTotal: number) => void,
  ): Promise<string | null> {
    const existing = await this.findLocalAudioUri(
      version,
      abbrev,
      chapter,
      voice,
    );
    if (existing) return existing;

    for (let attempt = 1; attempt <= CHAPTER_DOWNLOAD_MAX_ATTEMPTS; attempt++) {
      const outcome = await this.attemptChapterDownload(
        version,
        abbrev,
        chapter,
        voice,
        onProgress,
      );
      if (outcome.status === "ok") return outcome.uri;
      if (outcome.status === "unavailable") return null;
      if (attempt < CHAPTER_DOWNLOAD_MAX_ATTEMPTS) {
        await delay(CHAPTER_DOWNLOAD_RETRY_BASE_DELAY_MS * attempt);
      }
    }
    return null;
  }

  private static buildChapterAudioUrls(
    version: string,
    abbrev: string,
    chapter: number,
    voice: string,
  ): string[] {
    const r2Base = this.getR2BaseUrl();
    if (!r2Base) return [];
    const resolvedVoice = voice || DEFAULT_VOICE_ID;
    return AUDIO_EXTENSIONS.map(
      (ext) =>
        `${r2Base}/${this.getVoiceAudioPath(
          version,
          abbrev,
          chapter,
          resolvedVoice,
          ext,
        )}`,
    );
  }

  private static async attemptChapterDownload(
    version: string,
    abbrev: string,
    chapter: number,
    voice: string,
    onProgress?: (bytesWritten: number, bytesTotal: number) => void,
  ): Promise<
    | { status: "ok"; uri: string }
    | { status: "unavailable" }
    | { status: "error" }
  > {
    const candidates = this.buildChapterAudioUrls(
      version,
      abbrev,
      chapter,
      voice,
    );
    if (candidates.length === 0) return { status: "unavailable" };

    if (IS_WEB) return { status: "ok", uri: candidates[0] };

    const dir = await this.ensureLocalAudioDir(version, voice);
    let sawServerError = false;

    for (const remoteUrl of candidates) {
      const ext = remoteUrl.split("?")[0].split(".").pop() || "mp3";
      const localUri = `${dir}${abbrev.toLowerCase()}-${chapter}.${ext}`;

      try {
        const resumable = FileSystem.createDownloadResumable(
          remoteUrl,
          localUri,
          {},
          onProgress
            ? (data) =>
                onProgress(
                  data.totalBytesWritten,
                  data.totalBytesExpectedToWrite,
                )
            : undefined,
        );
        const result = await resumable.downloadAsync();

        if (!result?.uri) continue;

        if (result.status === 404 || result.status === 403) {
          await FileSystem.deleteAsync(result.uri, { idempotent: true });
          continue;
        }
        if (result.status && result.status >= 400) {
          await FileSystem.deleteAsync(result.uri, { idempotent: true });
          sawServerError = true;
          continue;
        }

        const info = await FileSystem.getInfoAsync(result.uri);
        if (!info.exists || info.size === 0) {
          await FileSystem.deleteAsync(result.uri, { idempotent: true });
          sawServerError = true;
          continue;
        }

        return { status: "ok", uri: result.uri };
      } catch {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
        sawServerError = true;
      }
    }

    return sawServerError ? { status: "error" } : { status: "unavailable" };
  }

  static async deleteChapterAudio(
    version: string,
    abbrev: string,
    chapter: number,
    voice: string,
  ): Promise<void> {
    if (IS_WEB) return;
    const uri = await this.findLocalAudioUri(version, abbrev, chapter, voice);
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
  }

  static async deleteVersionAudio(
    version: string,
    voice: string,
  ): Promise<void> {
    if (IS_WEB) return;
    const dir = this.getLocalAudioDir(version, voice);
    await FileSystem.deleteAsync(dir, { idempotent: true });
  }

  static async listDownloadedChapters(
    version: string,
    voice: string,
  ): Promise<LocalChapterAudio[]> {
    if (IS_WEB) return [];
    const dir = this.getLocalAudioDir(version, voice);
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) return [];
      const files = await FileSystem.readDirectoryAsync(dir);
      const result: LocalChapterAudio[] = [];
      for (const file of files) {
        const base = file.replace(/\.(flac|wav|mp3)$/i, "");
        const idx = base.lastIndexOf("-");
        if (idx === -1) continue;
        const abbrev = base.slice(0, idx);
        const chapter = Number(base.slice(idx + 1));
        if (!abbrev || !Number.isFinite(chapter)) continue;
        result.push({ abbrev, chapter });
      }
      return result;
    } catch {
      return [];
    }
  }

  static async getVersionDownloadedSize(
    version: string,
    voice: string,
  ): Promise<number> {
    if (IS_WEB) return 0;
    const dir = this.getLocalAudioDir(version, voice);
    try {
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) return 0;
      const files = await FileSystem.readDirectoryAsync(dir);
      let total = 0;
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${dir}${file}`);
        if (fileInfo.exists) total += fileInfo.size;
      }
      return total;
    } catch {
      return 0;
    }
  }
}
