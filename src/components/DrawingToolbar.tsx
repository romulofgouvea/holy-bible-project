import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
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

const PREVIEW_DURATION = 1200;
const MARKER_PREVIEW_OPACITY = 0.4;

export const DrawingToolbar = React.memo(
  ({ version, bookAbbrev, chapter, verses, onDone }: Props) => {
    const { ms, DESIGN } = useResponsive();
    const { colors } = useTheme();
    const [isSliderOpen, setIsSliderOpen] = useState(false);
    const [isClearVisible, setIsClearVisible] = useState(false);
    const [barHeight, setBarHeight] = useState(0);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isPreviewVisible, setIsPreviewVisible] = useState(false);
    const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const {
      tool,
      isErasing,
      color,
      recentColors,
      setColor,
      strokeWidth,
      widthIndex,
      canUndo,
      canRedo,
      setTool,
      setIsErasing,
      cycleWidth,
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
            paddingHorizontal: ms(DESIGN.spacing.lg),
          },
          recentDot: {
            width: ms(DESIGN.spacing.xl),
            height: ms(DESIGN.spacing.xl),
            borderRadius: ms(DESIGN.borderRadius.full),
          },
          preview: {
            position: "absolute",
            left: ms(DESIGN.spacing.lg),
            paddingHorizontal: ms(DESIGN.spacing.lg),
            paddingVertical: ms(DESIGN.spacing.md),
            borderRadius: ms(DESIGN.borderRadius.md),
            borderWidth: 1,
            elevation: 24,
          },
          previewLine: {
            width: ms(DESIGN.maxWidth.sm / 4),
            borderRadius: ms(DESIGN.borderRadius.full),
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
      [ms, DESIGN],
    );

    useEffect(
      () => () => {
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      },
      [],
    );

    const handleCycleWidth = () => {
      cycleWidth();
      setIsPreviewVisible(true);
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(
        () => setIsPreviewVisible(false),
        PREVIEW_DURATION,
      );
    };

    const handleToggleCollapsed = () => {
      setIsSliderOpen(false);
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

    const dotSize = ms(DRAWING_WIDTHS[widthIndex] + DESIGN.spacing.xs);

    return (
      <>
        {isPreviewVisible && !isCollapsed && (
          <View
            pointerEvents="none"
            style={[
              styles.preview,
              {
                bottom: barHeight + ms(DESIGN.spacing.sm),
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.previewLine,
                {
                  height: strokeWidth,
                  backgroundColor: color,
                  opacity: tool === "marker" ? MARKER_PREVIEW_OPACITY : 1,
                },
              ]}
            />
          </View>
        )}
        {isSliderOpen && !isCollapsed && (
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
          {isCollapsed ? (
            <>
              <View style={styles.toolRow}>
                {secondaryBtn(
                  handleToggleCollapsed,
                  "drawing-expand",
                  <BibleIcon
                    name="chevron-up"
                    size={ms(DESIGN.spacing.lg)}
                    color={colors.primary}
                  />,
                )}
                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                  onPress={onDone}
                  testID="drawing-done"
                >
                  <BibleText
                    style={[styles.doneText, { color: colors.onPrimary }]}
                  >
                    Concluir
                  </BibleText>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
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
              <View style={styles.toolRow}>
                <View style={styles.toolGroup}>
                  {secondaryBtn(
                    () => setIsSliderOpen((prev) => !prev),
                    "drawing-color",
                    <View
                      style={[styles.colorDot, { backgroundColor: color }]}
                    />,
                  )}
                  {secondaryBtn(
                    handleCycleWidth,
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
                  {secondaryBtn(
                    handleToggleCollapsed,
                    "drawing-collapse",
                    <BibleIcon
                      name="chevron-down"
                      size={ms(DESIGN.spacing.lg)}
                      color={colors.primary}
                    />,
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                  onPress={onDone}
                  testID="drawing-done"
                >
                  <BibleText
                    style={[styles.doneText, { color: colors.onPrimary }]}
                  >
                    Concluir
                  </BibleText>
                </TouchableOpacity>
              </View>
            </>
          )}
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
