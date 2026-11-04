import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { getDailyVerse } from "../utils/dailyVerse";
import { DailyVerseWidget } from "./DailyVerseWidget";

const RENDER_ACTIONS = ["WIDGET_ADDED", "WIDGET_UPDATE", "WIDGET_RESIZED"];

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  if (!RENDER_ACTIONS.includes(props.widgetAction)) return;
  props.renderWidget(<DailyVerseWidget verse={await getDailyVerse()} />);
}
