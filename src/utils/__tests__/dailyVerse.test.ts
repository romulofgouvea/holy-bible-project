import { DAILY_VERSES } from "../../data/daily-verses";
import { availableVersions } from "../../data/bible-version";
import { buildDailyVerse, getDailyVerseIndex } from "../dailyVerse";

jest.mock("../../data/bible-version", () => {
  const versions: {
    sigla: string;
  }[] = require("../../data/bible-version/bible-versions.json");
  return {
    availableVersions: versions.map((v) => v.sigla),
    getBibleData: (sigla: string) => {
      const data = require(`../../data/bible-version/${sigla}.json`);
      return data.books ?? data;
    },
  };
});

describe("dailyVerse", () => {
  it("resolves every curated verse in every user-facing version", () => {
    const daysSpan = Array.from(
      { length: DAILY_VERSES.length },
      (_, i) => new Date(2026, 0, 1 + i),
    );
    for (const version of availableVersions) {
      for (const date of daysSpan) {
        expect(buildDailyVerse(version, date)).not.toBeNull();
      }
    }
  });

  it("covers the whole list over consecutive days", () => {
    const seen = new Set(
      Array.from({ length: DAILY_VERSES.length }, (_, i) =>
        getDailyVerseIndex(new Date(2026, 0, 1 + i)),
      ),
    );
    expect(seen.size).toBe(DAILY_VERSES.length);
  });

  it("keeps the same verse for the whole day", () => {
    expect(getDailyVerseIndex(new Date(2026, 5, 1, 0, 1))).toBe(
      getDailyVerseIndex(new Date(2026, 5, 1, 23, 59)),
    );
  });

  it("builds a deep link to the verse", () => {
    const verse = buildDailyVerse("NAA", new Date(2026, 0, 1));
    expect(verse?.uri).toMatch(
      /^holybible:\/\/bible\/NAA\/.+\/\d+\?verse=\d+$/,
    );
  });
});
