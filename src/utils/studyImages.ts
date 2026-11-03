import * as FileSystem from "expo-file-system/legacy";

const IMAGE_DIRECTORY_NAME = "study-images/";
const IMAGE_SRC_PATTERN = /src="(file:\/\/[^"]*\/study-images\/[^"]+\.jpg)"/g;

const makeImageId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

const getImageDirectory = () =>
  `${FileSystem.documentDirectory}${IMAGE_DIRECTORY_NAME}`;

export async function saveStudyImage(temporaryUri: string) {
  const directory = getImageDirectory();
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true }).catch(
    () => {},
  );
  const destination = `${directory}${makeImageId()}.jpg`;
  await FileSystem.copyAsync({ from: temporaryUri, to: destination });
  return destination;
}

export async function inlineStudyImages(html: string) {
  const uris = Array.from(
    new Set(Array.from(html.matchAll(IMAGE_SRC_PATTERN), (m) => m[1])),
  );
  if (uris.length === 0) return html;
  const entries = await Promise.all(
    uris.map(async (uri) => {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return [uri, `data:image/jpeg;base64,${base64}`] as const;
      } catch {
        return [uri, uri] as const;
      }
    }),
  );
  const dataByUri = new Map(entries);
  return html.replace(
    IMAGE_SRC_PATTERN,
    (_, uri: string) => `src="${dataByUri.get(uri) ?? uri}"`,
  );
}
