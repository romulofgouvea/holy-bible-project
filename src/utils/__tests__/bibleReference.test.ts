import { Book } from "../../models";
import { parseBibleReference } from "../bibleReference";

const verses = (n: number) => Array.from({ length: n }, (_, i) => `v${i + 1}`);

const books: Book[] = [
  { abbrev: "Jó", name: "Jó", chapters: [verses(5)] },
  { abbrev: "Sl", name: "Salmos", chapters: [verses(6), verses(12)] },
  {
    abbrev: "Jo",
    name: "João",
    chapters: [verses(51), verses(25), verses(36)],
  },
  { abbrev: "1Jo", name: "1 João", chapters: [verses(10)] },
];

describe("parseBibleReference", () => {
  it("matches abbreviation, chapter and verse", () => {
    const ref = parseBibleReference("Jo 3:16", books);
    expect(ref?.book.abbrev).toBe("Jo");
    expect(ref?.chapter).toBe(3);
    expect(ref?.verse).toBe(16);
  });

  it("matches full names without accents and numbered books", () => {
    expect(parseBibleReference("joao 2", books)?.book.abbrev).toBe("Jo");
    expect(parseBibleReference("1 joao 1.5", books)?.verse).toBe(5);
    expect(parseBibleReference("salmos 2", books)?.chapter).toBe(2);
  });

  it("prefers exact abbreviation over prefix", () => {
    expect(parseBibleReference("jo 1", books)?.book.abbrev).toBe("Jo");
    expect(parseBibleReference("sal 2", books)?.book.abbrev).toBe("Sl");
    expect(parseBibleReference("jó 1", books)?.book.abbrev).toBe("Jó");
  });

  it("rejects out of range and non references", () => {
    expect(parseBibleReference("Sl 3", books)).toBeNull();
    expect(parseBibleReference("Sl 1:7", books)).toBeNull();
    expect(parseBibleReference("amor", books)).toBeNull();
    expect(parseBibleReference("xyz 1", books)).toBeNull();
  });
});
