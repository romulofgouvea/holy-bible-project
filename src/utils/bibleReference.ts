import { Book } from "../models";
import { normalizeSearch } from "./notesSearch";

export type BibleReference = {
  book: Book;
  chapter: number;
  verse?: number;
};

const REFERENCE_PATTERN =
  /^(\d?\s*[a-zà-ú]+(?:\s+[a-zà-ú]+)*)\s*(\d+)?(?:\s*[:.,]\s*(\d+))?$/;

const compact = (value: string) => value.replace(/[\s.]/g, "");

export const parseBibleReference = (
  query: string,
  books: Book[],
): BibleReference | null => {
  const match = REFERENCE_PATTERN.exec(query.trim().toLowerCase());
  if (!match || !match[2]) return null;
  const token = compact(match[1]);
  if (token.length < 2) return null;
  const plain = normalizeSearch(token);
  const book =
    books.find((b) => compact(b.abbrev.toLowerCase()) === token) ??
    books.find((b) => compact(normalizeSearch(b.abbrev)) === plain) ??
    books.find((b) => compact(normalizeSearch(b.name)) === plain) ??
    books.find((b) => compact(normalizeSearch(b.name)).startsWith(plain));
  if (!book) return null;
  const chapter = Number(match[2]);
  const verses = book.chapters[chapter - 1];
  if (!verses) return null;
  if (!match[3]) return { book, chapter };
  const verse = Number(match[3]);
  return verse >= 1 && verse <= verses.length ? { book, chapter, verse } : null;
};
