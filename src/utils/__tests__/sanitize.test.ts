import { sanitizeHtml } from "../sanitize";

describe("sanitizeHtml", () => {
  it("keeps inline image data URIs", () => {
    const html = '<img src="data:image/jpeg;base64,AAAA" alt="x" />';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("drops other data and script URLs", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      "<a>x</a>",
    );
    expect(sanitizeHtml('<img src="data:text/html;base64,AAAA" />')).toBe(
      "<img />",
    );
  });
});
