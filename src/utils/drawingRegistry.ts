import React from "react";
import { View } from "react-native";
import { VerseReference } from "../models";
import { VerseRect } from "./drawing";

export type ViewHandle = React.ComponentRef<typeof View>;

type LayerEntry = {
  view: React.RefObject<ViewHandle | null>;
  ref: VerseReference;
};

const layers = new Map<string, LayerEntry>();

export const registerVerseLayer = (key: string, entry: LayerEntry) => {
  layers.set(key, entry);
  return () => {
    if (layers.get(key) === entry) layers.delete(key);
  };
};

export type MeasuredLayer = VerseRect & { ref: VerseReference };

export const measureVerseLayers = () =>
  Promise.all(
    Array.from(layers.entries()).map(
      ([key, entry]) =>
        new Promise<MeasuredLayer | null>((resolve) => {
          const node = entry.view.current;
          if (!node) return resolve(null);
          node.measureInWindow((x, y, width, height) =>
            resolve(
              width > 0 && height > 0
                ? { key, ref: entry.ref, x, y, width, height }
                : null,
            ),
          );
        }),
    ),
  ).then((result) => result.filter((r): r is MeasuredLayer => r !== null));
