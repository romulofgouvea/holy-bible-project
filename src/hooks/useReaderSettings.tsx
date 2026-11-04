import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useFocusEffect } from "expo-router";
import { Lora_400Regular } from "@expo-google-fonts/lora";
import * as Brightness from "expo-brightness";
import { useFonts } from "expo-font";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { DeviceEventEmitter, Platform } from "react-native";
import {
  COLOR_THEMES,
  ThemeColors,
  sepiaColors,
  ColorThemeKey,
} from "../constants/colors";
import { STORAGE_KEYS } from "../constants/storage";
import { BACKUP_RESTORED_EVENT } from "../utils/backup";
import { useTheme } from "./useTheme";

import { LineSpacing, ReaderTheme, ReaderFont, TextAlign } from "../models";

const KEEP_AWAKE_TAG = "reader-settings";

export type ReaderSettingsContextType = {
  fontSizeMultiplier: number;
  setFontSizeMultiplier: (val: number) => void;
  textAlign: TextAlign;
  setTextAlign: (val: TextAlign) => void;
  readerTheme: ReaderTheme;
  setReaderTheme: (val: ReaderTheme) => void;
  readerFont: ReaderFont;
  setReaderFont: (val: ReaderFont) => void;
  readerFontFamily: string;
  readerColors: ThemeColors;
  shouldShowTitles: boolean;
  setShouldShowTitles: (val: boolean) => void;
  shouldShowVerseNumbers: boolean;
  setShouldShowVerseNumbers: (val: boolean) => void;
  isSpellcheckEnabled: boolean;
  setIsSpellcheckEnabled: (val: boolean) => void;
  isFocusMode: boolean;
  setIsFocusMode: (val: boolean) => void;
  lineSpacing: LineSpacing;
  setLineSpacing: (val: LineSpacing) => void;
  readerBrightness: number | null;
  setReaderBrightness: (val: number | null) => void;
  isKeepAwake: boolean;
  setIsKeepAwake: (val: boolean) => void;
};

const ReaderSettingsContext = createContext<ReaderSettingsContextType>(
  {} as ReaderSettingsContextType,
);

