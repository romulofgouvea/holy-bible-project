import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DRAWING_WIDTHS, useDrawings } from "../hooks/useDrawings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { impactLight } from "../utils/haptics";
import { BibleIcon } from "./BibleIcon";
import { BibleText } from "./BibleText";
import { DrawingColorSlider } from "./DrawingColorSlider";
import { BibleConfirmModal } from "./modals/BibleConfirmModal";

type Props = {
  version: string;
  bookAbbrev: string;
  chapter: number;
  verses: number[];
  onDone: () => void;
};

export const DrawingToolbar = React.memo(
  ({ version, bookAbbrev, chapter, verses, onDone }: Props) => {
    const { ms, DESIGN } = useResponsive();
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [isSliderOpen, setIsSliderOpen] = useState(false);
    const [isClearVisible, setIsClearVisible] = useState(false);
    const [barHeight, setBarHeight] = useState(0);
    const {
      tool,
      isErasing,
      color,
      widthIndex,
      canUndo,
      setTool,
      setIsErasing,
      cycleWidth,
      undo,
      clearVerses,
    } = useDrawings();

    const styles = useMemo(
      () =>
        StyleSheet.create({
          bar: {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            paddingTop: ms(DESIGN.spacing.md),
            paddingBottom: ms(DESIGN.spacing.md) + insets.bottom,
            borderTopLeftRadius: ms(DESIGN.borderRadius.xl),
            borderTopRightRadius: ms(DESIGN.borderRadius.xl),
            borderWidth: 1,
            elevation: 20,
            gap: ms(DESIGN.spacing.md),
          },
          toolRow: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: ms(DESIGN.spacing.lg),
          },
          toolGroup: {
            flexDirection: "row",
            alignItems: "center",
            gap: ms(DESIGN.spacing.sm),
          },
          iconBtn: {
            width: ms(DESIGN.icon.xl),
            height: ms(DESIGN.icon.xl),
            borderRadius: ms(DESIGN.borderRadius.md),
            alignItems: "center",
            justifyContent: "center",
          },
          colorDot: {
            width: ms(DESIGN.spacing.xl),
            height: ms(DESIGN.spacing.xl),
            borderRadius: ms(DESIGN.borderRadius.full),
            borderWidth: 2,
          },
          widthDot: {
            borderRadius: ms(DESIGN.borderRadius.full),
          },
          doneBtn: {
            paddingHorizontal: ms(DESIGN.spacing.lg),
            height: ms(DESIGN.icon.xl),
            borderRadius: ms(DESIGN.borderRadius.md),
            alignItems: "center",
            justifyContent: "center",
          },
          doneText: {
            fontWeight: "700",
            fontSize: ms(DESIGN.fontSize.md),
          },
        }),
      [ms, DESIGN, insets.bottom],
    );

    const handleBarLayout = (e: LayoutChangeEvent) => {
      setBarHeight(e.nativeEvent.layout.height);
    };

    const handleConfirmClear = () => {
      clearVerses(version, bookAbbrev, chapter, verses);
      setIsClearVisible(false);
    };

    const secondaryBtn = (
      onPress: () => void,
      testID: string,
      content: React.ReactNode,
      disabled?: boolean,
    ) => (
      <TouchableOpacity
        style={[styles.iconBtn, { backgroundColor: colors.surfaceHighlight }]}
        onPress={() => {
          impactLight();
          onPress();
        }}
        disabled={disabled}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );

    const toolButton = (
      icon: "pen" | "marker" | "eraser",
      isActive: boolean,
      onPress: () => void,
      testID: string,
    ) => {
      const iconColor = isActive ? colors.onPrimary : colors.primary;
      const size = ms(DESIGN.spacing.lg);
      return (
        <TouchableOpacity
          testID={testID}
          style={[
            styles.iconBtn,
            {
              backgroundColor: isActive
                ? colors.primary
                : colors.surfaceHighlight,
            },
          ]}
          onPress={() => {
            impactLight();
            onPress();
          }}
        >
          {icon === "eraser" ? (
            <MaterialCommunityIcons
              name="eraser"
              size={size}
              color={iconColor}
            />
          ) : (
            <BibleIcon
              name={icon === "pen" ? "edit-2" : "droplet"}
              size={size}
              color={iconColor}
            />
          )}
        </TouchableOpacity>
      );
    };

    const dotSize = ms(DRAWING_WIDTHS[widthIndex] + DESIGN.spacing.xs);

    return (
      <>
        {isSliderOpen && (
          <DrawingColorSlider
            bottom={barHeight + ms(DESIGN.spacing.sm)}
            left={ms(DESIGN.spacing.lg)}
            onDone={() => setIsSliderOpen(false)}
          />
        )}
        <View
          onLayout={handleBarLayout}
          style={[
            styles.bar,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
          testID="drawing-toolbar"
        >
          <View style={styles.toolRow}>
            <View style={styles.toolGroup}>
              {secondaryBtn(
                () => setIsSliderOpen((prev) => !prev),
                "drawing-color",
                <View
                  style={[
                    styles.colorDot,
                    { backgroundColor: color, borderColor: colors.primary },
                  ]}
                />,
              )}
              {secondaryBtn(
                cycleWidth,
                "drawing-width",
                <View
                  style={[
                    styles.widthDot,
                    {
                      width: dotSize,
                      height: dotSize,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />,
              )}
            </View>
            <View style={styles.toolGroup}>
              {secondaryBtn(
                undo,
                "drawing-undo",
                <BibleIcon
                  name="corner-up-left"
                  size={ms(DESIGN.spacing.lg)}
                  color={canUndo ? colors.primary : colors.textMuted}
                />,
                !canUndo,
              )}
              {secondaryBtn(
                () => setIsClearVisible(true),
                "drawing-clear",
                <BibleIcon
                  name="trash-2"
                  size={ms(DESIGN.spacing.lg)}
                  color={colors.primary}
                />,
              )}
            </View>
          </View>
          <View style={styles.toolRow}>
            <View style={styles.toolGroup}>
              {toolButton(
                "pen",
                !isErasing && tool === "pen",
                () => setTool("pen"),
                "drawing-pen",
              )}
              {toolButton(
                "marker",
                !isErasing && tool === "marker",
                () => setTool("marker"),
                "drawing-marker",
              )}
              {toolButton(
                "eraser",
                isErasing,
                () => setIsErasing(true),
                "drawing-eraser",
              )}
            </View>
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: colors.primary }]}
              onPress={onDone}
              testID="drawing-done"
            >
              <BibleText style={[styles.doneText, { color: colors.onPrimary }]}>
                Concluir
              </BibleText>
            </TouchableOpacity>
          </View>
        </View>
        <BibleConfirmModal
          visible={isClearVisible}
          title="Limpar rabiscos"
          message={
            verses.length === 1
              ? "Apagar os rabiscos do versículo selecionado?"
              : `Apagar os rabiscos dos ${verses.length} versículos selecionados?`
          }
          confirmText="Limpar"
          isDanger
          icon="trash-2"
          onConfirm={handleConfirmClear}
          onCancel={() => setIsClearVisible(false)}
        />
      </>
    );
  },
);
