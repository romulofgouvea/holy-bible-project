import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { BibleIcon } from "../BibleIcon";
import { BibleText } from "../BibleText";

export type BibleActionItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
  iconColor?: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  items: BibleActionItem[];
  title?: string;
};

export function BibleActionsSheet({ visible, onClose, items, title }: Props) {
  const { colors } = useTheme();
  const { ms, DESIGN } = useResponsive();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFill,
        },
        sheetContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: ms(DESIGN.spacing.lg),
        },
        sheet: {
          width: "100%",
          borderRadius: ms(DESIGN.borderRadius.xl),
          paddingTop: ms(DESIGN.spacing.lg),
          paddingHorizontal: ms(DESIGN.spacing.lg),
          elevation: 24,
          shadowOffset: { width: 0, height: ms(DESIGN.spacing.xs) },
          shadowOpacity: 0.25,
          shadowRadius: ms(DESIGN.borderRadius.lg),
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: ms(DESIGN.spacing.md),
        },
        title: {
          flex: 1,
        },
        item: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: ms(DESIGN.spacing.md),
        },
        label: {
          fontSize: ms(DESIGN.fontSize.lg),
          fontWeight: "700",
        },
      }),
    [ms, colors, DESIGN],
  );

  const [isModalVisible, setIsModalVisible] = useState(visible);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setIsModalVisible(false);
      });
    }
  }, [visible, anim]);

  const backdropOpacity = anim;
  const sheetScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });

  if (!isModalVisible) return null;

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.sheetContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity, backgroundColor: colors.overlay },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              opacity: anim,
              transform: [{ scale: sheetScale }],
              backgroundColor: colors.background,
              shadowColor: colors.shadow,
              paddingBottom: ms(DESIGN.spacing.lg),
            },
          ]}
        >
          <View style={[styles.header, { justifyContent: "center" }]}>
            <BibleText
              style={[
                styles.title,
                {
                  fontSize: ms(DESIGN.fontSize.xl),
                  color: colors.primary,
                  fontWeight: "800",
                  textAlign: "center",
                },
              ]}
            >
              {title || "Ações"}
            </BibleText>
          </View>

          <View>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.item,
                  {
                    borderBottomWidth: index < items.length - 1 ? 1 : 0,
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              >
                <BibleIcon
                  name={item.icon}
                  color={item.iconColor || colors.primary}
                  backgroundColor={(item.iconColor || colors.primary) + "20"}
                  style={{ marginRight: ms(DESIGN.spacing.md) }}
                  containerSize={DESIGN.icon.xl}
                  size={ms(DESIGN.spacing.lg)}
                  borderRadius={DESIGN.borderRadius.md}
                />
                <BibleText
                  style={[
                    styles.label,
                    { color: item.color || colors.onSurface },
                  ]}
                >
                  {item.label}
                </BibleText>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
