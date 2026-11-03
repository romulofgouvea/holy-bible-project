import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DeviceEventEmitter } from "react-native";
import { AUDIO_VOICES, DEFAULT_VOICE_ID } from "../constants/audioVoices";
import { STORAGE_KEYS } from "../constants/storage";
import { isSafeVoiceId } from "../utils/sanitize";
import { BACKUP_RESTORED_EVENT } from "../utils/backup";

export type AudioSettingsContextType = {
  selectedVoice: string;
  setSelectedVoice: (val: string) => void;
  continuousPlayback: boolean;
  setContinuousPlayback: (val: boolean) => void;
  autoScroll: boolean;
  setAutoScroll: (val: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (val: number) => void;
};

const AudioSettingsContext = createContext<AudioSettingsContextType>(
  {} as AudioSettingsContextType,
);

export const AudioSettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedVoice, setSelectedVoiceState] =
    useState<string>(DEFAULT_VOICE_ID);
  const [continuousPlayback, setContinuousPlaybackState] = useState(false);
  const [autoScroll, setAutoScrollState] = useState(true);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);

  const loadAudioSettings = useCallback(async () => {
    try {
      const [savedVoice, savedContinuous, savedAutoScroll, savedSpeed] =
        await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.AUDIO_VOICE),
          AsyncStorage.getItem(STORAGE_KEYS.AUDIO_CONTINUOUS_PLAYBACK),
          AsyncStorage.getItem(STORAGE_KEYS.AUDIO_AUTO_SCROLL),
          AsyncStorage.getItem(STORAGE_KEYS.AUDIO_SPEED),
        ]);
      const isKnownVoice = AUDIO_VOICES.some((v) => v.id === savedVoice);
      setSelectedVoiceState(
        isKnownVoice && isSafeVoiceId(savedVoice!)
          ? savedVoice!
          : DEFAULT_VOICE_ID,
      );
      if (savedContinuous !== null)
        setContinuousPlaybackState(savedContinuous === "true");
      if (savedAutoScroll !== null)
        setAutoScrollState(savedAutoScroll === "true");
      const parsedSpeed = parseFloat(savedSpeed ?? "");
      if (parsedSpeed >= 1 && parsedSpeed <= 2)
        setPlaybackSpeedState(parsedSpeed);
    } catch (e) {}
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    loadAudioSettings();
    const sub = DeviceEventEmitter.addListener(
      BACKUP_RESTORED_EVENT,
      loadAudioSettings,
    );
    return () => sub.remove();
  }, [loadAudioSettings]);

  const setSelectedVoice = useCallback(async (val: string) => {
    setSelectedVoiceState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_VOICE, val);
    } catch (e) {}
  }, []);

  const setContinuousPlayback = useCallback(async (val: boolean) => {
    setContinuousPlaybackState(val);
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.AUDIO_CONTINUOUS_PLAYBACK,
        String(val),
      );
    } catch (e) {}
  }, []);

  const setAutoScroll = useCallback(async (val: boolean) => {
    setAutoScrollState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_AUTO_SCROLL, String(val));
    } catch (e) {}
  }, []);

  const setPlaybackSpeed = useCallback(async (val: number) => {
    setPlaybackSpeedState(val);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIO_SPEED, String(val));
    } catch (e) {}
  }, []);

  const value = useMemo(
    () => ({
      selectedVoice,
      setSelectedVoice,
      continuousPlayback,
      setContinuousPlayback,
      autoScroll,
      setAutoScroll,
      playbackSpeed,
      setPlaybackSpeed,
    }),
    [
      selectedVoice,
      setSelectedVoice,
      continuousPlayback,
      setContinuousPlayback,
      autoScroll,
      setAutoScroll,
      playbackSpeed,
      setPlaybackSpeed,
    ],
  );

  if (!isLoaded) return null;

  return (
    <AudioSettingsContext.Provider value={value}>
      {children}
    </AudioSettingsContext.Provider>
  );
};

export const useAudioSettings = () => useContext(AudioSettingsContext);
