import React, { useEffect, useMemo, useState } from "react";
import { Keyboard, TextInput, TouchableOpacity, View } from "react-native";
import { useNotes } from "../../hooks/useNotes";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { SelectedVerse } from "../../models";
import { formatVerseRanges } from "../../utils/verseRange";
import { BibleIcon } from "../BibleIcon";
import { BibleText } from "../BibleText";
import { BiblePageModal } from "./BiblePageModal";

type BibleNoteModalProps = {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  selectedVerses: SelectedVerse[];
  onShowToast?: (msg: string, type?: "success" | "info" | "warning") => void;
};

export function BibleNoteModal({
  visible,
  onClose,
  onDismiss,
  selectedVerses,
  onShowToast,
}: BibleNoteModalProps) {
  const handleDismiss = onDismiss ?? onClose;
  const { notes, notesMap, saveNote } = useNotes();
  const { colors } = useTheme();
  const { ms, DESIGN } = useResponsive();
  const [text, setText] = useState("");

  const verse = selectedVerses[0];
  const count = selectedVerses.length;

  useEffect(() => {
    if (visible && verse) {
      // Find note by checking the notesMap for any of the selected verses
      let existingNoteText = "";
      for (const v of selectedVerses) {
        const key = `${v.bookAbbrev}-${v.chapter}-${v.verse}`;
        if (notesMap[key]) {
          existingNoteText = notesMap[key].text;
          break;
        }
      }
      setText(existingNoteText);
    }
  }, [visible, verse, selectedVerses, notesMap]);

  const headerLabel = useMemo(() => {
    if (!verse || selectedVerses.length === 0) return "";
    const sorted = [...selectedVerses].sort((a, b) =>
      a.chapter !== b.chapter ? a.chapter - b.chapter : a.verse - b.verse,
    );
    const { ranges, sameChapter } = formatVerseRanges(sorted);
    return sameChapter
      ? `${sorted[0].bookName} ${sorted[0].chapter}:${ranges}`
      : `${sorted[0].bookName} ${ranges}`;
  }, [verse, selectedVerses]);

  if (!verse) return null;

  const handleSave = () => {
    Keyboard.dismiss();
    const versesToSave = selectedVerses.map(({ text: _t, ...rest }) => rest);
    saveNote(versesToSave, text);
    onShowToast?.(
      text.trim() ? "Comentário salvo" : "Comentário removido",
      "success",
    );
    onClose();
  };

  return (
    <BiblePageModal
      visible={visible}
      onClose={handleDismiss}
      fullHeight={true}
      header={
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: ms(DESIGN.spacing.sm),
            }}
          >
            <BibleIcon
              name="message-square"
              color={colors.primary}
              backgroundColor={colors.primary + "15"}
            />
            <View style={{ flexShrink: 1 }}>
              <BibleText
                style={{
                  fontWeight: "700",
                  color: colors.onSurface,
                  fontSize: ms(DESIGN.fontSize.lg),
                }}
              >
                Comentário
              </BibleText>
              <BibleText
                numberOfLines={1}
                style={{
                  color: colors.textMuted,
                  fontSize: ms(DESIGN.fontSize.md),
                }}
              >
                {headerLabel}
              </BibleText>
            </View>
          </View>
          <BibleIcon
            name="x"
            color={colors.error}
            backgroundColor={colors.error + "20"}
            onPress={handleDismiss}
          />
        </View>
      }
      footer={
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.7}
          style={{
            backgroundColor: colors.primary,
            padding: ms(DESIGN.spacing.md),
            borderRadius: ms(DESIGN.borderRadius.md),
            alignItems: "center",
          }}
        >
          <BibleText style={{ color: colors.onPrimary, fontWeight: "700" }}>
            Salvar Comentário
          </BibleText>
        </TouchableOpacity>
      }
    >
      <View style={{ flex: 1, padding: ms(DESIGN.spacing.lg) }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surfaceHighlight,
            borderRadius: ms(DESIGN.borderRadius.lg),
            borderWidth: 1,
            borderColor: colors.border,
            padding: ms(DESIGN.spacing.lg),
          }}
        >
          <TextInput
            style={{
              flex: 1,
              color: colors.onBackground,
              fontSize: ms(DESIGN.fontSize.md),
              textAlignVertical: "top",
              outlineStyle: "none" as any,
            }}
            placeholder="Escreva seu comentário aqui..."
            placeholderTextColor={colors.textMuted}
            multiline
            value={text}
            onChangeText={setText}
            autoFocus={false}
          />
        </View>
      </View>
    </BiblePageModal>
  );
}
