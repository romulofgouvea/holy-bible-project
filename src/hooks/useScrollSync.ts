import { createContext, useCallback, useMemo } from "react";
import {
  cancelAnimation,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const SCROLL_TOP_DURATION = 350;

export const useScrollSync = () => {
  const topRef = useAnimatedRef<any>();
  const bottomRef = useAnimatedRef<any>();
  const leader = useSharedValue(0);
  const leaderAt = useSharedValue(0);
  const offset = useSharedValue(0);
  const isAnimating = useSharedValue(false);
  const progress = useSharedValue(0);

  useAnimatedReaction(
    () => progress.value,
    (value) => {
      if (!isAnimating.value) return;
      scrollTo(topRef, 0, value, false);
      scrollTo(bottomRef, 0, value, false);
      leader.value = 3;
      leaderAt.value = Date.now();
    },
  );

  const scrollToTop = useCallback(() => {
    isAnimating.set(true);
    progress.set(offset.get());
    progress.set(
      withTiming(0, { duration: SCROLL_TOP_DURATION }, () => {
        isAnimating.set(false);
        leader.set(0);
      }),
    );
  }, [isAnimating, progress, offset, leader]);

  const cancelScrollToTop = useCallback(() => {
    "worklet";
    cancelAnimation(progress);
    isAnimating.set(false);
  }, [progress, isAnimating]);

  return useMemo(
    () => ({
      topRef,
      bottomRef,
      leader,
      leaderAt,
      offset,
      scrollToTop,
      cancelScrollToTop,
    }),
    [
      topRef,
      bottomRef,
      leader,
      leaderAt,
      offset,
      scrollToTop,
      cancelScrollToTop,
    ],
  );
};

export type ScrollSync = ReturnType<typeof useScrollSync>;

export const ScrollSyncContext = createContext<ScrollSync | null>(null);
