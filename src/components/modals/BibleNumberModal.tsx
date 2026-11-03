import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { BibleCountPill } from "../BibleCountPill";
import { BibleGridBlock } from "../BibleGridBlock";
import { BibleIcon } from "../BibleIcon";
import { BibleText } from "../BibleText";
import { BiblePageModal } from "./BiblePageModal";

type BibleNumberModalProps = {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void;
  items: number[];
  title: string;
  iconName: keyof typeof Feather.glyphMap;
  onSelect: (item: number) => void;
  currentItem?: number;
  markedItems?: Set<number>;
  footerText?: string;
};

export function BibleNumberModal({
  visible,
  onClose,
  onBack,
  items,
  title,
  iconName,
  onSelect,
  currentItem,
  markedItems,
  footerText,
}: BibleNumberModalProps) {
  const { ms, height, width, DESIGN } = useResponsive();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: { flexDirection: "row", alignItems: "center" },
        title: { flex: 1, fontWeight: "700" },
        list: {
          paddingBottom: ms(DESIGN.spacing.md),
          gap: ms(DESIGN.spacing.sm),
          paddingHorizontal: ms(DESIGN.spacing.lg),
          paddingTop: ms(DESIGN.spacing.lg),
        },
        footer: { paddingTop: ms(DESIGN.spacing.xs) },
        gridContainer: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: ms(DESIGN.spacing.sm),
          justifyContent: "flex-start",
          width: "100%",
        },
      }),
    [ms, colors, DESIGN],
  );

  const scrollViewRef = React.useRef<any>(null);
  const hasScrolledRef = React.useRef(false);

  React.useEffect(() => {
    if (visible) {
      hasScrolledRef.current = false;
    }
  }, [visible]);

  return (
    <BiblePageModal
      visible={visible}
      onClose={onClose}
      fullHeight
      header={
        <View style={styles.header} testID="bible-number-header">
          {onBack ? (
            <BibleIcon
              name="chevron-left"
              color={colors.primary}
              onPress={onBack}
              backgroundColor={colors.primary + "20"}
              style={{ marginRight: ms(DESIGN.spacing.sm) }}
            />
          ) : (
            <BibleIcon
              name={iconName}
              color={colors.primary}
              backgroundColor={colors.primary + "20"}
              style={{ marginRight: ms(DESIGN.spacing.sm) }}
            />
          )}
          <BibleText
            style={[
              styles.title,
              {
                fontSize: ms(DESIGN.fontSize.xl),
                color: colors.primary,
                fontWeight: "800",
              },
            ]}
          >
            {title}
          </BibleText>

          <BibleIcon
            name="x"
            color={colors.error}
            backgroundColor={colors.error + "20"}
            onPress={onClose}
          />
        </View>
      }
      footer={
        <View style={styles.footer}>
          <BibleCountPill
            count={items.length}
            label={footerText ? footerText : title.toLowerCase()}
            labelPlural={footerText ? footerText : title.toLowerCase()}
          />
        </View>
      }
    >
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        bounces={true}
        overScrollMode="always"
      >
        <View style={styles.gridContainer}>
          {items.map((item) => {
            const paddingHorizontal = ms(DESIGN.spacing.lg) * 4;
            const availableWidth = width - paddingHorizontal;
            const numCols = Math.max(
              1,
              Math.floor(availableWidth / ms(DESIGN.spacing.giant)),
            );
            const itemWidth =
              (availableWidth - (numCols - 1) * ms(DESIGN.spacing.sm)) /
                numCols -
              0.01;
            const isSelected = item === currentItem;
            return (
              <View
                key={item}
                style={{ width: itemWidth }}
                onLayout={
                  isSelected
                    ? (e) => {
                        if (!hasScrolledRef.current && visible) {
                          hasScrolledRef.current = true;
                          const y = Math.max(
                            0,
                            e.nativeEvent.layout.y - ms(DESIGN.spacing.lg),
                          );
                          scrollViewRef.current?.scrollTo({
                            y,
                            animated: false,
                          });
                        }
                      }
                    : undefined
                }
              >
                <BibleGridBlock
                  title={item}
                  exactWidth={itemWidth}
                  isSelected={isSelected}
                  hasMark={markedItems?.has(item)}
                  onPress={() => onSelect(item)}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </BiblePageModal>
  );
}
