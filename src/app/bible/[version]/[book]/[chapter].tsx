import BibleScreen from "@/screens/BibleScreen";
import { useBible } from "@/hooks/useBible";
import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useRef } from "react";
import { availableVersions, getBibleData } from "@/data/bible-version";

function stripAccents(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findBookBySlug(
  books: { abbrev: string; name: string }[],
  slug: string,
) {
  const slugLower = slug.toLowerCase();
  const slugStripped = stripAccents(slug);
  const byAbbrevExact = books.find((b) => b.abbrev.toLowerCase() === slugLower);
  if (byAbbrevExact) return byAbbrevExact;
  const byAbbrevStripped = books.find(
    (b) => stripAccents(b.abbrev) === slugStripped,
  );
  if (byAbbrevStripped) return byAbbrevStripped;
  const byName = books.find((b) => stripAccents(b.name) === slugStripped);
  if (byName) return byName;
  return null;
}

export default function BibleChapterRoute() {
  const params = useLocalSearchParams<{
    version: string;
    book: string;
    chapter: string;
    verse?: string;
  }>();

  const { version, book, chapter, navigateTo, isReady } = useBible();
  const hasNavigatedInitial = useRef(false);

  // Sync initial URL to Bible state
  useEffect(() => {
    if (!isReady || hasNavigatedInitial.current) return;

    if (params.version && params.book && params.chapter) {
      const v = params.version.toUpperCase();
      const ch = Number(params.chapter) || 1;
      const ve = Number(params.verse) || 1;
      const books = getBibleData(v);
      const bookObj = findBookBySlug(books, params.book);
      const abbrev = bookObj?.abbrev || params.book;

      // If the URL differs from the loaded state, navigate to it
      if (
        v !== version ||
        abbrev.toLowerCase() !== book.toLowerCase() ||
        ch !== chapter
      ) {
        navigateTo({ version: v, book: abbrev, chapter: ch, verse: ve });
      }
    }
    hasNavigatedInitial.current = true;
  }, [isReady, params, version, book, chapter, navigateTo]);

  // Sync Bible state to URL
  useEffect(() => {
    if (!isReady || !hasNavigatedInitial.current) return;

    // Only update if it actually differs to avoid loop
    const currentUrlV = params.version?.toLowerCase();
    const currentUrlB = params.book?.toLowerCase();
    const currentUrlC = String(params.chapter);

    const stateV = version.toLowerCase();
    const stateB = book.toLowerCase();
    const stateC = String(chapter);

    if (
      currentUrlV !== stateV ||
      currentUrlB !== stateB ||
      currentUrlC !== stateC
    ) {
      router.setParams({
        version: stateV,
        book: stateB,
        chapter: stateC,
      });
    }
  }, [version, book, chapter, isReady, params]);

  return <BibleScreen />;
}
