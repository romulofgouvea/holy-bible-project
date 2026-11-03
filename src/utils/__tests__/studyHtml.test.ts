import { buildStudyTitle, buildStudyVerseBlock } from "../studyHtml";

describe("buildStudyVerseBlock", () => {
  it("renders the reference, the verse lines and the note", () => {
    const html = buildStudyVerseBlock({
      reference: "João 3:16 (ARA)",
      lines: [{ verse: 16, text: "Porque Deus amou o mundo" }],
      noteText: "Linha 1\nLinha 2 <b>",
    });
    expect(html).toContain('<div class="verse-title">João 3:16 (ARA)</div>');
    expect(html).toContain('<span class="verse-num">16</span>');
    expect(html).toContain("Linha 1<br>Linha 2 &lt;b&gt;");
  });

  it("tints the verse text when a highlight color is given", () => {
    const html = buildStudyVerseBlock({
      reference: "Gn 1:1",
      lines: [{ verse: 1, text: "No princípio" }],
      highlightHex: "#FFEB3B",
    });
    expect(html).toContain('style="background-color: #FFEB3B55"');
  });
});

describe("buildStudyTitle", () => {
  it("uses the reference alone or adds the remaining count", () => {
    expect(buildStudyTitle(["Judas 1:1-4"])).toBe("Judas 1:1-4");
    expect(buildStudyTitle(["Judas 1:1-4", "João 3:16", "Gn 1:1"])).toBe(
      "Judas 1:1-4 e mais 2",
    );
    expect(buildStudyTitle([])).toBe("");
  });
});
