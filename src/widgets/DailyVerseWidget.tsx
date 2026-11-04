import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { DailyVerse } from "../utils/dailyVerse";

const BACKGROUND = "#008080";
const TEXT = "#FFFFFF";
const MUTED = "#CFE9E9";

export function DailyVerseWidget({ verse }: { verse: DailyVerse | null }) {
  return (
    <FlexWidget
      clickAction={verse ? "OPEN_URI" : "OPEN_APP"}
      clickActionData={verse ? { uri: verse.uri } : undefined}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "center",
        padding: 16,
        borderRadius: 16,
        backgroundColor: BACKGROUND,
      }}
    >
      <TextWidget
        text="Versículo do dia"
        style={{ fontSize: 12, color: MUTED }}
      />
      <TextWidget
        text={verse ? `“${verse.text}”` : "Abra o app para ler a Bíblia"}
        maxLines={5}
        style={{ fontSize: 15, color: TEXT, marginTop: 4 }}
      />
      {verse && (
        <TextWidget
          text={verse.reference}
          style={{ fontSize: 13, color: TEXT, fontWeight: "bold", marginTop: 6 }}
        />
      )}
    </FlexWidget>
  );
}
