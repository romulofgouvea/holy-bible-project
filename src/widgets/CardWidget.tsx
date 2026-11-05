import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import { WidgetCard } from "../utils/widgetData";

const BACKGROUND = "#008080";
const TEXT = "#FFFFFF";
const MUTED = "#CFE9E9";

export function CardWidget({
  card,
  emptyText,
}: {
  card: WidgetCard | null;
  emptyText: string;
}) {
  return (
    <FlexWidget
      clickAction={card?.uri ? "OPEN_URI" : "OPEN_APP"}
      clickActionData={card?.uri ? { uri: card.uri } : undefined}
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
        text={card?.title ?? "Bíblia"}
        style={{ fontSize: 12, color: MUTED }}
      />
      <TextWidget
        text={card?.body ?? emptyText}
        maxLines={5}
        style={{ fontSize: 15, color: TEXT, marginTop: 4 }}
      />
      {card?.footer && (
        <TextWidget
          text={card.footer}
          style={{
            fontSize: 13,
            color: TEXT,
            fontWeight: "bold",
            marginTop: 6,
          }}
        />
      )}
    </FlexWidget>
  );
}
