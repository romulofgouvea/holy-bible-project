import { matchesQuery } from "../notesSearch";

describe("matchesQuery", () => {
  it("ignores accents and case", () => {
    expect(matchesQuery("JOAO", "João 3:16")).toBe(true);
    expect(matchesQuery("amou", "Porque Deus amou o mundo")).toBe(true);
  });

  it("matches when any field contains the query", () => {
    expect(matchesQuery("graça", undefined, "A graça de Deus")).toBe(true);
    expect(matchesQuery("fé", "Gênesis 1:1", "No princípio")).toBe(false);
  });

  it("accepts everything for an empty query", () => {
    expect(matchesQuery("  ", "qualquer")).toBe(true);
  });
});
