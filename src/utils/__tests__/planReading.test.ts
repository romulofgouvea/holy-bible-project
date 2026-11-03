import { BiblePlanTemplate } from "../../models/BiblePlanModels";
import { findNextPlanReading, getDayChapters } from "../planReading";

const template: BiblePlanTemplate = {
  id: "t",
  title: "T",
  description: "",
  icon: "book",
  months: [
    {
      monthNumber: 1,
      month: "Janeiro",
      theme: "",
      days: [
        {
          day: 1,
          reading: "Gn 1-2",
          books: [{ abbrev: "gn", name: "Gênesis", chapters: [1, 2] }],
        },
        {
          day: 2,
          reading: "Gn 3",
          books: [{ abbrev: "gn", name: "Gênesis", chapters: [3] }],
        },
      ],
    },
    {
      monthNumber: 2,
      month: "Fevereiro",
      theme: "",
      days: [
        {
          day: 1,
          reading: "Ex 1",
          books: [{ abbrev: "ex", name: "Êxodo", chapters: [1] }],
        },
      ],
    },
  ],
};

const nothingRead = () => false;
const readSet =
  (...keys: string[]) =>
  (month: number, day: number, abbrev: string, chapter: number) =>
    keys.includes(`${month}-${day}-${abbrev}-${chapter}`);

describe("plan reading", () => {
  it("lists the chapters of a day", () => {
    expect(getDayChapters(template.months[0].days[0])).toEqual([
      { abbrev: "gn", name: "Gênesis", chapter: 1 },
      { abbrev: "gn", name: "Gênesis", chapter: 2 },
    ]);
  });

  it("moves to the next chapter of the same day", () => {
    const next = findNextPlanReading(template, 1, 1, "gn", 1, nothingRead);
    expect(next?.chapter.chapter).toBe(2);
    expect(next?.isNewDay).toBe(false);
  });

  it("moves to the next day and across months", () => {
    const nextDay = findNextPlanReading(template, 1, 1, "gn", 2, nothingRead);
    expect(nextDay).toMatchObject({ monthNumber: 1, isNewDay: true });
    expect(nextDay?.day.day).toBe(2);
    const nextMonth = findNextPlanReading(template, 1, 2, "gn", 3, nothingRead);
    expect(nextMonth).toMatchObject({ monthNumber: 2, isNewDay: true });
  });

  it("skips chapters that are already read", () => {
    const next = findNextPlanReading(
      template,
      1,
      1,
      "gn",
      1,
      readSet("1-1-gn-2", "1-2-gn-3"),
    );
    expect(next?.chapter).toMatchObject({ abbrev: "ex", chapter: 1 });
    expect(next?.monthNumber).toBe(2);
  });

  it("goes back to an earlier unread chapter when nothing is left ahead", () => {
    const next = findNextPlanReading(
      template,
      2,
      1,
      "ex",
      1,
      readSet("1-1-gn-2", "1-2-gn-3"),
    );
    expect(next?.chapter).toMatchObject({ abbrev: "gn", chapter: 1 });
    expect(next?.isNewDay).toBe(true);
  });

  it("returns null when everything else is read or the position is unknown", () => {
    const allRead = () => true;
    expect(findNextPlanReading(template, 2, 1, "ex", 1, allRead)).toBeNull();
    expect(
      findNextPlanReading(template, 9, 9, "ex", 1, nothingRead),
    ).toBeNull();
  });
});
