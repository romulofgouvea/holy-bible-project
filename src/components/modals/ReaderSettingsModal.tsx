import * as Brightness from "expo-brightness";
import React, { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { ROUTE_LABELS } from "../../constants/routes";
import { useDrawings } from "../../hooks/useDrawings";
import { useReaderSettings } from "../../hooks/useReaderSettings";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { LineSpacing, ReaderFont, ReaderTheme, TextAlign } from "../../models";
import { selectionHaptic } from "../../utils/haptics";
import { BibleDivider } from "../BibleDivider";
import { BibleIcon, BibleIconProps } from "../BibleIcon";
import { BibleSwitch } from "../BibleSwitch";
import { BibleText } from "../BibleText";
import { HorizontalSlider } from "../HorizontalSlider";
import { BiblePageModal } from "./BiblePageModal";

const PREVIEW_TEXT = "No princípio, Deus criou os céus e a terra.";
const DEFAULT_BRIGHTNESS = 0.5;

type SegmentOption<T> = {
  value: T;
  label?: string;
  icon?: BibleIconProps["name"];
  fontFamily?: string;
};

const THEME_OPTIONS: SegmentOption<ReaderTheme>[] = [
  { value: "light", label: "Claro" },
  { value: "sepia", label: "Sépia" },
  { value: "dark", label: "Escuro" },
  { value: "black", label: "Preto" },
];

const FONT_OPTIONS: SegmentOption<ReaderFont>[] = [
  { value: "poppins", label: "Poppins" },
  { value: "lora", label: "Lora", fontFamily: "Lora_400Regular" },
  { value: "monospace", label: "Mono", fontFamily: "monospace" },
];

const ALIGN_OPTIONS: SegmentOption<TextAlign>[] = [
  { value: "left", icon: "align-left" },
  { value: "center", icon: "align-center" },
  { value: "right", icon: "align-right" },
  { value: "justify", icon: "align-justify" },
];

const SPACING_OPTIONS: SegmentOption<LineSpacing>[] = [
  { value: "sm", label: "Compacto" },
  { value: "md", label: "Normal" },
  { value: "lg", label: "Amplo" },
];

export function ReaderSettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { ms, DESIGN } = useResponsive();
  const { colors, toggleDarkMode } = useTheme();
  const {
    fontSizeMultiplier,
    setFontSizeMultiplier,
    textAlign,
    setTextAlign,
    readerTheme,
    setReaderTheme,
    readerFont,
    setReaderFont,
    readerColors,
    lineSpacing,
    setLineSpacing,
    shouldShowTitles,
    setShouldShowTitles,
    shouldShowVerseNumbers,
    setShouldShowVerseNumbers,
    isFocusMode,
    setIsFocusMode,
    readerBrightness,
    setReaderBrightness,
    isKeepAwake,
    setIsKeepAwake,
  } = useReaderSettings();
  const { showDrawings, setShowDrawings } = useDrawings();
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const [previewSize, setPreviewSize] = useState<number | null>(null);
  const [previewBrightness, setPreviewBrightness] = useState<number | null>(
    null,
  );

  const handleSetTheme = useCallback(
    (theme: ReaderTheme) => {
      selectionHaptic();
      setReaderTheme(theme);
      toggleDarkMode(theme === "dark" || theme === "black");
    },
    [setReaderTheme, toggleDarkMode],
  );

  const handleDragChange = useCallback(
    (isDragging: boolean) => setIsScrollEnabled(!isDragging),
    [],
  );

  const handleSizeComplete = useCallback(
    (val: number) => {
      setFontSizeMultiplier(val);
      setPreviewSize(null);
    },
    [setFontSizeMultiplier],
  );

  const handleResetSize = useCallback(() => {
    selectionHaptic();
    setFontSizeMultiplier(1);
  }, [setFontSizeMultiplier]);

  const handleBrightnessComplete = useCallback(
    (val: number) => {
      setReaderBrightness(val);
      setPreviewBrightness(null);
    },
    [setReaderBrightness],
  );

  const handleToggleSystemBrightness = useCallback(
    async (isSystem: boolean) => {
      if (isSystem) {
        setReaderBrightness(null);
        return;
      }
      try {
        setReaderBrightness(await Brightness.getBrightnessAsync());
      } catch (e) {
        setReaderBrightness(DEFAULT_BRIGHTNESS);
      }
    },
    [setReaderBrightness],
  );

  const handleResetAll = () => {
    selectionHaptic();
    handleSetTheme("light");
    setFontSizeMultiplier(1);
    setLineSpacing("md");
    setTextAlign("left");
    setReaderFont("poppins");
    setShouldShowTitles(true);
    setShouldShowVerseNumbers(true);
    setShowDrawings(true);
    setIsFocusMode(false);
    setIsKeepAwake(false);
    setReaderBrightness(null);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          padding: ms(DESIGN.spacing.lg),
          paddingBottom: ms(DESIGN.spacing.giant),
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
        },
        title: {
          flex: 1,
          fontWeight: "700",
        },
        settingsWrapper: {
          gap: ms(DESIGN.spacing.lg),
        },
        preview: {
          padding: ms(DESIGN.spacing.lg),
          borderRadius: ms(DESIGN.borderRadius.lg),
          borderWidth: 1,
        },
        group: {
          gap: ms(DESIGN.spacing.md),
        },
        groupHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.sm),
          paddingTop: ms(DESIGN.spacing.sm),
        },
        groupTitle: {
          fontSize: ms(DESIGN.fontSize.md),
          fontWeight: "800",
        },
        groupLine: {
          flex: 1,
          height: 1,
        },
        section: {
          gap: ms(DESIGN.fontSize.xs),
        },
        sectionHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        sectionTitle: {
          fontSize: ms(DESIGN.fontSize.xs),
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 1,
          opacity: 0.6,
        },
        resetText: {
          fontSize: ms(DESIGN.fontSize.xs),
          fontWeight: "700",
        },
        unifiedRow: {
          flexDirection: "row",
          height: ms(DESIGN.height.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
          overflow: "hidden",
        },
        sliderRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: ms(DESIGN.spacing.md),
          paddingHorizontal: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.md),
        },
        sliderFlex: {
          flex: 1,
        },
        sliderValue: {
          minWidth: ms(DESIGN.spacing.giant),
          textAlign: "right",
          fontSize: ms(DESIGN.fontSize.md),
          fontWeight: "800",
        },
        switchRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: ms(DESIGN.height.md),
          paddingHorizontal: ms(DESIGN.spacing.md),
          borderRadius: ms(DESIGN.borderRadius.md),
        },
        switchLabel: {
          flex: 1,
          fontSize: ms(DESIGN.fontSize.md),
          fontWeight: "700",
        },
        resetAll: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: ms(DESIGN.spacing.sm),
          height: ms(DESIGN.height.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          borderWidth: 1,
        },
        resetAllText: {
          fontSize: ms(DESIGN.fontSize.md),
          fontWeight: "700",
        },
        segmentBtn: {
          flex: 1,
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [ms, DESIGN],
  );

  if (!visible) return null;

  const effectiveSize = previewSize ?? fontSizeMultiplier;
  const previewFontSize = ms(DESIGN.fontSize.xl * effectiveSize);
  const brightnessValue = previewBrightness ?? readerBrightness ?? 0;

  const renderGroupHeader = (title: string) => (
    <View style={styles.groupHeader}>
      <BibleText style={[styles.groupTitle, { color: colors.primary }]}>
        {title}
      </BibleText>
      <View style={[styles.groupLine, { backgroundColor: colors.border }]} />
    </View>
  );

  const renderSegments = <T extends string>(
    options: SegmentOption<T>[],
    selected: T,
    onSelect: (value: T) => void,
  ) => (
    <View
      style={[styles.unifiedRow, { backgroundColor: colors.surfaceHighlight }]}
    >
      {options.map((option, index) => {
        const isSelected = selected === option.value;
        const next = options[index + 1];
        const contentColor = isSelected
          ? colors.onPrimary
          : colors.onBackground;
        return (
          <React.Fragment key={option.value}>
            <TouchableOpacity
              onPress={() => {
                selectionHaptic();
                onSelect(option.value);
              }}
              style={[
                styles.segmentBtn,
                isSelected && { backgroundColor: colors.primary },
              ]}
              testID={`reader-option-${option.value}`}
            >
              {option.icon ? (
                <BibleIcon
                  name={option.icon}
                  size={ms(DESIGN.fontSize.xl)}
                  color={contentColor}
                />
              ) : (
                <BibleText
                  style={{
                    fontSize: ms(DESIGN.fontSize.md),
                    fontWeight: "700",
                    color: contentColor,
                    fontFamily: option.fontFamily,
                  }}
                >
                  {option.label}
                </BibleText>
              )}
            </TouchableOpacity>
            {next && !isSelected && selected !== next.value && (
              <BibleDivider vertical height="60%" color={colors.border} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );

  const renderSwitch = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
  ) => (
    <View
      style={[styles.switchRow, { backgroundColor: colors.surfaceHighlight }]}
    >
      <BibleText style={[styles.switchLabel, { color: colors.onBackground }]}>
        {label}
      </BibleText>
      <BibleSwitch value={value} onValueChange={onValueChange} label={label} />
    </View>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <BibleText style={[styles.sectionTitle, { color: colors.textMuted }]}>
        {title}
      </BibleText>
      {children}
    </View>
  );

  return (
    <BiblePageModal
      visible={visible}
      onClose={onClose}
      header={
        <>
          <View style={styles.header}>
            <BibleIcon
              name="type"
              size={ms(DESIGN.spacing.lg)}
              color={colors.primary}
              backgroundColor={colors.primary + "25"}
              style={{ marginRight: ms(DESIGN.spacing.sm) }}
            />
            <BibleText
              style={[
                styles.title,
                { fontSize: ms(DESIGN.spacing.lg), color: colors.primary },
              ]}
            >
              {ROUTE_LABELS.APPEARANCE}
            </BibleText>
            <BibleIcon
              name="x"
              color={colors.error}
              backgroundColor={colors.error + "20"}
              onPress={onClose}
            />
          </View>
        </>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        scrollEnabled={isScrollEnabled}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.settingsWrapper}>
          <View
            style={[
              styles.preview,
              {
                backgroundColor: readerColors.background,
                borderColor: colors.border,
              },
            ]}
            testID="reader-preview"
          >
            <BibleText
              variant="reading"
              style={{
                fontSize: previewFontSize,
                lineHeight: previewFontSize * DESIGN.lineHeight[lineSpacing],
                color: readerColors.onBackground,
                textAlign,
              }}
            >
              {shouldShowVerseNumbers && (
                <BibleText
                  style={{
                    fontSize: previewFontSize * 0.6,
                    fontWeight: "700",
                    color: readerColors.primary,
                  }}
                >
                  1{"  "}
                </BibleText>
              )}
              {PREVIEW_TEXT}
            </BibleText>
          </View>

          <View style={styles.group}>
            {renderGroupHeader("Texto")}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <BibleText
                  style={[styles.sectionTitle, { color: colors.textMuted }]}
                >
                  Tamanho da Fonte
                </BibleText>
                {Math.abs(fontSizeMultiplier - 1) > 0.001 && (
                  <TouchableOpacity
                    onPress={handleResetSize}
                    testID="reader-size-reset"
                  >
                    <BibleText
                      style={[styles.resetText, { color: colors.primary }]}
                    >
                      Restaurar padrão
                    </BibleText>
                  </TouchableOpacity>
                )}
              </View>
              <View
                style={[
                  styles.sliderRow,
                  { backgroundColor: colors.surfaceHighlight },
                ]}
              >
                <View style={styles.sliderFlex}>
                  <HorizontalSlider
                    value={fontSizeMultiplier}
                    min={0.7}
                    max={2}
                    step={0.05}
                    onPreview={setPreviewSize}
                    onComplete={handleSizeComplete}
                    onDragChange={handleDragChange}
                    markValue={1}
                    label="Tamanho da fonte"
                    testID="reader-size-slider"
                  />
                </View>
                <BibleText
                  style={[styles.sliderValue, { color: colors.onBackground }]}
                >
                  {Math.round(effectiveSize * 100)}%
                </BibleText>
              </View>
            </View>
            {renderSection(
              "Espaçamento entre Linhas",
              renderSegments(SPACING_OPTIONS, lineSpacing, setLineSpacing),
            )}
            {renderSection(
              "Alinhamento",
              renderSegments(ALIGN_OPTIONS, textAlign, setTextAlign),
            )}
            {renderSection(
              "Tipo de Fonte",
              renderSegments(FONT_OPTIONS, readerFont, setReaderFont),
            )}
          </View>

          <View style={styles.group}>
            {renderGroupHeader("Cores")}
            {renderSection(
              "Tema de Leitura",
              renderSegments(THEME_OPTIONS, readerTheme, handleSetTheme),
            )}
          </View>

          <View style={styles.group}>
            {renderGroupHeader("Exibição")}
            {renderSwitch(
              "Títulos dos textos",
              shouldShowTitles,
              setShouldShowTitles,
            )}
            {renderSwitch(
              "Números dos versículos",
              shouldShowVerseNumbers,
              setShouldShowVerseNumbers,
            )}
            {renderSwitch("Desenhos", showDrawings, setShowDrawings)}
            {renderSwitch("Modo sem distração", isFocusMode, setIsFocusMode)}
          </View>

          <View style={styles.group}>
            {renderGroupHeader("Tela")}
            {renderSwitch("Manter a tela acesa", isKeepAwake, setIsKeepAwake)}
            {renderSwitch(
              "Brilho do sistema",
              readerBrightness === null,
              handleToggleSystemBrightness,
            )}
            {readerBrightness !== null && (
              <View
                style={[
                  styles.sliderRow,
                  { backgroundColor: colors.surfaceHighlight },
                ]}
              >
                <BibleIcon
                  name="sun"
                  size={ms(DESIGN.fontSize.xl)}
                  color={colors.primary}
                />
                <View style={styles.sliderFlex}>
                  <HorizontalSlider
                    value={readerBrightness}
                    min={0.05}
                    max={1}
                    step={0.05}
                    onPreview={setPreviewBrightness}
                    onComplete={handleBrightnessComplete}
                    onDragChange={handleDragChange}
                    label="Brilho"
                    testID="reader-brightness-slider"
                  />
                </View>
                <BibleText
                  style={[styles.sliderValue, { color: colors.onBackground }]}
                >
                  {Math.round(brightnessValue * 100)}%
                </BibleText>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={handleResetAll}
            style={[styles.resetAll, { borderColor: colors.border }]}
            accessibilityRole="button"
            testID="reader-reset-all"
          >
            <BibleIcon
              name="rotate-ccw"
              size={ms(DESIGN.fontSize.lg)}
              color={colors.primary}
            />
            <BibleText style={[styles.resetAllText, { color: colors.primary }]}>
              Restaurar tudo
            </BibleText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BiblePageModal>
  );
}
