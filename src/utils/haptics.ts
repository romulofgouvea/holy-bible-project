import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

let hapticsEnabled = true;

export const setHapticsGlobal = (enabled: boolean) => {
  hapticsEnabled = enabled;
};

export const impactLight = () => {
  if (Platform.OS === "web" || !hapticsEnabled) return;
  Promise.resolve()
    .then(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
    .catch(() => {});
};

export const impactMedium = () => {
  if (Platform.OS === "web" || !hapticsEnabled) return;
  Promise.resolve()
    .then(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium))
    .catch(() => {});
};

export const impactHeavy = () => {
  if (Platform.OS === "web" || !hapticsEnabled) return;
  Promise.resolve()
    .then(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy))
    .catch(() => {});
};

export const selectionHaptic = () => {
  if (Platform.OS === "web" || !hapticsEnabled) return;
  Promise.resolve()
    .then(() => Haptics.selectionAsync())
    .catch(() => {});
};

export const notificationSuccess = () => {
  if (Platform.OS === "web" || !hapticsEnabled) return;
  Promise.resolve()
    .then(() =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    )
    .catch(() => {});
};
