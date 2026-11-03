import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useDrawings } from "../hooks/useDrawings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { impactLight } from "../utils/haptics";
import { BibleIcon } from "./BibleIcon";
import { DrawingColorSlider } from "./DrawingColorSlider";
import { DrawingWidthSlider } from "./DrawingWidthSlider";
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
    const [isSliderOpen, setIsSliderOpen] = useState(false);
    const [isClearVisible, setIsClearVisible] = useState(false);
    const [barHeight, setBarHeight] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isWidthOpen, setIsWidthOpen] = useState(false);
    const {
      tool,
      isErasing,
      color,
      recentColors,
      setColor,
      baseWidth,
      canUndo,
      canRedo,
      setTool,
      setIsErasing,
      undo,
      redo,
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
            paddingBottom: ms(DESIGN.spacing.md),
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
          },
          recentRow: {
            flexDirection: "row",
            alignItems: "center",
            gap: ms(DESIGN.spacing.md),
          },
          recentDot: {
            width: ms(DESIGN.spacing.xl),
            height: ms(DESIGN.spacing.xl),
            borderRadius: ms(DESIGN.borderRadius.full),
          },
          divider: {
            width: 1,
            height: ms(DESIGN.icon.xl * 0.6),
          },
          widthDot: {
            borderRadius: ms(DESIGN.borderRadius.full),
          },
        }),
      [ms, DESIGN],
    );

    const handleToggleWidth = () => {
      setIsSliderOpen(false);
      setIsWidthOpen((prev) => !prev);
    };

    const handleToggleCollapsed = () => {
      setIsSliderOpen(false);
      setIsWidthOpen(false);
      setIsCollapsed((prev) => !prev);
    };

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

    const dotSize = ms(baseWidth + DESIGN.spacing.xs);

    return (
      <>
        {isWidthOpen && (
          <DrawingWidthSlider
            bottom={barHeight + ms(DESIGN.spacing.sm)}
            left={
              ms(DESIGN.spacing.lg) +
              (ms(DESIGN.icon.xl) + ms(DESIGN.spacing.sm)) * 2
            }
            onDone={() => setIsWidthOpen(false)}
          />
        )}
        {isSliderOpen && (
          <DrawingColorSlider
            bottom={barHeight + ms(DESIGN.spacing.sm)}
            left={
              ms(DESIGN.spacing.lg) + ms(DESIGN.icon.xl) + ms(DESIGN.spacing.sm)
            }
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
          {!isCollapsed && (
            <>
              <View style={styles.toolRow}>
                {recentColors.length > 0 && (
                  <View style={styles.recentRow}>
                    {recentColors.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[styles.recentDot, { backgroundColor: c }]}
                        onPress={() => {
                          impactLight();
                          setColor(c);
                          setIsErasing(false);
                        }}
                        testID="drawing-recent-color"
                      />
                    ))}
                  </View>
                )}
                <View style={[styles.toolGroup, { marginLeft: "auto" }]}>
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
                    redo,
                    "drawing-redo",
                    <BibleIcon
                      name="corner-up-right"
                      size={ms(DESIGN.spacing.lg)}
                      color={canRedo ? colors.primary : colors.textMuted}
                    />,
                    !canRedo,
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
            </>
          )}
          <View style={styles.toolRow}>
            <View style={styles.toolGroup}>
              {secondaryBtn(
                handleToggleCollapsed,
                isCollapsed ? "drawing-expand" : "drawing-collapse",
                <BibleIcon
                  name={isCollapsed ? "chevron-up" : "chevron-down"}
                  size={ms(DESIGN.spacing.lg)}
                  color={colors.primary}
                />,
              )}
              {secondaryBtn(
                () => {
                  setIsWidthOpen(false);
                  setIsSliderOpen((prev) => !prev);
                },
                "drawing-color",
                <View style={[styles.colorDot, { backgroundColor: color }]} />,
              )}
              {secondaryBtn(
                handleToggleWidth,
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
              <View
                style={[styles.divider, { backgroundColor: colors.border }]}
              />
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
              style={[styles.iconBtn, { backgroundColor: colors.primary }]}
              onPress={onDone}
              accessibilityLabel="Concluir"
              testID="drawing-done"
            >
              <BibleIcon
                name="check"
                size={ms(DESIGN.spacing.lg)}
                color={colors.onPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
        <BibleConfirmModal
          visible={isClearVisible}
          title="Limpar desenhos"
          message={
            verses.length === 1
              ? "Apagar os desenhos do versículo selecionado?"
              : `Apagar os desenhos dos ${verses.length} versículos selecionados?`
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
