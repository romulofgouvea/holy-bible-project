import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleSheet,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { useDrawings } from "../hooks/useDrawings";
import { useReaderSettings } from "../hooks/useReaderSettings";
import { useResponsive } from "../hooks/useResponsive";
import { useTheme } from "../hooks/useTheme";
import { getVerseDrawingKey } from "../utils/drawing";
import { saveStudyImage } from "../utils/studyImages";
import { ViewHandle } from "../utils/drawingRegistry";
import { escapeHtml } from "../utils/sanitize";
import { StudyDrawingSelection } from "../utils/studyDrawingBridge";
import { BibleText } from "./BibleText";
import { VerseDrawingLayer } from "./VerseDrawingLayer";

const CAPTURE_WIDTH = 640;
const CAPTURE_QUALITY = 0.8;
const OFFSCREEN_OFFSET = -10000;
const SETTLE_FRAMES = 2;

type Props = {
  selection: StudyDrawingSelection;
  onDone: (html: string | null) => void;
};

const waitFrames = async (count: number) => {
  for (let i = 0; i < count; i++) {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  }
};

export const StudyDrawingCapture = ({ selection, onDone }: Props) => {
  const { ms, width, DESIGN } = useResponsive();
  const { colors } = useTheme();
  const {
    fontSizeMultiplier,
    textAlign,
    readerColors,
    shouldShowVerseNumbers,
  } = useReaderSettings();
  const { drawings } = useDrawings();
  const captureViewRef = useRef<ViewHandle>(null);
  const drawingsRef = useRef(drawings);
  const onDoneRef = useRef(onDone);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    drawingsRef.current = drawings;
    onDoneRef.current = onDone;
  }, [drawings, onDone]);

  const { version, bookAbbrev, bookName, chapter, verses } = selection;
  const first = verses[0].verse;
  const last = verses[verses.length - 1].verse;
  const reference = `${bookName} ${chapter}:${first === last ? first : `${first}-${last}`} (${version.toUpperCase()})`;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    setSize({ width: w, height: h });
  };

  useEffect(() => {
    if (size.width === 0) return;
    let isCancelled = false;
    (async () => {
      await waitFrames(SETTLE_FRAMES);
      const hasDrawing = verses.some(
        (v) =>
          (drawingsRef.current[
            getVerseDrawingKey(version, bookAbbrev, chapter, v.verse)
          ]?.strokes.length ?? 0) > 0,
      );
      let html: string | null = null;
      if (hasDrawing && captureViewRef.current) {
        try {
          const temporaryUri = await captureRef(captureViewRef, {
            format: "jpg",
            quality: CAPTURE_QUALITY,
            result: "tmpfile",
            width: CAPTURE_WIDTH,
            height: Math.round((CAPTURE_WIDTH * size.height) / size.width),
          });
          const imageUri = await saveStudyImage(temporaryUri);
          html = `<blockquote class="bible-verse" contenteditable="false"><div class="remove-verse-btn" contenteditable="false">×</div><img src="${imageUri}" alt="${escapeHtml(reference)}" /></blockquote><p><br></p>`;
        } catch {
          html = null;
        }
      }
      if (!isCancelled) onDoneRef.current(html);
    })();
    return () => {
      isCancelled = true;
    };
  }, [size, verses, version, bookAbbrev, chapter, reference]);

  return (
    <>
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: OFFSCREEN_OFFSET, width }}
      >
        <View
          ref={captureViewRef}
          collapsable={false}
          onLayout={onLayout}
          style={{
            backgroundColor: readerColors.background,
            paddingVertical: ms(DESIGN.spacing.md),
          }}
        >
          <BibleText
            style={{
              paddingHorizontal: ms(DESIGN.spacing.lg),
              paddingBottom: ms(DESIGN.spacing.sm),
              fontSize: ms(DESIGN.fontSize.md * fontSizeMultiplier),
              fontWeight: "800",
              color: colors.primary,
            }}
          >
            {reference}
          </BibleText>
          {verses.map((v) => (
            <View
              key={v.verse}
              style={{
                paddingVertical: ms(DESIGN.spacing.md),
                paddingHorizontal: ms(DESIGN.spacing.lg),
                borderLeftWidth: ms(DESIGN.spacing.xs),
                borderLeftColor: "transparent",
              }}
            >
              <VerseDrawingLayer
                placement="behind"
                forceVisible
                shouldRegister={false}
                version={version}
                bookAbbrev={bookAbbrev}
                bookName={bookName}
                chapter={chapter}
                verse={v.verse}
              />
              <BibleText
                variant="reading"
                style={{
                  flexWrap: "wrap",
                  fontSize: ms(DESIGN.fontSize.xxl * fontSizeMultiplier),
                  lineHeight: ms(
                    DESIGN.fontSize.xxl *
                      fontSizeMultiplier *
                      DESIGN.lineHeight.md,
                  ),
                  color: readerColors.onBackground,
                  textAlign,
                }}
              >
                {shouldShowVerseNumbers && (
                  <BibleText
                    style={{
                      color: colors.primary,
                      fontWeight: "700",
                      fontSize: ms(DESIGN.fontSize.lg * fontSizeMultiplier),
                    }}
                  >
                    {v.verse}
                  </BibleText>
                )}
                {shouldShowVerseNumbers ? " " : ""}
                {v.text}
              </BibleText>
              <VerseDrawingLayer
                forceVisible
                shouldRegister={false}
                version={version}
                bookAbbrev={bookAbbrev}
                bookName={bookName}
                chapter={chapter}
                verse={v.verse}
              />
            </View>
          ))}
        </View>
      </View>
      <View
        style={{
          ...StyleSheet.absoluteFill,
          alignItems: "center",
          justifyContent: "center",
          gap: ms(DESIGN.spacing.md),
          backgroundColor: colors.background + "E6",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <BibleText
          style={{
            fontSize: ms(DESIGN.fontSize.md),
            fontWeight: "700",
            color: colors.primary,
          }}
        >
          Salvando desenho no estudo...
        </BibleText>
      </View>
    </>
  );
};
