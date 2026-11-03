import {
  useFocusEffect,
  useLocalSearchParams,
  usePathname,
  useRouter,
} from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { exportToPDF } from "../utils/export";
import { handleSmartBack } from "../utils/navigation";
import { formatVerseRanges } from "../utils/verseRange";

import { BibleIcon } from "@/components/BibleIcon";
import { BibleActionsDrawer } from "@/components/modals/BibleActionsDrawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BibleHeader } from "../components/BibleHeader";
import { BibleSkeleton } from "../components/BibleSkeleton";
import { ReaderSettingsModal } from "../components/modals/ReaderSettingsModal";
import {
  RichTextEditor,
  RichTextEditorRef,
} from "../components/study/RichTextEditor";
import { LIMITS } from "../constants/limits";
import { STORAGE_KEYS } from "../constants/storage";
import { getBibleData } from "../data/bible-version";
import { ROUTES } from "../constants/routes";
import { useBible } from "../hooks/useBible";
import { useBibleModals } from "../hooks/useBibleModals";
import {
  requestStudyDrawing,
  takeStudyDrawingResult,
} from "../utils/studyDrawingBridge";
import { useResponsive } from "../hooks/useResponsive";
import { canStoreStudyData, useStudies } from "../hooks/useStudies";
import { useTheme } from "../hooks/useTheme";

const DRAWING_INSERT_DELAY = 400;
const STORAGE_FULL_MESSAGE =
  "Sem espaço para este desenho. Remova imagens de estudos antigos.";

const noOutline = Platform.select({
  web: { outline: "none", outlineWidth: 0 } as any,
  default: {},
});

