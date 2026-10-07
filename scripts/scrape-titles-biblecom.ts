import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as https from 'https';
import * as path from 'path';

const VERSIONS = ['ara', 'naa', 'nvt', 'nvi'];
const BASE_URL = 'https://www.bible.com';

// https://www.bible.com/pt/bible/1608/GEN.1.ARA
// https://www.bible.com/pt/bible/1840/GEN.1.NAA
// https://www.bible.com/pt/bible/1930/GEN.1.NVT
// https://www.bible.com/pt/bible/4360/GEN.1.NVI

// ID das versões no bible.com
const VERSION_IDS: Record<string, string> = {
  'ara': '1608',
  'naa': '1840',
  'nvt': '1930',
  'nvi': '4360'
};

const BIBLE_COM_MAPPING: Record<string, string> = {
  'gn': 'GEN', 'ex': 'EXO', 'êx': 'EXO', 'lv': 'LEV', 'nm': 'NUM', 'dt': 'DEU',
  'js': 'JOS', 'jz': 'JDG', 'rt': 'RUT', '1sm': '1SA', '2sm': '2SA',
  '1rs': '1KI', '2rs': '2KI', '1cr': '1CH', '2cr': '2CH', 'ed': 'EZR',
  'ne': 'NEH', 'et': 'EST', 'jó': 'JOB', 'job': 'JOB', 'sl': 'PSA',
  'pv': 'PRO', 'ec': 'ECC', 'ct': 'SNG', 'is': 'ISA', 'jr': 'JER',
  'lm': 'LAM', 'ez': 'EZK', 'dn': 'DAN', 'os': 'HOS', 'jl': 'JOL',
  'am': 'AMO', 'ob': 'OBA', 'jn': 'JON', 'mq': 'MIC', 'na': 'NAM',
  'hc': 'HAB', 'sf': 'ZEP', 'ag': 'HAG', 'zc': 'ZEC', 'ml': 'MAL',
  'mt': 'MAT', 'mc': 'MRK', 'lc': 'LUK', 'jo': 'JHN', 'at': 'ACT',
  'rm': 'ROM', '1co': '1CO', '2co': '2CO', 'gl': 'GAL', 'ef': 'EPH',
  'fp': 'PHP', 'cl': 'COL', '1ts': '1TH', '2ts': '2TH', '1tm': '1TI',
  '2tm': '2TI', 'tt': 'TIT', 'fm': 'PHM', 'hb': 'HEB', 'tg': 'JAS',
  '1pe': '1PE', '2pe': '2PE', '1jo': '1JN', '2jo': '2JN', '3jo': '3JN',
  'jd': 'JUD', 'ap': 'REV'
};

