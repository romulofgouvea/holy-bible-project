import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import {
  getLastReadCard,
  getPlanCard,
  getStatsCard,
  WidgetCard,
} from "../utils/widgetData";
import { CardWidget } from "./CardWidget";

const RENDER_ACTIONS = ["WIDGET_ADDED", "WIDGET_UPDATE", "WIDGET_RESIZED"];

const LOADERS: Record<string, [() => Promise<WidgetCard | null>, string]> = {
  ContinueReading: [getLastReadCard, "Abra o app para ler a Bíblia"],
  ReadingPlan: [getPlanCard, "Nenhum plano ativo. Abra o app para criar um"],
  Stats: [getStatsCard, "Abra o app para ver suas estatísticas"],
};

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (!RENDER_ACTIONS.includes(props.widgetAction)) return;
  const [load, empty] = LOADERS[props.widgetInfo.widgetName] ?? LOADERS.Stats;
  let card: WidgetCard | null = null;
  try {
    card = await load();
  } catch {}
  props.renderWidget(<CardWidget card={card} emptyText={empty} />);
}
