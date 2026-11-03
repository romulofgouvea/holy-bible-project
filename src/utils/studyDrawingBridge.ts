export type StudyDrawingSelection = {
  version: string;
  bookAbbrev: string;
  bookName: string;
  chapter: number;
  verses: { verse: number; text: string }[];
};

export type StudyDrawingRequest = {
  studyId: string;
  selection: StudyDrawingSelection;
  previousVersion: string;
};

let request: StudyDrawingRequest | null = null;
let result: { studyId: string; html: string } | null = null;

export const requestStudyDrawing = (
  studyId: string,
  selection: StudyDrawingSelection,
  previousVersion: string,
) => {
  request = { studyId, selection, previousVersion };
};

export const takeStudyDrawingRequest = () => {
  const current = request;
  request = null;
  return current;
};

export const setStudyDrawingResult = (studyId: string, html: string) => {
  result = { studyId, html };
};

export const takeStudyDrawingResult = (studyId: string) => {
  if (result?.studyId !== studyId) return null;
  const html = result.html;
  result = null;
  return html;
};