async function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
      }
    }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 308) && res.headers.location) {
        const loc = res.headers.location;
        const redirectUrl = loc.startsWith('http') ? loc : BASE_URL + loc;
        return https.get(redirectUrl, (redirectRes) => {
          let data = '';
          redirectRes.on('data', chunk => data += chunk);
          redirectRes.on('end', () => resolve(data));
        }).on('error', reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch ${url}. Status code: ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const OUTPUT_DIR = path.join(process.cwd(), 'src/data/bible-titles');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function main() {
  console.log(`Starting generation script...`);

  for (const version of VERSIONS) {
    const versionId = VERSION_IDS[version];
    if (!versionId) {
      console.warn(`No version ID set for ${version.toUpperCase()}, skipping...`);
      continue;
    }

    const localDataPath = path.join(process.cwd(), `src/data/bible-version/${version}.json`);
    if (!fs.existsSync(localDataPath)) {
      console.warn(`Local data for ${version} not found!`);
      continue;
    }

    const localBibleData = JSON.parse(fs.readFileSync(localDataPath, 'utf8'));
    const versionBooks: any[] = [];

    const outputPath = path.join(OUTPUT_DIR, `${version}-titles.json`);

    // Descomente a linha abaixo para não refazer versões prontas
    // if (fs.existsSync(outputPath)) continue;

    console.log(`\n--- Starting extraction for version ${version.toUpperCase()} ---`);

    for (const book of localBibleData) {
      const localAbbrev = book.abbrev.toLowerCase();
      const usfm = BIBLE_COM_MAPPING[localAbbrev];

      if (!usfm) {
        console.warn(`No bible.com mapping found for ${localAbbrev}`);
        continue;
      }

      const bookTitleData: any = {
        name: book.name,
        abbrev: book.abbrev,
        chapters: []
      };

      for (let chapter = 1; chapter <= book.chapters.length; chapter++) {
        const url = `${BASE_URL}/pt/bible/${versionId}/${usfm}.${chapter}.${version.toUpperCase()}`;
        try {
          const html = await fetchHtml(url);
          const $ = cheerio.load(html);

          let chapterContainer = $('div[class*="__chapter"]');
          if (chapterContainer.length === 0) chapterContainer = $('div[class*="__reader"]');
          if (chapterContainer.length === 0) continue;

          // 1. Achatar o DOM em uma sequência lógica
          const sequence: any[] = [];

          chapterContainer.find('div[class*="__s"], div[class*="__d"], span[data-usfm]').each((_, el) => {
            const className = $(el).attr('class') || '';

            if ($(el).is('div')) {
              let kind = '';
              if (/__s(?:\s|$)/.test(className)) {
                kind = 'section';
              } else if (/__s\d+(?:\s|$)/.test(className)) {
                kind = 'subsection';
              } else if (/__sp(?:\s|$)/.test(className)) {
                kind = 'speech';
              } else if (/__d(?:\s|$)/.test(className)) {
                kind = 'description';
              }

              if (kind) {
                const clone = $(el).clone();
                clone.find('span[class*="__hide"], span[class*="__x"], span[class*="__f"], span[class*="__note"]').remove();

                const heading = clone.find('span[class*="__heading"]').text().trim() || clone.text().trim();
                // Limpar múltiplos espaços que podem sobrar ao remover tags do meio
                const cleanHeading = heading.replace(/\s{2,}/g, ' ');

                if (cleanHeading) sequence.push({ type: 'title', kind, heading: cleanHeading });
              }
            } else if ($(el).is('span')) {
              const usfmAttr = $(el).attr('data-usfm');
              if (usfmAttr) {
                const vMatch = usfmAttr.split('.');
                if (vMatch.length >= 3) {
                  const verseNum = parseInt(vMatch[2], 10);
                  if (!isNaN(verseNum)) {
                    // Pega apenas o texto puro (sem notas de rodapé)
                    let textFragment = '';
                    $(el).find('span[class*="__content"]').each((_, c) => {
                      textFragment += $(c).text();
                    });
                    textFragment = textFragment.trim().substring(0, 40);

                    if (textFragment) {
                      sequence.push({ type: 'verse', verseNum, text: textFragment });
                    }
                  }
                }
              }
            }
          });

          // 2. Processar a sequência para montar os títulos com startVerse, endVerse e positionIndex
          const chapterTitles: any[] = [];
          for (let i = 0; i < sequence.length; i++) {
            const item = sequence[i];
            if (item.type === 'title') {
              const lastVerseNode = [...sequence].slice(0, i).reverse().find(x => x.type === 'verse');
              const nextVerseNode = sequence.slice(i + 1).find(x => x.type === 'verse');

              let startVerse = 1;
              let positionIndex = 0;

              if (lastVerseNode && nextVerseNode) {
                if (lastVerseNode.verseNum === nextVerseNode.verseNum) {
                  // Título no MEIO de um versículo (ex: Coro no meio do v4)
                  startVerse = nextVerseNode.verseNum;
                  const localVerseText = book.chapters[chapter - 1][startVerse - 1] || '';
                  const idx = localVerseText.indexOf(nextVerseNode.text);
                  if (idx !== -1) {
                    positionIndex = idx;
                  } else {
                    // fallback
                    const firstWord = nextVerseNode.text.split(' ')[0];
                    const idx2 = localVerseText.indexOf(firstWord);
                    positionIndex = idx2 !== -1 ? idx2 : 0;
                  }
                } else {
                  // Título ENTRE dois versículos (ex: entre v1 e v2)
                  // Pertence ao início do PRÓXIMO versículo (v2, pos 0)
                  startVerse = nextVerseNode.verseNum;
                  positionIndex = 0;
                }
              } else if (!lastVerseNode && nextVerseNode) {
                // Começo do capítulo
                startVerse = nextVerseNode.verseNum;
                positionIndex = 0;
              } else if (lastVerseNode && !nextVerseNode) {
                // Final do capítulo
                startVerse = lastVerseNode.verseNum;
                const localVerseText = book.chapters[chapter - 1][startVerse - 1] || '';
                positionIndex = localVerseText.length;
              }

              chapterTitles.push({
                title: item.heading,
                startVerse,
                endVerse: startVerse, // Será ajustado no passo 3
                type: item.kind,
                positionIndex
              });
            }
          }

          // 3. Ajustar o endVerse (Acorrentamento com o próximo título DO MESMO TIPO)
          for (let i = 0; i < chapterTitles.length; i++) {
            const current = chapterTitles[i];
            const nextOfSameKind = chapterTitles.slice(i + 1).find(t => {
              if (current.type === 'subsection') {
                return t.type === 'section' || t.type === 'subsection';
              }
              return t.type === current.type;
            });

            if (nextOfSameKind) {
              if (nextOfSameKind.positionIndex === 0) {
                current.endVerse = nextOfSameKind.startVerse - 1;
                if (current.endVerse < current.startVerse) {
                  current.endVerse = current.startVerse; // fallback safety
                }
              } else {
                current.endVerse = nextOfSameKind.startVerse;
              }
            } else {
              current.endVerse = book.chapters[chapter - 1].length;
            }
          }

          if (chapterTitles.length > 0) {
            bookTitleData.chapters.push({
              number: chapter,
              titles: chapterTitles
            });
            process.stdout.write(`\r[${version.toUpperCase()}] ${usfm} ${chapter} - ${chapterTitles.length} títulos gerados...     `);
          }

        } catch (error: any) {
          console.error(`\nError fetching ${url}:`, error.message);
        }
        await delay(30);
      }

      if (bookTitleData.chapters.length > 0) {
        versionBooks.push(bookTitleData);
      }
    }

    const outputData = {
      version: version.toUpperCase(),
      books: versionBooks
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`\nSaved ${version.toUpperCase()} titles to ${outputPath}`);
  }
}

main().catch(console.error);
