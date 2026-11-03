import { useCallback, useRef, useState } from "react";
import { Animated } from "react-native";

export type ToastType = "success" | "info" | "warning";

export type ToastAction = {
  label: string;
  onPress: () => void;
};

export type ToastState = {
  message: string;
  type: ToastType;
  visible: boolean;
  action?: ToastAction;
};

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, type: ToastType = "success", action?: ToastAction) => {
      if (timer.current) clearTimeout(timer.current);

      setToast({ message, type, visible: true, action });

      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(action ? 4000 : 1800),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToast((prev) => ({ ...prev, visible: false }));
      });
    },
    [opacity],
  );

  return { toast, opacity, show };
}
