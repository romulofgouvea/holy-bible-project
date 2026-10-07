import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  GestureResponderEvent,
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioSettings } from "../../hooks/useAudioSettings";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { ChapterAudioManifest } from "../../models";
import { AudioService } from "../../services/AudioService";
import { BibleIcon } from "../BibleIcon";
import { BibleText } from "../BibleText";

type BibleAudioModalProps = {
  visible: boolean;
  version: string;
  abbrev: string;
  chapter: number;
  voice: string;
  onClose: () => void;
  onShowToast?: (msg: string, type?: "success" | "info" | "warning") => void;
  onVerseChange?: (verse: number | null) => void;
  onOpenSettings?: () => void;
  onRequestNextChapter?: () => boolean;
};

export type BibleAudioModalHandle = {
  seekToVerse: (verse: number) => void;
};

function verseAtTime(
  manifest: ChapterAudioManifest,
  time: number,
): number | null {
  let current: number | null = null;
  for (const v of manifest.verses) {
    if (v.start <= time) current = v.verse;
    else break;
  }
  return current;
}

const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2] as const;
type SpeedOption = (typeof SPEED_OPTIONS)[number];

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const BibleAudioModal = forwardRef<
  BibleAudioModalHandle,
  BibleAudioModalProps
>(function BibleAudioModal(props, ref) {
  const { visible, version, abbrev, chapter, voice, onClose } = props;
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const { continuousPlayback } = useAudioSettings();

  const [isLoading, setIsLoading] = useState(false);
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [verseTimings, setVerseTimings] = useState<ChapterAudioManifest | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProgressReset, setIsProgressReset] = useState(true);
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [trackWidth, setTrackWidth] = useState(0);

  const hasLoadedAudio = audioUrls.length > 0;

  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);

  const continuousPlaybackRef = useRef(continuousPlayback);
  continuousPlaybackRef.current = continuousPlayback;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const insets = useSafeAreaInsets();
  const hiddenY = ms(DESIGN.layout.settingsIconOffset * 3);
  const translateY = useRef(new Animated.Value(hiddenY)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : hiddenY,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible, hiddenY]);

  const wasVisibleRef = useRef(visible);
  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = visible;
    if (justOpened && !isPlaying) {
      setIsProgressReset(true);
      progressAnim.setValue(0);
      setCurrentVerseIndex(0);
      if (status.isLoaded) player.seekTo(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "duckOthers",
    });
  }, []);

  const duration = status.duration ?? 0;
  const currentTime = status.currentTime ?? 0;
  const progress =
    !isProgressReset && status.isLoaded && hasLoadedAudio && duration > 0
      ? Math.min(currentTime / duration, 1)
      : 0;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const handleSeek = (event: GestureResponderEvent) => {
    if (!status.isLoaded || duration <= 0 || trackWidth <= 0) return;
    const { locationX } = event.nativeEvent;
    const ratio = Math.max(0, Math.min(locationX / trackWidth, 1));
    const seekTime = ratio * duration;
    setIsProgressReset(false);
    player.seekTo(seekTime);
  };

  const cycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(speed);
    const nextSpeed = SPEED_OPTIONS[(currentIndex + 1) % SPEED_OPTIONS.length];
    setSpeed(nextSpeed);
    player.shouldCorrectPitch = true;
    player.setPlaybackRate(nextSpeed, "high");
  };

  const playVerse = async (index: number, urls: string[]) => {
    if (index >= urls.length) {
      setIsPlaying(false);
      setCurrentVerseIndex(0);
      return;
    }

    setCurrentVerseIndex(index);
    const playUri = urls[index];

    try {
      player.replace(playUri);
      player.shouldCorrectPitch = true;
      player.setPlaybackRate(speed, "high");
      player.play();
      setIsProgressReset(false);
    } catch {
      props.onShowToast?.("Erro ao reproduzir o áudio.", "warning");
      setIsPlaying(false);
    }
  };

  const hasFinished =
    !!status.didJustFinish ||
    (status.isLoaded &&
      !status.playing &&
      duration > 0 &&
      currentTime >= duration - 0.1);

  useEffect(() => {
    if (!hasFinished || !isPlayingRef.current) return;

    const nextIndex = currentVerseIndex + 1;
    if (nextIndex < audioUrls.length) {
      playVerse(nextIndex, audioUrls);
      return;
    }

    if (continuousPlaybackRef.current && props.onRequestNextChapter?.()) {
      return;
    }

    setIsPlaying(false);
    setCurrentVerseIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasFinished]);

  const loadAudio = async () => {
    setIsLoading(true);
    setIsProgressReset(true);
    progressAnim.setValue(0);
    try {
      let localUri = await AudioService.findLocalAudioUri(
        version,
        abbrev,
        chapter,
        voice,
      );
      if (!localUri) {
        localUri = await AudioService.downloadChapterAudio(
          version,
          abbrev,
          chapter,
          voice,
        );
      }

      if (!localUri) {
        props.onShowToast?.("Áudio não disponível nessa voz ainda.", "info");
        return;
      }

      AudioService.getVerseTimings(version, abbrev, chapter, voice).then(
        (manifest) => {
          if (manifest) setVerseTimings(manifest);
        },
      );
      setAudioUrls([localUri]);
      setIsPlaying(true);
      playVerse(0, [localUri]);
    } catch {
      props.onShowToast?.("Erro ao buscar o áudio.", "warning");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!verseTimings) return;
    const verse = verseAtTime(verseTimings, status.currentTime ?? 0);
    props.onVerseChange?.(verse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseTimings, status.currentTime]);

  useImperativeHandle(
    ref,
    () => ({
      seekToVerse: (verse: number) => {
        if (!verseTimings) return;
        const timing = verseTimings.verses.find((v) => v.verse === verse);
        if (!timing) return;
        player.seekTo(timing.start);
        setIsProgressReset(false);
        if (!isPlaying) {
          setIsPlaying(true);
          player.play();
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [verseTimings, isPlaying],
  );

  const chapterKeyRef = useRef(`${version}-${abbrev}-${chapter}-${voice}`);

  useEffect(() => {
    const key = `${version}-${abbrev}-${chapter}-${voice}`;
    const hasChapterChanged = chapterKeyRef.current !== key;
    chapterKeyRef.current = key;

    setAudioUrls([]);
    setVerseTimings(null);
    props.onVerseChange?.(null);
    setCurrentVerseIndex(0);
    setIsPlaying(false);
    setIsProgressReset(true);
    progressAnim.setValue(0);
    player.pause();

    if (
      hasChapterChanged &&
      continuousPlaybackRef.current &&
      (visibleRef.current || isPlayingRef.current)
    ) {
      loadAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, abbrev, chapter, voice]);

  const handlePlayPause = () => {
    if (isLoading) return;
    if (!hasLoadedAudio) {
      loadAudio();
    } else if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      setIsProgressReset(false);
      if (status.isLoaded) {
        player.shouldCorrectPitch = true;
        player.setPlaybackRate(speed, "high");
        player.play();
      } else {
        playVerse(currentVerseIndex, audioUrls);
      }
    }
  };

  const hasProgress =
    !isProgressReset && status.isLoaded && hasLoadedAudio && duration > 0;

  const ICON_SIZE = ms(DESIGN.icon.xl);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: ms(DESIGN.spacing.md),
          margin: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          borderWidth: 1,
          elevation: 24,
          shadowOffset: { width: 0, height: ms(6) },
          shadowOpacity: 0.25,
          shadowRadius: ms(16),
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.sm),
        },
        iconBtn: {
          width: ICON_SIZE,
          height: ICON_SIZE,
          borderRadius: ms(DESIGN.borderRadius.sm),
          alignItems: "center",
          justifyContent: "center",
        },
        speedText: {
          fontSize: ms(DESIGN.fontSize.xs),
          fontWeight: "800",
          color: colors.primary,
          letterSpacing: 0.2,
        },
        progressWrap: {
          flex: 1,
          justifyContent: "center",
          paddingVertical: ms(DESIGN.spacing.xs),
        },
        progressTrack: {
          height: ms(6),
          borderRadius: ms(3),
          backgroundColor: colors.border,
          overflow: "visible",
        },
        progressFill: {
          height: "100%",
          borderRadius: ms(3),
          backgroundColor: colors.primary,
        },
        progressThumb: {
          position: "absolute",
          top: ms(-5),
          width: ms(16),
          height: ms(16),
          borderRadius: ms(8),
          backgroundColor: colors.primary,
          marginLeft: ms(-8),
          elevation: 4,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: ms(2) },
          shadowOpacity: 0.5,
          shadowRadius: ms(4),
        },
      }),
    [ms, colors, DESIGN, ICON_SIZE],
  );

  if (!visible && !hasLoadedAudio && !isLoading) return null;

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          transform: [{ translateY }],
          backgroundColor: colors.background,
          padding: ms(DESIGN.spacing.sm),
          borderColor: colors.border,
          shadowColor: colors.primary,
        },
      ]}
    >
      <View style={styles.row}>
        <TouchableOpacity
          style={[
            styles.iconBtn,
            { backgroundColor: colors.primary, opacity: isLoading ? 0.75 : 1 },
          ]}
          onPress={handlePlayPause}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <BibleIcon
            name={isLoading ? "loader" : isPlaying ? "pause" : "play"}
            color={colors.onPrimary}
            style={{ marginLeft: !isLoading && !isPlaying ? ms(2) : 0 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.iconBtn,
            {
              backgroundColor: colors.surfaceHighlight,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
          onPress={cycleSpeed}
          disabled={!status.isLoaded}
          activeOpacity={0.7}
        >
          <BibleText style={styles.speedText}>{speed}x</BibleText>
        </TouchableOpacity>

        {props.onOpenSettings && (
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceHighlight,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
            onPress={props.onOpenSettings}
            activeOpacity={0.7}
          >
            <BibleIcon
              name="settings"
              size={ms(DESIGN.fontSize.lg)}
              color={colors.onBackground}
            />
          </TouchableOpacity>
        )}

        <View
          style={styles.progressWrap}
          onLayout={(e: LayoutChangeEvent) =>
            setTrackWidth(e.nativeEvent.layout.width)
          }
          onStartShouldSetResponder={() => hasProgress}
          onResponderGrant={handleSeek}
          onResponderMove={handleSeek}
        >
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
            {hasProgress && (
              <Animated.View
                style={[
                  styles.progressThumb,
                  {
                    left: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            )}
          </View>
        </View>

        <BibleIcon
          name="x"
          color={colors.error}
          backgroundColor={colors.error + "20"}
          containerSize={DESIGN.icon.xl}
          onPress={() => {
            player.pause();
            setIsPlaying(false);
            props.onVerseChange?.(null);
            onClose();
          }}
        />
      </View>
    </Animated.View>
  );
});
