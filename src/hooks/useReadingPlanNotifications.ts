import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { requireOptionalNativeModule } from "expo";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { STORAGE_KEYS } from "../constants/storage";
import { getBiblePlanTemplate } from "../data/bible-plan/biblePlanRegistry";
import { useBiblePlan } from "./useBiblePlan";

const NOTIFICATION_IDENTIFIER = "reading-plan-daily-reminder";
const ANDROID_CHANNEL_ID = "reading-plan";
const DEFAULT_TIME = "08:00";
const SCHEDULE_DAYS = 60;
const MIN_HABIT_SAMPLES = 5;
const MAX_HABIT_SAMPLES = 20;
const TOPIC_SUBSCRIPTION_MODULE = "ExpoTopicSubscriptionModule";

type NotificationsModule = typeof import("expo-notifications");

const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let notificationsModule: NotificationsModule | null = null;
let scheduleQueue: Promise<void> = Promise.resolve();

function getNotifications(): NotificationsModule | null {
  if (IS_EXPO_GO) return null;
  if (!requireOptionalNativeModule(TOPIC_SUBSCRIPTION_MODULE)) return null;
  if (notificationsModule) return notificationsModule;
  try {
    const loaded: NotificationsModule = require("expo-notifications");
    loaded.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationsModule = loaded;
    return loaded;
  } catch {
    return null;
  }
}

function parseTime(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(":").map((v) => parseInt(v, 10));
  return {
    hour: Number.isFinite(h) ? h : 8,
    minute: Number.isFinite(m) ? m : 0,
  };
}

export function useReadingPlanNotifications() {
  const { activePlans, getBiblePlanStats } = useBiblePlan();
  const [enabled, setEnabledState] = useState(false);
  const [time, setTimeState] = useState(DEFAULT_TIME);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const Notifications = getNotifications();
    if (!Notifications || Platform.OS !== "android") return;
    Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Lembrete de leitura",
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [savedEnabled, savedTime] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.READING_PLAN_NOTIFICATIONS_ENABLED),
          AsyncStorage.getItem(STORAGE_KEYS.READING_PLAN_NOTIFICATION_TIME),
        ]);
        setEnabledState(savedEnabled === "true");
        if (savedTime) setTimeState(savedTime);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    if (value) {
      const Notifications = getNotifications();
      if (!Notifications) {
        setEnabledState(false);
        return;
      }
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        setEnabledState(false);
        await AsyncStorage.setItem(
          STORAGE_KEYS.READING_PLAN_NOTIFICATIONS_ENABLED,
          "false",
        );
        return;
      }
    }
    setEnabledState(value);
    await AsyncStorage.setItem(
      STORAGE_KEYS.READING_PLAN_NOTIFICATIONS_ENABLED,
      String(value),
    );
  }, []);

  const setTime = useCallback(async (value: string) => {
    setTimeState(value);
    await AsyncStorage.setItem(
      STORAGE_KEYS.READING_PLAN_NOTIFICATION_TIME,
      value,
    );
  }, []);

  const { hasActivePlan, isTodayDone, suggestedTime } = useMemo(() => {
    let hasActive = false;
    let hasPendingToday = false;
    const completions: number[] = [];
    for (const plan of activePlans) {
      const template = getBiblePlanTemplate(plan.templateId);
      if (!template) continue;
      const stats = getBiblePlanStats(plan, template.months);
      if (!stats.isPaused && !stats.isCompleted) {
        hasActive = true;
        if (stats.completedCount < stats.elapsed) hasPendingToday = true;
      }
      for (const entry of [
        ...Object.values(plan.completedDays),
        ...Object.values(plan.completedChapters ?? {}),
      ]) {
        if (entry.isCompleted && entry.completedAt) {
          completions.push(entry.completedAt);
        }
      }
    }
    const hours = completions
      .sort((x, y) => y - x)
      .slice(0, MAX_HABIT_SAMPLES)
      .map((at) => new Date(at).getHours())
      .sort((x, y) => x - y);
    const habitHour =
      hours.length >= MIN_HABIT_SAMPLES
        ? hours[Math.floor(hours.length / 2)]
        : null;
    return {
      hasActivePlan: hasActive,
      isTodayDone: !hasPendingToday,
      suggestedTime:
        habitHour !== null && habitHour !== parseTime(time).hour
          ? `${String(habitHour).padStart(2, "0")}:00`
          : null,
    };
  }, [activePlans, getBiblePlanStats, time]);

  useEffect(() => {
    const Notifications = getNotifications();
    if (!isLoaded || !Notifications) return;
    scheduleQueue = scheduleQueue.then(async () => {
      const scheduled =
        await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
      await Promise.all(
        scheduled
          .filter((n) => n.identifier.startsWith(NOTIFICATION_IDENTIFIER))
          .map((n) =>
            Notifications.cancelScheduledNotificationAsync(n.identifier).catch(
              () => {},
            ),
          ),
      );

      if (!enabled || !hasActivePlan) return;

      const { hour, minute } = parseTime(time);
      const now = Date.now();
      for (let i = 0; i < SCHEDULE_DAYS; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        date.setHours(hour, minute, 0, 0);
        if (date.getTime() <= now || (i === 0 && isTodayDone)) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `${NOTIFICATION_IDENTIFIER}-${i}`,
          content: {
            title: "Plano de Leitura",
            body: "Hora da sua leitura bíblica!",
            data: { route: "/reading-plan" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: ANDROID_CHANNEL_ID,
          },
        }).catch(() => {});
      }
    });
  }, [isLoaded, enabled, hasActivePlan, isTodayDone, time]);

  return {
    isLoaded,
    isSupported: !IS_EXPO_GO,
    enabled,
    time,
    suggestedTime,
    setEnabled,
    setTime,
  };
}
