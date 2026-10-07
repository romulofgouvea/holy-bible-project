import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  ScrollView,
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

type ActionItem = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
  tint?: string;
};

type ActionsDrawerProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  items: ActionItem[];
};

export function BibleActionsDrawer({
  visible,
  onClose,
  title = "Ações",
  items,
}: ActionsDrawerProps) {
  const { ms, width, DESIGN } = useResponsive();
  const drawerWidth = Math.min(ms(DESIGN.maxWidth.sm * 0.7), width * 0.75);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          ...StyleSheet.absoluteFill,
        },
        drawer: {
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          elevation: 24,
          shadowOffset: { width: ms(-DESIGN.spacing.xs), height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: ms(DESIGN.borderRadius.md),
        },
        drawerHeader: {
          flexDirection: "row",
          alignItems: "center",
        },
        drawerTitle: {
          fontWeight: "800",
          letterSpacing: 0.5,
        },
        menuList: {
          flex: 1,
        },
        menuItem: {
          flexDirection: "row",
          alignItems: "center",
          gap: 0,
        },
        menuIconWrap: {
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        menuLabel: {
          fontWeight: "600",
          flex: 1,
        },
      }),
    [ms, colors, DESIGN],
  );

  const [isModalVisible, setIsModalVisible] = useState(visible);

  const translateX = useRef(new Animated.Value(drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setIsModalVisible(true);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: drawerWidth,
          useNativeDriver: true,
          bounciness: 0,
          speed: 20,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsModalVisible(false);
      });
    }
  }, [visible, drawerWidth, translateX, backdropOpacity]);

  const renderItem = (item: ActionItem, index: number) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.menuItem,
        {
          paddingVertical: ms(DESIGN.spacing.sm),
          paddingHorizontal: ms(DESIGN.spacing.sm),
          borderRadius: ms(DESIGN.borderRadius.md),
          marginBottom: ms(DESIGN.spacing.xs),
        },
      ]}
      onPress={() => {
        item.onPress();
        onClose();
      }}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.menuIconWrap,
          {
            width: ms(DESIGN.icon.xl),
            height: ms(DESIGN.icon.xl),
            borderRadius: ms(DESIGN.borderRadius.sm),
            marginRight: ms(DESIGN.spacing.md),
            backgroundColor: colors.primary + "20",
          },
        ]}
      >
        <BibleIcon
          name={item.icon}
          size={ms(DESIGN.fontSize.xl)}
          color={item.tint || colors.primary}
        />
      </View>
      <BibleText
        style={[
          styles.menuLabel,
          {
            fontSize: ms(DESIGN.fontSize.lg),
            color: item.tint || colors.onSurface,
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </BibleText>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill}>
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
            styles.drawer,
            {
              width: drawerWidth,
              transform: [{ translateX }],
              backgroundColor: colors.surface,
              shadowColor: colors.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.drawerHeader,
              {
                backgroundColor: colors.primary,
                paddingTop: Math.max(
                  ms(DESIGN.fontSize.xxl),
                  insets.top + ms(DESIGN.spacing.lg),
                ),
                paddingBottom: ms(DESIGN.fontSize.xxl),
                paddingHorizontal: ms(DESIGN.fontSize.xxl),
              },
            ]}
          >
            <BibleText
              style={[
                styles.drawerTitle,
                { fontSize: ms(DESIGN.fontSize.xl), color: colors.onPrimary },
              ]}
              numberOfLines={1}
            >
              {title}
            </BibleText>
          </View>

          <ScrollView
            style={styles.menuList}
            contentContainerStyle={{
              paddingTop: ms(DESIGN.spacing.md),
              paddingHorizontal: ms(DESIGN.spacing.sm),
              paddingBottom: Math.max(
                ms(DESIGN.spacing.lg),
                insets.bottom + ms(DESIGN.spacing.sm),
              ),
            }}
            showsVerticalScrollIndicator={false}
          >
            {items.map(renderItem)}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
