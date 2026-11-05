import React, { forwardRef, useCallback, useContext } from "react";
import { ScrollViewProps } from "react-native";
import Animated, {
  scrollTo,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { ScrollSyncContext } from "../hooks/useScrollSync";

type Pane = "top" | "bottom";

const SyncedScrollView = forwardRef<any, ScrollViewProps & { pane: Pane }>(
  ({ pane, onScroll, ...rest }, ref) => {
    const sync = useContext(ScrollSyncContext);
    const isTop = pane === "top";
    const ownRef = isTop ? sync?.topRef : sync?.bottomRef;
    const otherRef = isTop ? sync?.bottomRef : sync?.topRef;
    const id = isTop ? 1 : 2;

    const setRef = useCallback(
      (node: any) => {
        (ownRef as any)?.(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ownRef, ref],
    );

    const handler = useAnimatedScrollHandler({
      onBeginDrag: () => {
        if (!sync) return;
        sync.cancelScrollToTop();
        sync.leader.value = id;
        sync.leaderAt.value = Date.now();
      },
      onScroll: (e) => {
        if (sync) sync.offset.value = e.contentOffset.y;
        if (sync && otherRef) {
          const now = Date.now();
          const lead = sync.leader.value;
          const isOtherLeading =
            lead !== 0 && lead !== id && now - sync.leaderAt.value < 150;
          if (!isOtherLeading) {
            sync.leader.value = id;
            sync.leaderAt.value = now;
            scrollTo(otherRef, 0, e.contentOffset.y, false);
          }
        }
        if (onScroll) {
          scheduleOnRN(onScroll as any, {
            nativeEvent: {
              contentOffset: e.contentOffset,
              contentSize: e.contentSize,
              layoutMeasurement: e.layoutMeasurement,
            },
          });
        }
      },
      onEndDrag: (e) => {
        if (sync && Math.abs(e.velocity?.y ?? 0) < 0.05) sync.leader.value = 0;
      },
      onMomentumEnd: () => {
        if (sync) sync.leader.value = 0;
      },
    });

    return <Animated.ScrollView {...rest} ref={setRef} onScroll={handler} />;
  },
);

export const TopSyncedScrollView = forwardRef<any, ScrollViewProps>(
  (props, ref) => <SyncedScrollView {...props} ref={ref} pane="top" />,
);

export const BottomSyncedScrollView = forwardRef<any, ScrollViewProps>(
  (props, ref) => <SyncedScrollView {...props} ref={ref} pane="bottom" />,
);
