# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev
expo start                    # start Metro bundler (scan QR in Expo Go)
expo run:android              # run on Android device/emulator (debug)
npm run lint                  # ESLint via expo lint
npm run tsc                   # type-check without emitting
npm run format                # prettier on src/**

# Tests
npx jest                      # run all tests
npx jest BibleText            # run a specific test file by name pattern

# Build & deploy (Android only)
npm run eas:build:preview     # EAS cloud build → internal track
npm run eas:build:production  # EAS cloud build → production track
npm run local:build:preview   # local signed AAB (Windows/Linux)
```

## Architecture

### Provider hierarchy (`src/app/_layout.tsx`)

```
SafeAreaProvider
  ThemeProvider          ← dark mode, color theme, haptics (AsyncStorage)
    ReaderSettingsProvider ← font size, text align, reader theme/font (AsyncStorage)
      BibleProvider      ← global nav state: version/book/chapter/verse, highlights, history
        BibleModalProvider ← controls which modal step is active and its nav state
          AppLayout
            GlobalBibleModals  ← single instance rendering all selection modals
```

All providers are React Contexts defined **alongside** their hooks in `src/hooks/` — there is no separate `contexts/` or `services/` directory. Every setting change is persisted to AsyncStorage using keys in `src/constants/storage.ts`. Backup/restore fires `BACKUP_RESTORED_EVENT` via `DeviceEventEmitter`, which all providers listen to in order to reload their state.

### Bible data layer (`src/data/`)

- `bible-version/` — one JSON per version. Each file has `{ books: Book[] }` where `Book = { abbrev, name, chapters: string[][] }`. `getBibleData(sigla)` loads via `require.context`. **KJA and KJF exist as JSON files but are NOT in `bible-versions.json`** — only ACF, ARA, NAA, NVI, NVT are user-facing.
- `bible-titles/` — optional section headings (`VerseTitle`) with lazy caching. Available for ARA, NAA, NVI, NVT (not ACF). Used in `useBible` to enrich `sectionData`.
- `bible-plan/` — 10 JSON templates (classic, chronological, NT/OT in 1-month, 3-month, 6-month, 1-year). Registered in `biblePlanRegistry.ts`.
- `bible-voice/` — voice IDs per version/book for audio playback.

### Navigation & routing (`src/app/`)

Expo Router file-based routing. Main routes:
- `/` → redirects to `/bible`
- `/bible` → `BibleScreen` (main reading screen)
- `/bible/:version/:book/:chapter?verse=N` → deep-link handler — normalizes accents, writes to AsyncStorage, redirects to `/bible`
- `/search` → `SearchScreen`
- `/studies/` and `/studies/study/[id]` → `StudiesScreen`, `StudyEditorScreen`
- `/reading-plan` → `ReadingPlanScreen`
- `/configuration` → `ConfigurationScreen`, `/configuration/trash` → `TrashScreen`

Route constants, labels, and drawer items (with Feather icon names) live in `src/constants/routes.ts`.

### Modal selection flow (`GlobalBibleModals`)

`BibleModalProvider` manages a linear selection wizard: `version → book → chapter → verse`. `openModal({ initialStep, onSelect, onConfirm, skipChapterSelection, skipVerseSelection, target })` lets callers jump to any step. Navigation state (`navVersion`, `navBook`, `navChapter`) is kept separately from the global Bible state so the user can browse without committing. `target` is `'read' | 'search' | 'study'`.

### Verse list rendering (`BibleVerseReader`)

Uses `@shopify/flash-list` with a flat array (`flatData`):
- index `0`: `{ type: 'header' }` (chapter title)
- index `N`: `{ type: 'verse', verse: N }` for each verse
- last index: `{ type: 'footer' }` (copyright, if present)

Because the header occupies index 0, **verse number equals its flat index**. `scrollToIndex({ index: verseNumber })` is the correct way to jump to a verse.

### Split-screen comparison (`BibleScreen`)

`BibleScreen` supports a dual-version comparison mode. Synchronized scrolling between panes records the offset each pane was programmatically scrolled to (`expectedTopOffsetRef` / `expectedBottomOffsetRef`) and ignores the echo scroll event, preventing scroll event loops. The compared version is persisted to `STORAGE_KEYS.BIBLE_COMPARE`. Users can toggle vertical/horizontal layout and swap pane positions.

### Domain models (`src/models/index.ts`)

All shared TypeScript types live here:
- `Book`, `BibleVersionInfo`, `HighlightItem`, `SelectedVerse`, `HistoryItem`
- `Study` (soft-delete via `deletedAt?` — 30-day trash before permanent deletion)
- `ActiveBiblePlan`, `BiblePlanTemplate` (in `BiblePlanModels.ts`)
- `ReaderTheme` (`'light' | 'dark' | 'sepia'`), `ReaderFont` (`'poppins' | 'monospace'`), `TextAlign`
- `VerseTitle`, `ChapterTitle`, `BookTitle`, `VersionTitle` (section heading hierarchy)

### Styling system

`useResponsive()` returns `ms(value)` (moderate scale, guide width 375px) and the `DESIGN` token object (`src/constants/design.ts`). All sizes — spacing, font, border radius, icon sizes — come from `DESIGN` and are passed through `ms()`. Tablet breakpoint is 768px with a lower scale factor. Never use raw pixel values.

`useTheme()` returns `colors` (current palette, 6 color themes). `useReaderSettings()` returns `readerColors` (light/sepia/dark reader palette), which overrides `colors` inside the reading view when `readerTheme !== 'light'`.

### Icons

`BibleIcon` wraps `@expo/vector-icons/Feather`. Use Feather icon names everywhere UI icons are needed.

### Rich text in studies

`RichTextEditor` (`src/components/study/RichTextEditor.tsx`) is a WebView-based editor. Study content is stored as HTML. Verse insertions are formatted as HTML blockquotes. Auto-save fires 1 second after the last edit.

### Search

`SearchScreen` runs accent-normalized full-text search across the entire Bible (or filtered to a book/chapter) with a 350ms debounce (min 2 chars). Results are highlighted inline. Search history capped at 20 entries.

## Naming conventions

- **Components** — PascalCase, filename must match component name (`BibleVerseCard.tsx`)
- **Hooks** — `use` prefix, camelCase (`useResponsive.ts`)
- **Screens** — must end with `Screen` (`BibleScreen.tsx`)
- **Booleans** — prefix with `is`, `has`, `can`, or `should`
- **Global constants** — `UPPER_SNAKE_CASE`
- **Scripts** — kebab-case in `/scripts/`; machine-only temporaries go in `/scripts/` (gitignored)

## Styling rules

All spacing, sizing, typography, and border-radius **must** go through `useResponsive`:

```typescript
const { ms, DESIGN } = useResponsive();
// ✅
padding: ms(DESIGN.spacing.md)
fontSize: ms(DESIGN.fontSize.lg)
borderRadius: ms(DESIGN.borderRadius.md)

// ❌ forbidden
padding: 12
padding: SPACING.md   // raw constant without ms()
container: {}         // empty style objects
```

## Architecture rules

- Business logic lives in hooks — not in components. Providers are co-located with their hooks in `src/hooks/`.
- No circular dependencies.
- **No comments in code.**
- Memoize expensive calculations (`useMemo`, `useCallback`). `React.memo` on list items and pure components.

## E2E

`e2e.md` lista todas as telas do app e a ordem do teste ponta a ponta no aparelho (Expo Go + adb). A parte automática roda com `bash e2e/run.sh [secao...]`. Ao mudar uma tela ou fluxo, atualize `e2e.md` e `e2e/run.sh`, e registre o resultado da execução no fim de `e2e.md`.

## Pre-commit checklist

```bash
npm run format   # prettier
npm run lint     # eslint
npm run tsc      # type-check
```

Also verify: no hardcoded style values, no unused imports, no `console.log` left in code.
