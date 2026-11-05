import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useCallback, useEffect, useState } from "react";
import { STORAGE_KEYS } from "../constants/storage";

export const useChangelogOnUpdate = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const current = Constants.expoConfig?.version;
    if (!current) return;
    AsyncStorage.getItem(STORAGE_KEYS.LAST_SEEN_APP_VERSION)
      .then((seen) => {
        if (seen && seen !== current) setIsVisible(true);
        if (seen !== current) {
          return AsyncStorage.setItem(
            STORAGE_KEYS.LAST_SEEN_APP_VERSION,
            current,
          );
        }
      })
      .catch(() => {});
  }, []);

  const close = useCallback(() => setIsVisible(false), []);

  return { isVisible, close };
};
