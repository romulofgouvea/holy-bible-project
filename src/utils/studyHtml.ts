import { escapeHtml } from "./sanitize";

type VerseLine = { verse: number; text: string };

type VerseBlock = {
  reference: string;
  lines: VerseLine[];
  highlightHex?: string;
  noteText?: string;
};

const HIGHLIGHT_ALPHA = "55";

export const buildStudyVerseBlock = ({
  reference,
  lines,
  highlightHex,
  noteText,
}: VerseBlock) => {
  const style = highlightHex
    ? ` style="background-color: ${highlightHex}${HIGHLIGHT_ALPHA}"`
    : "";
  const body = lines
    .map(
      (l) =>
        `<div class="verse-line"><span class="verse-num">${l.verse}</span> <span class="verse-text"${style}>${escapeHtml(l.text)}</span></div>`,
    )
    .join("");
  const note = noteText
    ? `<p>${escapeHtml(noteText).replace(/\n/g, "<br>")}</p>`
    : "";
  return `<blockquote class="bible-verse" contenteditable="false"><div class="remove-verse-btn" contenteditable="false">×</div><div class="verse-title">${escapeHtml(reference)}</div>${body}</blockquote>${note}<p><br></p>`;
};

export const buildStudyTitle = (references: string[]) => {
  if (references.length === 0) return "";
  return references.length === 1
    ? references[0]
    : `${references[0]} e mais ${references.length - 1}`;
};
