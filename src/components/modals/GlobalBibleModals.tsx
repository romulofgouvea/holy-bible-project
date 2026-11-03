import React, { useMemo } from "react";
import { Book, getBibleData } from "../../data/bible-version";
import { useBible } from "../../hooks/useBible";
import { useDrawings } from "../../hooks/useDrawings";
import { useNotes } from "../../hooks/useNotes";
import { useBibleModals } from "../../hooks/useBibleModals";
import { useResponsive } from "../../hooks/useResponsive";
import { selectionHaptic } from "../../utils/haptics";
import { BibleBookModal } from "./BibleBookModal";
import { BibleNumberModal } from "./BibleNumberModal";
import { BibleVersionModal } from "./BibleVersionModal";
import { StudyVerseSelectModal } from "./StudyVerseSelectModal";

export function GlobalBibleModals() {
  const {
    activeModal,
    closeAll,
    options,
    setActiveModal,
    navVersion,
    setNavVersion,
    navBook,
    setNavBook,
    navChapter,
    setNavChapter,
  } = useBibleModals();

  const {
    version: globalVersion,
    setVersion: setGlobalVersion,
    book: globalBookId,
    setBook: setGlobalBook,
    chapter: globalChapter,
    setChapter: setGlobalChapter,
    verse: globalVerse,
    setVerse: setGlobalVerse,
    versionBooks: globalVersionBooks,
    currentBook: globalBook,
    highlights,
  } = useBible();

  const { ms } = useResponsive();
  const { drawings } = useDrawings();
  const { notes } = useNotes();

  const versionBooks = useMemo(() => {
    if (navVersion && navVersion !== globalVersion) {
      return getBibleData(navVersion);
    }
    return globalVersionBooks;
  }, [navVersion, globalVersion, globalVersionBooks]);

  const activeBook = navBook || options.initialBook || globalBook;
  const activeChapterCount = activeBook?.chapters?.length || 0;
  const activeChapterNumbers = useMemo(
    () => Array.from({ length: activeChapterCount }, (_, i) => i + 1),
    [activeChapterCount],
  );

  const markedChapters = useMemo(() => {
    const marked = new Set<number>();
    const abbrev = activeBook?.abbrev;
    if (!abbrev) return marked;
    const activeVersion = navVersion || globalVersion;
    Object.values(drawings).forEach((d) => {
      if (
        d.bookAbbrev === abbrev &&
        d.version === activeVersion &&
        d.strokes.length > 0
      ) {
        marked.add(d.chapter);
      }
    });
    notes.forEach((n) =>
      n.selectedVerses?.forEach((v) => {
        if (v.bookAbbrev === abbrev) marked.add(v.chapter);
      }),
    );
    Object.values(highlights).forEach((h) => {
      if (h.abbrev === abbrev) marked.add(h.chapter);
    });
    return marked;
  }, [activeBook, navVersion, globalVersion, drawings, notes, highlights]);

  const activeVerses = useMemo(() => {
    const ch = navChapter || globalChapter;
    const chapters = activeBook?.chapters || [];
    const versesInChapter = chapters[ch - 1] || [];
    return versesInChapter.map((text, i) => ({ verse: i + 1, text }));
  }, [activeBook, navChapter, globalChapter]);

  const activeVerseNumbers = useMemo(
    () => Array.from({ length: activeVerses.length }, (_, i) => i + 1),
    [activeVerses],
  );

  const isShowingCurrentBook =
    !navBook || navBook.abbrev === globalBook?.abbrev;
  const highlightedChapter = isShowingCurrentBook ? globalChapter : undefined;
  const isShowingCurrentChapter =
    isShowingCurrentBook && (!navChapter || navChapter === globalChapter);
  const highlightedVerse = isShowingCurrentChapter ? globalVerse : undefined;

  return (
    <>
      <BibleVersionModal
        visible={activeModal === "version"}
        currentVersionSigla={navVersion || globalVersion}
        onClose={closeAll}
        onSelect={(v) => {
          selectionHaptic();
          setNavVersion(v.sigla);
          if (!options.target || options.target === "read") {
            setGlobalVersion(v.sigla);
          }
          if (options.onSelect) {
            options.onSelect({ version: v.sigla });
          }

          // If we are in a flow (book/chapter selection) and change version, stay in the flow
          if (options.initialStep && options.initialStep !== "version") {
            setActiveModal(options.initialStep);
          } else if (!options.initialStep) {
            // Direct version-to-book flow (e.g. initial setup)
            setActiveModal("book");
          } else {
            // Standalone version selection (e.g. from top bar)
            closeAll();
          }
        }}
      />
      <BibleBookModal
        visible={activeModal === "book"}
        onClose={closeAll}
        books={versionBooks}
        currentBookAbbrev={
          options.initialBook?.abbrev ||
          (isShowingCurrentBook ? globalBook?.abbrev : undefined)
        }
        versionSigla={(navVersion || globalVersion).toUpperCase()}
        showVersionPill={!options.skipChapterSelection}
        onVersionPress={() => setActiveModal("version")}
        onSelect={(bookNameOrAbbrev) => {
          selectionHaptic();
          const selectedBookObj =
            versionBooks.find(
              (b) =>
                b.abbrev === bookNameOrAbbrev || b.name === bookNameOrAbbrev,
            ) || null;
          setNavBook(selectedBookObj);
          setNavChapter(1);
          if (
            selectedBookObj &&
            (!options.target || options.target === "read")
          ) {
            setGlobalBook(selectedBookObj.abbrev);
            setGlobalChapter(1);
            setGlobalVerse(1);
          }

          if (options.skipChapterSelection) {
            if (options.onSelect) {
              options.onSelect({
                version: navVersion || globalVersion,
                book: selectedBookObj as Book,
                chapter: 1,
              });
            }
            closeAll();
          } else {
            setActiveModal("chapter");
          }
        }}
      />
      <BibleNumberModal
        visible={activeModal === "chapter"}
        onClose={closeAll}
        onBack={
          options.initialStep === "chapter"
            ? undefined
            : () => setActiveModal("book")
        }
        title={activeBook?.name || "Capítulos"}
        footerText="capítulos"
        iconName="list"
        items={activeChapterNumbers}
        currentItem={options.initialChapter || highlightedChapter}
        markedItems={markedChapters}
        onSelect={(num) => {
          selectionHaptic();
          setNavChapter(num);
          if (!options.target || options.target === "read") {
            setGlobalChapter(num);
          }
          if (options.skipVerseSelection) {
            if (options.onSelect) {
              options.onSelect({
                version: navVersion || globalVersion,
                book: activeBook,
                chapter: num,
              });
            }
            closeAll();
          } else if (
            activeModal === "chapter" &&
            options.initialStep === "book" &&
            options.onConfirm
          ) {
            setActiveModal("verses");
          } else {
            setActiveModal("verse");
          }
        }}
      />
      <BibleNumberModal
        visible={activeModal === "verse"}
        onClose={closeAll}
        onBack={() => setActiveModal("chapter")}
        title={
          activeBook?.name
            ? `${activeBook.name} ${navChapter || globalChapter}`
            : "Versículos"
        }
        footerText="versículos"
        iconName="hash"
        items={activeVerseNumbers}
        currentItem={highlightedVerse}
        onSelect={(num) => {
          selectionHaptic();
          if (!options.target || options.target === "read") {
            setGlobalVerse(num);
          }
          if (options.onSelect) {
            options.onSelect({
              version: navVersion || globalVersion,
              book: activeBook,
              chapter: navChapter || globalChapter,
              verse: num,
            });
          }
          closeAll();
        }}
      />
      <StudyVerseSelectModal
        visible={activeModal === "verses"}
        onClose={closeAll}
        onBack={() => setActiveModal("chapter")}
        bookName={activeBook?.name || ""}
        chapter={navChapter || globalChapter}
        verses={activeVerses}
        onConfirm={(verses) => {
          if (options.onConfirm) {
            const verseObjects = verses
              .map((n) => activeVerses.find((v) => v.verse === n)!)
              .filter(Boolean);
            options.onConfirm({
              version: navVersion || globalVersion,
              book: activeBook,
              chapter: navChapter || globalChapter,
              verses,
              verseObjects,
            });
          }
          closeAll();
        }}
      />
    </>
  );
}
