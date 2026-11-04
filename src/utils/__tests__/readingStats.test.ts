import { ActiveBiblePlan } from "../../models";
import { BiblePlanTemplate } from "../../models/BiblePlanModels";
import {
  getLongestStreak,
  getReadChapterKeys,
  getReadingDays,
} from "../readingStats";

const template = {
  id: "t",
  months: [
    {
      monthNumber: 1,
      days: [
        {
          day: 1,
          reading: "",
          books: [{ abbrev: "Gn", name: "G", chapters: [1, 2] }],
        },
        {
          day: 2,
          reading: "",
          books: [{ abbrev: "Ex", name: "E", chapters: [1] }],
        },
      ],
    },
  ],
} as unknown as BiblePlanTemplate;

const day = (d: number) => new Date(2026, 0, d, 15).getTime();

const plan = {
  id: "p",
  templateId: "t",
  completedDays: {
    "1-1": { isCompleted: true, completedAt: day(1) },
    "1-2": { isCompleted: false },
  },
  completedChapters: { "1-2-Ex-1": { isCompleted: true } },
} as unknown as ActiveBiblePlan;

describe("readingStats", () => {
  it("collects chapters from finished days and ticked chapters", () => {
    expect(getReadChapterKeys([plan], [template])).toEqual(
      new Set(["Gn-1", "Gn-2", "Ex-1"]),
    );
  });

  it("ignores plans whose template is unknown", () => {
    expect(getReadChapterKeys([plan], []).size).toBe(0);
  });

  it("finds the longest run of consecutive reading days", () => {
    expect(getLongestStreak([day(1), day(2), day(3), day(7), day(8)])).toBe(3);
    expect(getLongestStreak([])).toBe(0);
  });

  it("dedupes reading days across plans", () => {
    expect(getReadingDays([plan, plan])).toHaveLength(1);
  });
});