export const ReaderSettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { colorTheme } = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [fontSizeMultiplier, setFontSizeMultiplierState] = useState(1);
  const [textAlign, setTextAlignState] = useState<TextAlign>("left");
  const [readerTheme, setReaderThemeState] = useState<ReaderTheme>("light");
  const [readerFont, setReaderFontState] = useState<ReaderFont>("poppins");
  const [shouldShowTitles, setShouldShowTitlesState] = useState(true);
  const [shouldShowVerseNumbers, setShouldShowVerseNumbersState] =
    useState(true);
  const [isSpellcheckEnabled, setIsSpellcheckEnabledState] = useState(true);
  const [isFocusMode, setIsFocusModeState] = useState(false);
  const [lineSpacing, setLineSpacingState] = useState<LineSpacing>("md");
  const [readerBrightness, setReaderBrightnessState] = useState<number | null>(
    null,
  );
  const [isKeepAwake, setIsKeepAwakeState] = useState(false);
  const [areFontsLoaded, fontsError] = useFonts({ Lora_400Regular });

  const loadReaderSettings = useCallback(async () => {
    try {
      const [
        savedFontSize,
        savedAlign,
        savedTheme,
        savedFont,
        savedShowTitles,
        savedShowVerseNumbers,
        savedSpellcheck,
        savedFocusMode,
        savedLineSpacing,
        savedBrightness,
        savedKeepAwake,
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.FONT_SIZE),
        AsyncStorage.getItem(STORAGE_KEYS.TEXT_ALIGN),
        AsyncStorage.getItem(STORAGE_KEYS.READER_THEME),
        AsyncStorage.getItem(STORAGE_KEYS.READER_FONT),
        AsyncStorage.getItem(STORAGE_KEYS.SHOW_TITLES),
        AsyncStorage.getItem(STORAGE_KEYS.SHOW_VERSE_NUMBERS),
        AsyncStorage.getItem(STORAGE_KEYS.SPELLCHECK_ENABLED),
        AsyncStorage.getItem(STORAGE_KEYS.FOCUS_MODE),
        AsyncStorage.getItem(STORAGE_KEYS.LINE_SPACING),
        AsyncStorage.getItem(STORAGE_KEYS.READER_BRIGHTNESS),
        AsyncStorage.getItem(STORAGE_KEYS.KEEP_SCREEN_AWAKE),
      ]);

      if (savedFontSize !== null)
        setFontSizeMultiplierState(Number(savedFontSize));
      if (savedAlign !== null) setTextAlignState(savedAlign as TextAlign);
      if (savedTheme !== null) setReaderThemeState(savedTheme as ReaderTheme);
      if (savedFont !== null) setReaderFontState(savedFont as ReaderFont);
      if (savedShowTitles !== null)
        setShouldShowTitlesState(savedShowTitles === "true");
      if (savedShowVerseNumbers !== null)
        setShouldShowVerseNumbersState(savedShowVerseNumbers === "true");
      if (savedSpellcheck !== null)
        setIsSpellcheckEnabledState(savedSpellcheck === "true");
      if (savedFocusMode !== null)
        setIsFocusModeState(savedFocusMode === "true");
      if (savedLineSpacing !== null)
        setLineSpacingState(savedLineSpacing as LineSpacing);
      setReaderBrightnessState(
        savedBrightness !== null && savedBrightness !== ""
          ? Number(savedBrightness)
          : null,
      );
      setIsKeepAwakeState(savedKeepAwake === "true");
    } catch (e) {}
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadReaderSettings();
    const sub = DeviceEventEmitter.addListener(
      BACKUP_RESTORED_EVENT,
      loadReaderSettings,
    );
    return () => sub.remove();
  }, [loadReaderSettings]);

  const setFontSizeMultiplier = useCallback(async (val: number) => {
    setFontSizeMultiplierState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FONT_SIZE, String(val));
    } catch (e) {}
  }, []);

  const setTextAlign = useCallback(async (val: TextAlign) => {
    setTextAlignState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TEXT_ALIGN, val);
    } catch (e) {}
  }, []);

  const setReaderTheme = useCallback(async (val: ReaderTheme) => {
    setReaderThemeState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.READER_THEME, val);
    } catch (e) {}
  }, []);

  const setReaderFont = useCallback(async (val: ReaderFont) => {
    setReaderFontState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.READER_FONT, val);
    } catch (e) {}
  }, []);

  const setShouldShowTitles = useCallback(async (val: boolean) => {
    setShouldShowTitlesState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOW_TITLES, String(val));
    } catch (e) {}
  }, []);

  const setShouldShowVerseNumbers = useCallback(async (val: boolean) => {
    setShouldShowVerseNumbersState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SHOW_VERSE_NUMBERS, String(val));
    } catch (e) {}
  }, []);

  const setIsFocusMode = useCallback(async (val: boolean) => {
    setIsFocusModeState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FOCUS_MODE, String(val));
    } catch (e) {}
  }, []);

  const setLineSpacing = useCallback(async (val: LineSpacing) => {
    setLineSpacingState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LINE_SPACING, val);
    } catch (e) {}
  }, []);

  const setReaderBrightness = useCallback(async (val: number | null) => {
    setReaderBrightnessState(val);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.READER_BRIGHTNESS,
        val === null ? "" : String(val),
      );
    } catch (e) {}
  }, []);

  const setIsKeepAwake = useCallback(async (val: boolean) => {
    setIsKeepAwakeState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.KEEP_SCREEN_AWAKE, String(val));
    } catch (e) {}
  }, []);

  const setIsSpellcheckEnabled = useCallback(async (val: boolean) => {
    setIsSpellcheckEnabledState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SPELLCHECK_ENABLED, String(val));
    } catch (e) {}
  }, []);

  const value = useMemo(() => {
    const activePalette =
      COLOR_THEMES[colorTheme as ColorThemeKey] || COLOR_THEMES.teal;
    const readerColors =
      readerTheme === "sepia"
        ? sepiaColors
        : readerTheme === "black"
          ? { ...activePalette.dark, background: "#000000", surface: "#0B0B0B" }
          : readerTheme === "dark"
            ? activePalette.dark
            : activePalette.light;

    const readerFontFamily =
      readerFont === "monospace"
        ? Platform.OS === "ios"
          ? "Courier"
          : "monospace"
        : readerFont === "lora"
          ? "Lora_400Regular"
          : "Poppins_400Regular";

    return {
      fontSizeMultiplier,
      setFontSizeMultiplier,
      textAlign,
      setTextAlign,
      readerTheme,
      setReaderTheme,
      readerFont,
      setReaderFont,
      readerFontFamily,
      readerColors,
      shouldShowTitles,
      setShouldShowTitles,
      shouldShowVerseNumbers,
      setShouldShowVerseNumbers,
      isSpellcheckEnabled,
      setIsSpellcheckEnabled,
      isFocusMode,
      setIsFocusMode,
      lineSpacing,
      setLineSpacing,
      readerBrightness,
      setReaderBrightness,
      isKeepAwake,
      setIsKeepAwake,
    };
  }, [
    colorTheme,
    fontSizeMultiplier,
    textAlign,
    readerTheme,
    readerFont,
    shouldShowTitles,
    shouldShowVerseNumbers,
    isSpellcheckEnabled,
    setIsSpellcheckEnabled,
    isFocusMode,
    setIsFocusMode,
    lineSpacing,
    setLineSpacing,
    readerBrightness,
    setReaderBrightness,
    isKeepAwake,
    setIsKeepAwake,
    setFontSizeMultiplier,
    setTextAlign,
    setReaderTheme,
    setReaderFont,
    setShouldShowTitles,
    setShouldShowVerseNumbers,
  ]);

  if (!isLoaded || !(areFontsLoaded || fontsError)) return null;

  return (
    <ReaderSettingsContext.Provider value={value}>
      {children}
    </ReaderSettingsContext.Provider>
  );
};

export const useReaderSettings = () => useContext(ReaderSettingsContext);

export const useReaderScreenEffects = () => {
  const { isKeepAwake, readerBrightness } = useReaderSettings();

  useFocusEffect(
    useCallback(() => {
      if (!isKeepAwake) return;
      activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
      return () => {
        deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
      };
    }, [isKeepAwake]),
  );

  useFocusEffect(
    useCallback(() => {
      if (readerBrightness === null) return;
      Brightness.setBrightnessAsync(readerBrightness).catch(() => {});
      return () => {
        if (Platform.OS === "android")
          Brightness.restoreSystemBrightnessAsync().catch(() => {});
      };
    }, [readerBrightness]),
  );
};
