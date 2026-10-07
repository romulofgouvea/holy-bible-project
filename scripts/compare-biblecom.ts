/**
 * Compara (e corrige) os versículos do JSON local com o texto publicado em bible.com.
 *
 * O bible.com protege as páginas de capítulo com um desafio JS anti-bot ("Client Challenge"),
 * então este script usa um Chromium real via Playwright em vez de um fetch HTTP simples.
 *
 * Pré-requisito (uma vez só): npx playwright install chromium
 *
 * Uso:
 *   npx tsx scripts/compare-biblecom.ts --version=nvt [--book=jo] [--chapter=1] [--delay=250]
 *
 * Flags:
 *   --version   (obrigatório) ara | naa | nvt | nvi
 *   --book      (opcional) abbrev local do livro, ex: jo, sl, gn — se omitido, roda os 66 livros
 *   --chapter   (opcional, requer --book) capítulo específico — se omitido, roda todos os capítulos
 *   --delay     (opcional, default 250) intervalo em ms entre navegações de página
 *
 * Sem --book/--chapter roda uma varredura completa da versão, com progresso resumível em
 * scripts/compare-progress-<version>.json (retoma automaticamente se for interrompido).
 *
 * Diferenças de maiúscula/minúscula são ignoradas na comparação. Quando o texto realmente diverge,
 * o script sobrescreve o versículo no JSON local com o texto raspado do bible.com e grava um
 * relatório em scripts/compare-report-<version>-<timestamp>.json com before/after de cada
 * atualização feita.
 *
 * Exemplos:
 *   npx tsx scripts/compare-biblecom.ts --version=nvt --book=sl --chapter=133
 *   npx tsx scripts/compare-biblecom.ts --version=ara --book=jo
 *   npx tsx scripts/compare-biblecom.ts --version=nvi
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { chromium, type Page } from "playwright";

const BASE_URL = "https://www.bible.com";

const VERSION_IDS: Record<string, string> = {
  ara: "1608",
  naa: "1840",
  nvt: "1930",
  nvi: "4360",
};

const BIBLE_COM_MAPPING: Record<string, string> = {
  gn: "GEN",
  ex: "EXO",
  êx: "EXO",
  lv: "LEV",
  nm: "NUM",
  dt: "DEU",
  js: "JOS",
  jz: "JDG",
  rt: "RUT",
  "1sm": "1SA",
  "2sm": "2SA",
  "1rs": "1KI",
  "2rs": "2KI",
  "1cr": "1CH",
  "2cr": "2CH",
  ed: "EZR",
  ne: "NEH",
  et: "EST",
  jó: "JOB",
  job: "JOB",
  sl: "PSA",
  pv: "PRO",
  ec: "ECC",
  ct: "SNG",
  is: "ISA",
  jr: "JER",
  lm: "LAM",
  ez: "EZK",
  dn: "DAN",
  os: "HOS",
  jl: "JOL",
  am: "AMO",
  ob: "OBA",
  jn: "JON",
  mq: "MIC",
  na: "NAM",
  hc: "HAB",
  sf: "ZEP",
  ag: "HAG",
  zc: "ZEC",
  ml: "MAL",
  mt: "MAT",
  mc: "MRK",
  lc: "LUK",
  jo: "JHN",
  at: "ACT",
  rm: "ROM",
  "1co": "1CO",
  "2co": "2CO",
  gl: "GAL",
  ef: "EPH",
  fp: "PHP",
  cl: "COL",
  "1ts": "1TH",
  "2ts": "2TH",
  "1tm": "1TI",
  "2tm": "2TI",
  tt: "TIT",
  fm: "PHM",
  hb: "HEB",
  tg: "JAS",
  "1pe": "1PE",
  "2pe": "2PE",
  "1jo": "1JN",
  "2jo": "2JN",
  "3jo": "3JN",
  jd: "JUD",
  ap: "REV",
};

type Book = {
  abbrev: string;
  name: string;
  chapters: string[][];
};

type Update = {
  book: string;
  abbrev: string;
  chapter: number;
  verse: number;
  before: string;
  after: string;
};

type Progress = {
  bookIndex: number;
  chapterIndex: number;
};

async function fetchRenderedHtml(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page
    .waitForSelector("span[data-usfm]", { timeout: 20000 })
    .catch(() => { });
  return page.content();
}

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const INVISIBLE_WHITESPACE = new RegExp("[\\xA0\\u200B-\\u200D\\uFEFF]", "g");

function normalize(text: string): string {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(INVISIBLE_WHITESPACE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseArgs(): {
  version: string;
  book?: string;
  chapter?: number;
  delay: number;
} {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }

  const version = (args.version || "").toLowerCase();
  if (!VERSION_IDS[version]) {
    console.error(
      `Uso: npx tsx scripts/compare-biblecom.ts --version=<${Object.keys(VERSION_IDS).join("|")}> [--book=jo] [--chapter=1] [--delay=250]`,
    );
    process.exit(1);
  }

  const book = args.book ? args.book.toLowerCase() : undefined;
  const chapter = args.chapter ? parseInt(args.chapter, 10) : undefined;
  const delayMs = args.delay ? parseInt(args.delay, 10) : 250;

  return { version, book, chapter, delay: delayMs };
}

function extractVerses(
  $: ReturnType<typeof cheerio.load>,
): Record<number, string> {
  let chapterContainer = $('div[class*="__chapter"]');
  if (chapterContainer.length === 0)
    chapterContainer = $('div[class*="__reader"]');

  const fragmentsByVerse: Record<number, string[]> = {};

  chapterContainer.find("span[data-usfm]").each((_, el) => {
    const usfmAttr = $(el).attr("data-usfm");
    if (!usfmAttr) return;
    const parts = usfmAttr.split(".");
    if (parts.length < 3) return;
    const verseNum = parseInt(parts[2], 10);
    if (isNaN(verseNum)) return;

    const clone = $(el).clone();
    clone
      .find(
        'span[class*="__hide"], span[class*="__x"], span[class*="__f"], span[class*="__note"], span[class*="__label"]',
      )
      .remove();

    let fragment = "";
    clone
      .find('span[class*="__content"]')
      .each((_, c) => {
        fragment += $(c).text();
      });
    fragment = fragment.replace(/\s+/g, " ");

    if (!fragment.trim()) return;

    if (!fragmentsByVerse[verseNum]) fragmentsByVerse[verseNum] = [];
    fragmentsByVerse[verseNum].push(fragment);
  });

  const verses: Record<number, string> = {};
  for (const [verseNum, fragments] of Object.entries(fragmentsByVerse)) {
    verses[Number(verseNum)] = fragments.join(" ").replace(/\s+/g, " ").trim();
  }
  return verses;
}

async function main() {
  const {
    version,
    book: bookFilter,
    chapter: chapterFilter,
    delay: delayMs,
  } = parseArgs();
  const versionId = VERSION_IDS[version];

  const localPath = path.join(
    process.cwd(),
    `src/data/bible-version/${version.toUpperCase()}.json`,
  );
  if (!fs.existsSync(localPath)) {
    console.error(`Arquivo local não encontrado: ${localPath}`);
    process.exit(1);
  }
  const localBooks: Book[] = JSON.parse(fs.readFileSync(localPath, "utf8"));

  const isFullScan = !bookFilter && !chapterFilter;
  const localScriptsDir = path.join(process.cwd(), "scripts");
  if (!fs.existsSync(localScriptsDir))
    fs.mkdirSync(localScriptsDir, { recursive: true });
  const progressPath = path.join(
    localScriptsDir,
    `compare-progress-${version}.json`,
  );

  let startBookIndex = 0;
  let startChapterIndex = 0;
  if (isFullScan && fs.existsSync(progressPath)) {
    const prog: Progress = JSON.parse(fs.readFileSync(progressPath, "utf8"));
    startBookIndex = prog.bookIndex || 0;
    startChapterIndex = prog.chapterIndex || 0;
    console.log(
      `Retomando de onde parou: livro index ${startBookIndex}, capítulo ${startChapterIndex + 1}...`,
    );
  }

  const updates: Update[] = [];
  let chaptersChecked = 0;
  let versesChecked = 0;
  let versesMatched = 0;
  let versesUpdated = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "pt-BR" });
  const page = await context.newPage();

  try {
    for (let b = isFullScan ? startBookIndex : 0; b < localBooks.length; b++) {
      const book = localBooks[b];
      const localAbbrev = book.abbrev.toLowerCase();

      if (bookFilter && localAbbrev !== bookFilter) continue;

      const usfm = BIBLE_COM_MAPPING[localAbbrev];
      if (!usfm) {
        console.warn(
          `Sem mapeamento bible.com para o livro "${book.abbrev}", pulando...`,
        );
        continue;
      }

      const firstChapter =
        isFullScan && b === startBookIndex ? startChapterIndex : 0;

      for (let c = firstChapter; c < book.chapters.length; c++) {
        const chapterNum = c + 1;
        if (chapterFilter && chapterNum !== chapterFilter) continue;

        const url = `${BASE_URL}/pt/bible/${versionId}/${usfm}.${chapterNum}.${version.toUpperCase()}`;

        let html: string;
        try {
          html = await fetchRenderedHtml(page, url);
        } catch (error: any) {
          console.error(`Erro ao buscar ${url}: ${error.message}`);
          continue;
        }

        const $ = cheerio.load(html);
        const scrapedVerses = extractVerses($);

        const localChapter = book.chapters[c];
        let chapterUpdated = 0;

        for (let v = 0; v < localChapter.length; v++) {
          const verseNum = v + 1;
          const scraped = scrapedVerses[verseNum];
          if (!scraped) continue;

          versesChecked++;
          const localText = localChapter[v];

          if (normalize(localText) === normalize(scraped)) {
            versesMatched++;
            continue;
          }

          updates.push({
            book: book.name,
            abbrev: book.abbrev,
            chapter: chapterNum,
            verse: verseNum,
            before: localText,
            after: scraped,
          });
          localChapter[v] = scraped;
          versesUpdated++;
          chapterUpdated++;
        }

        chaptersChecked++;
        process.stdout.write(
          `[${version.toUpperCase()}] ${usfm} ${chapterNum} — ${localChapter.length} versículos, ${chapterUpdated} atualizados\n`,
        );

        if (chapterUpdated > 0) {
          fs.writeFileSync(
            localPath,
            JSON.stringify(localBooks, null, 2),
            "utf8",
          );
        }

        if (isFullScan) {
          fs.writeFileSync(
            progressPath,
            JSON.stringify(
              { bookIndex: b, chapterIndex: c + 1 } as Progress,
              null,
              2,
            ),
            "utf8",
          );
        }

        await delay(delayMs);
      }
    }
  } finally {
    await browser.close();
  }

  if (isFullScan && fs.existsSync(progressPath)) {
    fs.unlinkSync(progressPath);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(
    localScriptsDir,
    `compare-report-${version}-${timestamp}.json`,
  );
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        version: version.toUpperCase(),
        generatedAt: new Date().toISOString(),
        totals: {
          chaptersChecked,
          versesChecked,
          versesMatched,
          versesUpdated,
        },
        updates,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\nConcluído.`);
  console.log(`Capítulos verificados: ${chaptersChecked}`);
  console.log(`Versículos verificados: ${versesChecked}`);
  console.log(`Versículos ok: ${versesMatched}`);
  console.log(`Versículos atualizados: ${versesUpdated}`);
  console.log(`Relatório salvo em: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
