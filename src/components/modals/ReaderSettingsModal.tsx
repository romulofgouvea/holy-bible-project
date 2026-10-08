import React, { useMemo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { ROUTE_LABELS } from "../../constants/routes";
import { useReaderSettings } from "../../hooks/useReaderSettings";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { selectionHaptic } from "../../utils/haptics";
import { BibleDivider } from "../BibleDivider";
import { BibleIcon } from "../BibleIcon";
import { BibleText } from "../BibleText";
import { BiblePageModal } from "./BiblePageModal";

export function ReaderSettingsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { ms, DESIGN } = useResponsive();
  const { colors, toggleDarkMode, isDarkMode } = useTheme();
  const {
    fontSizeMultiplier,
    setFontSizeMultiplier,
    textAlign,
    setTextAlign,
    readerTheme,
    setReaderTheme,
    readerFont,
    setReaderFont,
    shouldShowTitles,
    setShouldShowTitles,
    shouldShowVerseNumbers,
    setShouldShowVerseNumbers,
  } = useReaderSettings();

  const handleSetTheme = (theme: "light" | "dark" | "sepia") => {
    selectionHaptic();
    setReaderTheme(theme);
    toggleDarkMode(theme === "dark");
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          padding: ms(DESIGN.spacing.lg),
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
        section: {
          gap: ms(DESIGN.fontSize.xs),
        },
        sectionTitle: {
          fontSize: ms(DESIGN.fontSize.xs),
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: 1,
          opacity: 0.6,
        },
        unifiedRow: {
          flexDirection: "row",
          height: ms(DESIGN.height.md),
          borderRadius: ms(DESIGN.borderRadius.md),
          alignItems: "center",
          overflow: "hidden",
        },
        controlBtn: {
          width: ms(DESIGN.spacing.giant),
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        },
        controlText: {
          fontSize: ms(DESIGN.fontSize.lg),
          fontWeight: "700",
        },
        percentageDisplay: {
          flex: 1,
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          borderLeftWidth: 1,
          borderRightWidth: 1,
        },
        percentageText: {
          fontSize: ms(DESIGN.fontSize.lg),
          fontWeight: "800",
        },
        segmentBtn: {
          flex: 1,
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        },
      }),
    [ms, colors, DESIGN],
  );

  if (!visible) return null;

  const dividerColor = "rgba(0,0,0,0.05)";

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
      <View style={styles.content}>
        <View style={styles.settingsWrapper}>
          {/* Theme Section */}
          <View style={styles.section}>
            <BibleText
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              Tema de Leitura
            </BibleText>
            <View
              style={[
                styles.unifiedRow,
                { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              {(["light", "sepia", "dark"] as const).map((t, index) => (
                <React.Fragment key={t}>
                  <TouchableOpacity
                    onPress={() => handleSetTheme(t)}
                    style={[
                      styles.segmentBtn,
                      readerTheme === t && { backgroundColor: colors.primary },
                    ]}
                  >
                    <BibleText
                      style={{
                        fontSize: ms(DESIGN.fontSize.md),
                        fontWeight: "700",
                        color:
                          readerTheme === t
                            ? colors.onPrimary
                            : colors.onBackground,
                      }}
                    >
                      {t === "light"
                        ? "Claro"
                        : t === "dark"
                          ? "Escuro"
                          : "Sépia"}
                    </BibleText>
                  </TouchableOpacity>
                  {index < 2 &&
                    readerTheme !== t &&
                    (["light", "sepia", "dark"] as const)[index + 1] !==
                      readerTheme && (
                      <BibleDivider
                        vertical
                        height="60%"
                        color={dividerColor}
                      />
                    )}
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* Font Size Section */}
          <View style={styles.section}>
            <BibleText
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              Tamanho da Fonte
            </BibleText>
            <View
              style={[
                styles.unifiedRow,
                { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              <TouchableOpacity
                onPress={() => {
                  selectionHaptic();
                  setFontSizeMultiplier(
                    Math.max(0.7, fontSizeMultiplier - 0.1),
                  );
                }}
                style={styles.controlBtn}
              >
                <BibleText
                  style={[styles.controlText, { color: colors.primary }]}
                >
                  A-
                </BibleText>
              </TouchableOpacity>
              <View
                style={[
                  styles.percentageDisplay,
                  { borderColor: dividerColor },
                ]}
              >
                <BibleText
                  style={[
                    styles.percentageText,
                    { color: colors.onBackground },
                  ]}
                >
                  {Math.round(fontSizeMultiplier * 100)}%
                </BibleText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  selectionHaptic();
                  setFontSizeMultiplier(
                    Math.min(2.0, fontSizeMultiplier + 0.1),
                  );
                }}
                style={styles.controlBtn}
              >
                <BibleText
                  style={[styles.controlText, { color: colors.primary }]}
                >
                  A+
                </BibleText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Text Alignment Section */}
          <View style={styles.section}>
            <BibleText
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              Alinhamento
            </BibleText>
            <View
              style={[
                styles.unifiedRow,
                { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              {(["left", "center", "right", "justify"] as const).map(
                (a, index) => (
                  <React.Fragment key={a}>
                    <TouchableOpacity
                      onPress={() => {
                        selectionHaptic();
                        setTextAlign(a);
                      }}
                      style={[
                        styles.segmentBtn,
                        textAlign === a && { backgroundColor: colors.primary },
                      ]}
                    >
                      <BibleIcon
                        name={
                          a === "left"
                            ? "align-left"
                            : a === "center"
                              ? "align-center"
                              : a === "right"
                                ? "align-right"
                                : "align-justify"
                        }
                        size={ms(DESIGN.fontSize.xl)}
                        color={
                          textAlign === a
                            ? colors.onPrimary
                            : colors.onBackground
                        }
                      />
                    </TouchableOpacity>
                    {index < 3 &&
                      textAlign !== a &&
                      (["left", "center", "right", "justify"] as const)[
                        index + 1
                      ] !== textAlign && (
                        <BibleDivider
                          vertical
                          height="60%"
                          color={dividerColor}
                        />
                      )}
                  </React.Fragment>
                ),
              )}
            </View>
          </View>

          <View style={styles.section}>
            <BibleText
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              Tipo de Fonte
            </BibleText>
            <View
              style={[
                styles.unifiedRow,
                { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              {(["poppins", "monospace"] as const).map((f, index) => (
                <React.Fragment key={f}>
                  <TouchableOpacity
                    onPress={() => {
                      selectionHaptic();
                      setReaderFont(f);
                    }}
                    style={[
                      styles.segmentBtn,
                      readerFont === f && { backgroundColor: colors.primary },
                    ]}
                  >
                    <BibleText
                      style={{
                        fontSize: ms(DESIGN.fontSize.md),
                        fontWeight: "700",
                        color:
                          readerFont === f
                            ? colors.onPrimary
                            : colors.onBackground,
                        fontFamily: f === "monospace" ? "monospace" : undefined,
                      }}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </BibleText>
                  </TouchableOpacity>
                  {index < 1 &&
                    readerFont !== f &&
                    (["poppins", "monospace"] as const)[index + 1] !==
                      readerFont && (
                      <BibleDivider
                        vertical
                        height="60%"
                        color={dividerColor}
                      />
                    )}
                </React.Fragment>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <BibleText
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              Títulos dos Textos
            </BibleText>
            <View
              style={[
                styles.unifiedRow,
                { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              {[
                { label: "Ocultar", value: false },
                { label: "Exibir", value: true },
              ].map((item, index) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    onPress={() => {
                      selectionHaptic();
                      setShouldShowTitles(item.value);
                    }}
                    style={[
                      styles.segmentBtn,
                      shouldShowTitles === item.value && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <BibleText
                      style={{
                        fontSize: ms(DESIGN.fontSize.md),
                        fontWeight: "700",
                        color:
                          shouldShowTitles === item.value
                            ? colors.onPrimary
                            : colors.onBackground,
                      }}
                    >
                      {item.label}
                    </BibleText>
                  </TouchableOpacity>
                  {index === 0 && (
                    <BibleDivider vertical height="60%" color={dividerColor} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <BibleText
              style={[styles.sectionTitle, { color: colors.textMuted }]}
            >
              Números dos Versículos
            </BibleText>
            <View
              style={[
                styles.unifiedRow,
                { backgroundColor: colors.surfaceHighlight },
              ]}
            >
              {[
                { label: "Ocultar", value: false },
                { label: "Exibir", value: true },
              ].map((item, index) => (
                <React.Fragment key={item.label}>
                  <TouchableOpacity
                    onPress={() => {
                      selectionHaptic();
                      setShouldShowVerseNumbers(item.value);
                    }}
                    style={[
                      styles.segmentBtn,
                      shouldShowVerseNumbers === item.value && {
                        backgroundColor: colors.primary,
                      },
                    ]}
                  >
                    <BibleText
                      style={{
                        fontSize: ms(DESIGN.fontSize.md),
                        fontWeight: "700",
                        color:
                          shouldShowVerseNumbers === item.value
                            ? colors.onPrimary
                            : colors.onBackground,
                      }}
                    >
                      {item.label}
                    </BibleText>
                  </TouchableOpacity>
                  {index === 0 && (
                    <BibleDivider vertical height="60%" color={dividerColor} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>
      </View>
    </BiblePageModal>
  );
}