export default function StudyEditorScreen() {
  const { id, readonly, scrollToEnd } = useLocalSearchParams<{
    id: string;
    readonly?: string;
    scrollToEnd?: string;
  }>();
  const isReadonly = readonly === "true";
  const pathname = usePathname();
  const { ms, DESIGN } = useResponsive();
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        titleInput: { flex: 1, fontWeight: "700" },
      }),
    [ms, colors, DESIGN],
  );

  const { getStudy, updateStudy } = useStudies();

  const study = getStudy(id);
  const [title, setTitle] = useState(study?.title || "");
  const [htmlContent, setHtmlContent] = useState(study?.content || "");
  const [showToolbar, setShowToolbar] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);

  const editorRef = useRef<RichTextEditorRef>(null);
  const saveTimeout = useRef<any>(null);
  const hydrated = useRef(false);
  const initialContentRef = useRef<string>("");
  const lastSyncedRef = useRef<string>("");
  const htmlContentRef = useRef<string>("");
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (study && !hydrated.current) {
      setTitle(study.title);
      setHtmlContent(study.content);
      initialContentRef.current = study.content;
      lastSyncedRef.current = study.content;
      hydrated.current = true;
    }
  }, [study]);

  useEffect(() => {
    htmlContentRef.current = htmlContent;
  }, [htmlContent]);

  const storedContent = study?.content;

  useEffect(() => {
    if (!hydrated.current || storedContent === undefined) return;
    const hasLocalEdits = htmlContentRef.current !== lastSyncedRef.current;
    if (storedContent === lastSyncedRef.current || hasLocalEdits) return;
    lastSyncedRef.current = storedContent;
    initialContentRef.current = storedContent;
    setHtmlContent(storedContent);
    setEditorKey((key) => key + 1);
  }, [storedContent]);

  useEffect(() => {
    if (!hydrated.current) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      lastSyncedRef.current = htmlContent;
      updateStudy(id, htmlContent, title);
    }, 1000);
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, [htmlContent, title, id, updateStudy]);

  const [studyPosition, setStudyPosition] = useState<{
    version: string;
    book: string;
    chapter: number;
  }>({
    version: "NAA",
    book: "Gn",
    chapter: 1,
  });

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_STUDY);
        if (stored) {
          setStudyPosition(JSON.parse(stored));
        }
      } catch (e) {}
    })();
  }, []);

  const { openModal } = useBibleModals();

  const router = useRouter();
  const { navigateTo, version: currentVersion } = useBible();

  const openVersePicker = async (
    onSelected: (selection: any) => void = onInsertVerseHtml,
  ) => {
    Keyboard.dismiss();
    editorRef.current?.blur();
    let currentPos = studyPosition;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_STUDY);
      if (stored) {
        currentPos = JSON.parse(stored);
        setStudyPosition(currentPos);
      }
    } catch (e) {}

    const books = getBibleData(currentPos.version);
    const foundBook =
      books.find(
        (b) =>
          b.abbrev.toLowerCase() === currentPos.book.toLowerCase() ||
          b.name.toLowerCase() === currentPos.book.toLowerCase(),
      ) || books[0];

    openModal({
      initialStep: "book",
      target: "study",
      initialVersion: currentPos.version,
      initialBook: foundBook,
      initialChapter: currentPos.chapter,
      onConfirm: async (selection) => {
        const nextPos = {
          version: selection.version || currentPos.version,
          book: selection.book?.abbrev || currentPos.book,
          chapter: selection.chapter || currentPos.chapter,
        };
        setStudyPosition(nextPos);
        try {
          await AsyncStorage.setItem(
            STORAGE_KEYS.CURRENT_STUDY,
            JSON.stringify(nextPos),
          );
        } catch (e) {}

        onSelected(selection);
      },
    });
  };

  const onStartDrawing = (selection: any) => {
    const { verses, book, chapter, version, verseObjects } = selection;
    if (!book || !verses || verses.length === 0) return;
    requestStudyDrawing(
      id,
      {
        version,
        bookAbbrev: book.abbrev,
        bookName: book.name || book.abbrev,
        chapter,
        verses: verseObjects,
      },
      currentVersion,
    );
    navigateTo({
      version,
      book: book.abbrev,
      chapter,
      verse: verseObjects[0].verse,
    });
    router.navigate(ROUTES.BIBLE as any);
  };

  useFocusEffect(
    useCallback(() => {
      const html = takeStudyDrawingResult(id);
      if (!html) return;
      const timer = setTimeout(async () => {
        if (await canStoreStudyData(html.length)) {
          editorRef.current?.insertVerseHtml(html);
        } else {
          Alert.alert("Sem espaço", STORAGE_FULL_MESSAGE);
        }
      }, DRAWING_INSERT_DELAY);
      return () => clearTimeout(timer);
    }, [id]),
  );

  const onInsertVerseHtml = (selection: any) => {
    const { verses, book, chapter, version, verseObjects } = selection;
    if (!book || !verses || verses.length === 0) return;

    const { ranges } = formatVerseRanges(verses);

    const bookDisplayName = book.name || book.abbrev;
    const ref = `${bookDisplayName} ${chapter}:${ranges} (${version.toUpperCase()})`;

    const lines = verseObjects
      .map((v: any) => {
        return `<div class="verse-line"><span class="verse-num">${v.verse}</span> <span class="verse-text">${v.text}</span></div>`;
      })
      .join("");

    const html = `<blockquote class="bible-verse" contenteditable="false"><div class="remove-verse-btn" contenteditable="false">×</div><div class="verse-title">${ref}</div>${lines}</blockquote><p><br></p>`;
    editorRef.current?.insertVerseHtml(html);
  };

  const exportPDF = async () => {
    setMenuVisible(false);
    const study = getStudy(id);
    if (!study) return;
    await exportToPDF(`Estudo: ${study.title}`, htmlContent);
  };

  if (!hydrated.current) {
    return <BibleSkeleton />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <BibleHeader
        showMenu={false}
        showBack={true}
        onBack={() => handleSmartBack(pathname)}
        backgroundColor={colors.primary}
        contentColor={colors.onPrimary}
        leftContent={
          <TextInput
            style={[
              styles.titleInput,
              {
                flex: 1,
                fontSize: ms(DESIGN.fontSize.lg),
                color: colors.onPrimary,
              },
              noOutline,
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Nome do estudo"
            placeholderTextColor={colors.onPrimary + "80"}
            editable={!isReadonly}
            maxLength={LIMITS.STUDY_TITLE_MAX_LENGTH}
            underlineColorAndroid="transparent"
          />
        }
        rightContent={
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: ms(DESIGN.spacing.xs),
            }}
          >
            {!isReadonly && (
              <TouchableOpacity
                style={{
                  width: ms(DESIGN.height.sm),
                  height: ms(DESIGN.height.sm),
                  borderRadius: ms(DESIGN.borderRadius.md),
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={() => {
                  if (showToolbar) Keyboard.dismiss();
                  setShowToolbar(!showToolbar);
                }}
              >
                <BibleIcon
                  name={showToolbar ? "eye" : "edit-2"}
                  size={ms(DESIGN.fontSize.xxl)}
                  color={colors.onPrimary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={{
                width: ms(DESIGN.height.sm),
                height: ms(DESIGN.height.sm),
                borderRadius: ms(DESIGN.borderRadius.md),
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => setMenuVisible(true)}
            >
              <BibleIcon
                name="more-vertical"
                size={ms(DESIGN.fontSize.xxl)}
                color={colors.onPrimary}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <RichTextEditor
          key={editorKey}
          ref={editorRef}
          initialHtml={initialContentRef.current}
          onChange={setHtmlContent}
          onOpenVersePicker={() => openVersePicker()}
          onOpenDrawing={() => openVersePicker(onStartDrawing)}
          shouldScrollToEnd={scrollToEnd === "1"}
          showToolbar={showToolbar}
          readonly={isReadonly}
        />
      </KeyboardAvoidingView>

      <BibleActionsDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        title="Ações"
        items={[
          { icon: "file-text", label: "Exportar em PDF", onPress: exportPDF },
        ]}
      />

      <ReaderSettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
      />
    </View>
  );
}
