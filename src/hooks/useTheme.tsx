import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { DeviceEventEmitter } from "react-native";
import { STORAGE_KEYS } from "../constants/storage";
import { BACKUP_RESTORED_EVENT } from "../utils/backup";

import {
  COLOR_THEMES,
  ColorThemeKey,
  COMMON_COLORS,
  getSupportColors,
  ThemeColors,
} from "../constants/colors";
import { setHapticsGlobal } from "../utils/haptics";

export { ColorThemeKey, ThemeColors };

export type ColorThemeMeta = {
  key: ColorThemeKey;
  label: string;
  swatch: string;
  light: ThemeColors;
  dark: ThemeColors;
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleDarkMode: (value?: boolean) => void;
  colors: ThemeColors & ReturnType<typeof getSupportColors>;
  colorTheme: ColorThemeKey;
  setColorTheme: (key: ColorThemeKey) => void;
  hapticsEnabled: boolean;
  toggleHaptics: (value?: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [colorTheme, setColorThemeState] = useState<ColorThemeKey>("teal");
  const [hapticsEnabled, setHapticsEnabled] = useState(false);

  const loadThemeSettings = useCallback(async () => {
    try {
      const [savedDark, savedTheme, savedHaptics] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.DARK_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.APP_COLOR_THEME),
        AsyncStorage.getItem(STORAGE_KEYS.HAPTICS_ENABLED),
      ]);
      if (savedDark !== null) setIsDarkMode(savedDark === "true");
      if (savedHaptics !== null) setHapticsEnabled(savedHaptics === "true");
      if (savedTheme && Object.keys(COLOR_THEMES).includes(savedTheme)) {
        setColorThemeState(savedTheme as ColorThemeKey);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadThemeSettings();
    const sub = DeviceEventEmitter.addListener(
      BACKUP_RESTORED_EVENT,
      loadThemeSettings,
    );
    return () => sub.remove();
  }, [loadThemeSettings]);

  useEffect(() => {
    setHapticsGlobal(hapticsEnabled);
  }, [hapticsEnabled]);

  const toggleHaptics = async (value?: boolean) => {
    const nextVal = value !== undefined ? value : !hapticsEnabled;
    setHapticsEnabled(nextVal);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAPTICS_ENABLED, String(nextVal));
    } catch (e) {}
  };

  const toggleDarkMode = async (value?: boolean) => {
    const nextVal = value !== undefined ? value : !isDarkMode;
    setIsDarkMode(nextVal);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DARK_MODE, String(nextVal));
    } catch (e) {}
  };

  const setColorTheme = async (key: ColorThemeKey) => {
    setColorThemeState(key);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.APP_COLOR_THEME, key);
    } catch (e) {}
  };

  const activePalette = COLOR_THEMES[colorTheme] || COLOR_THEMES.teal;
  const themeColors = isDarkMode ? activePalette.dark : activePalette.light;
  const colors = {
    ...themeColors,
    ...getSupportColors(themeColors, isDarkMode),
    ...COMMON_COLORS,
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleDarkMode,
        colors,
        colorTheme,
        setColorTheme,
        hapticsEnabled,
        toggleHaptics,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
