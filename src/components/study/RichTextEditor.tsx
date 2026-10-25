import {
  COLOR_THEMES,
  COMMON_COLORS,
  getSupportColors,
  VERSE_HIGHLIGHTS,
} from "@/constants/colors";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useReaderSettings } from "../../hooks/useReaderSettings";
import { useResponsive } from "../../hooks/useResponsive";
import { useTheme } from "../../hooks/useTheme";
import { impactLight, selectionHaptic } from "../../utils/haptics";
import { sanitizeHtml } from "../../utils/sanitize";
import { BibleDivider } from "../BibleDivider";
import { BibleIcon } from "../BibleIcon";
import { BibleText } from "../BibleText";

type EditorCommand = {
  name:
    | "execCmd"
    | "changeFontSize"
    | "insertHtml"
    | "toggleTaskList"
    | "blur"
    | "applyTheme"
    | "setSpellcheck";
  args: (string | number | null)[];
};

export type RichTextEditorRef = {
  insertVerseHtml: (html: string) => void;
  blur: () => void;
};

type Props = {
  initialHtml: string;
  onChange: (html: string) => void;
  onOpenVersePicker: () => void;
  showToolbar?: boolean;
  readonly?: boolean;
};

export const RichTextEditor = React.forwardRef<RichTextEditorRef, Props>(
  (
    {
      initialHtml,
      onChange,
      onOpenVersePicker,
      showToolbar = true,
      readonly = false,
    },
    ref,
  ) => {
    const webViewRef = useRef<WebView>(null);
    const webIframeRef = useRef<any>(null);
    const { colors: themeColors, colorTheme, isDarkMode, colors } = useTheme();
    const { ms, DESIGN } = useResponsive();
    const {
      readerColors,
      readerTheme,
      readerFontFamily,
      isSpellcheckEnabled,
      setIsSpellcheckEnabled,
    } = useReaderSettings();
    const initialSpellcheckRef = useRef(isSpellcheckEnabled);

    const styles = useMemo(
      () =>
        StyleSheet.create({
          toolbar: {
            flexDirection: "row",
            height: ms(DESIGN.height.lg),
            borderBottomWidth: 1,
            zIndex: 5,
            // Soft shadow for premium feel
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
          },
          rowGroup: {
            flexDirection: "row",
            borderRadius: ms(DESIGN.borderRadius.md),
            overflow: "hidden",
            borderWidth: 1,
            marginVertical: ms(DESIGN.spacing.sm),
          },
          groupBtn: {
            flexDirection: "row",
            paddingHorizontal: ms(DESIGN.spacing.md),
            height: ms(DESIGN.height.sm),
            alignItems: "center",
            justifyContent: "center",
          },
        }),
      [ms, colors, DESIGN],
    );

    const editorColors = useMemo(() => {
      if (readerTheme === "sepia") {
        const active =
          Object.entries(COLOR_THEMES)
            .map(([key, value]) => ({ key, ...value }))
            .find((t) => t.key === colorTheme) ?? COLOR_THEMES.teal;
        return {
          ...active.light,
          ...getSupportColors(active.light, false),
          ...COMMON_COLORS,
        };
      }
      return themeColors;
    }, [readerTheme, themeColors, colorTheme]);

    const [formatState, setFormatState] = useState<{
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      justifyLeft?: boolean;
      justifyCenter?: boolean;
      justifyRight?: boolean;
      justifyFull?: boolean;
      insertUnorderedList?: boolean;
      insertOrderedList?: boolean;
      isTaskList?: boolean;
      hiliteColor?: string;
      fontSize?: string;
    }>({});

    const execDocumentCmd = (cmd: string, value?: string) => {
      selectionHaptic();
      injectToEditor({ name: "execCmd", args: [cmd, value ?? null] });
    };

    const changeFontSize = (delta: number) => {
      impactLight();
      injectToEditor({ name: "changeFontSize", args: [delta] });
    };

    const toggleSpellcheck = () => {
      selectionHaptic();
      setIsSpellcheckEnabled(!isSpellcheckEnabled);
    };

    const applyHighlight = (color: string) => {
      selectionHaptic();
      execDocumentCmd("hiliteColor", color);
    };

    const injectToEditor = (command: EditorCommand) => {
      if (Platform.OS === "web") {
        webIframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ type: "command", command }),
          "*",
        );
      } else {
        webViewRef.current?.injectJavaScript(
          `window.runEditorCommand(${JSON.stringify(command)}); true;`,
        );
      }
    };

    React.useImperativeHandle(ref, () => ({
      insertVerseHtml: (html: string) => {
        injectToEditor({ name: "insertHtml", args: [sanitizeHtml(html)] });
      },
      blur: () => {
        injectToEditor({ name: "blur", args: [] });
      },
    }));

    useEffect(() => {
      if (!webViewRef.current && Platform.OS !== "web") return;
      injectToEditor({
        name: "applyTheme",
        args: [
          editorColors.background,
          readerColors.onBackground || editorColors.onBackground,
          readerFontFamily === "Poppins_400Regular"
            ? "'Poppins_400Regular', sans-serif"
            : readerFontFamily,
        ],
      });
    }, [readerColors, editorColors, readerFontFamily]);

    useEffect(() => {
      if (!webViewRef.current && Platform.OS !== "web") return;
      injectToEditor({
        name: "setSpellcheck",
        args: [isSpellcheckEnabled ? 1 : 0],
      });
    }, [isSpellcheckEnabled]);

    const onMessage = (event: any) => {
      if (
        Platform.OS === "web" &&
        event.source !== webIframeRef.current?.contentWindow
      )
        return;
      try {
        const { type, data } = JSON.parse(
          event.nativeEvent ? event.nativeEvent.data : event.data,
        );
        if (type === "contentChanged") {
          onChange(data);
        } else if (type === "formatState") {
          setFormatState(data);
        }
      } catch (e) {}
    };

    useEffect(() => {
      if (Platform.OS === "web") {
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
      }
    }, [onChange]);

    const editorHtml = useMemo(
      () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        html, body {
          margin: 0; padding: 0; 
          height: 100%;
          background-color: ${editorColors.surface};
          font-family: -apple-system, sans-serif;
        }
        #editor {
          min-height: 100%;
          padding: ${ms(DESIGN.spacing.lg)}px;
          padding-bottom: ${ms(DESIGN.layout.listPaddingBottom + DESIGN.spacing.xl)}px;
          outline: none;
          font-size: ${ms(DESIGN.fontSize.lg)}px;
          line-height: 1.6;
          color: ${readerColors.onBackground || editorColors.onBackground};
          background-color: ${editorColors.background};
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
        }
        font[size="1"] { font-size: 11px; line-height: 1.4; }
        font[size="2"] { font-size: 13px; line-height: 1.5; }
        font[size="3"] { font-size: 16px; line-height: 1.6; }
        font[size="4"] { font-size: 24px; line-height: 1.6; }
        font[size="5"] { font-size: 32px; line-height: 1.6; }
        font[size="6"] { font-size: 48px; line-height: 1.6; }
        font[size="7"] { font-size: 64px; line-height: 1.6; }
        ::selection {
          background-color: ${editorColors.primary};
        }
        [contenteditable="true"]:empty:before {
          content: attr(placeholder);
          color: ${editorColors.textMuted};
          pointer-events: none;
          display: block;
        }
        .bible-verse {
          position: relative;
          margin: ${ms(DESIGN.spacing.lg)}px 0;
          padding: ${ms(DESIGN.spacing.md)}px 16px;
          background-color: ${editorColors.primary}15;
          border-left: ${ms(DESIGN.spacing.xs)}px solid ${editorColors.primary};
          border-radius: 8px;
          overflow-wrap: break-word;
          word-wrap: break-word;
          word-break: break-word;
          user-select: text;
          cursor: default;
        }
        .remove-verse-btn {
          position: absolute;
          top: 0;
          right: 0;
          width: ${ms(DESIGN.height.md)}px;
          height: ${ms(DESIGN.height.md)}px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${editorColors.primary};
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
          user-select: none;
          z-index: 100;
          opacity: 0.5;
        }
        .bible-verse b, .bible-verse .verse-title {
          color: ${editorColors.primary};
          display: block;
          margin-bottom: ${ms(DESIGN.spacing.sm)}px;
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .bible-verse p {
          margin: 0;
          color: ${editorColors.onSurface};
          font-style: italic;
        }
        ul, ol { padding-left: ${ms(DESIGN.spacing.xl)}px; margin-top: ${ms(DESIGN.spacing.sm)}px; margin-bottom: ${ms(DESIGN.spacing.sm)}px; }
        li { margin-bottom: ${ms(DESIGN.spacing.xs)}px; }
        ul.task-list { list-style: none; padding-left: ${ms(DESIGN.spacing.xl + DESIGN.spacing.xs)}px; }
        ul.task-list li { position: relative; margin-bottom: ${ms(DESIGN.spacing.sm)}px; }
        ul.task-list li::before {
          content: ''; position: absolute; left: -26px; top: ${ms(DESIGN.spacing.xs)}px; width: ${ms(DESIGN.fontSize.xl)}px; height: ${ms(DESIGN.fontSize.xl)}px;
          border: 2px solid ${editorColors.primary}; border-radius: 4px; background-color: transparent; cursor: pointer; box-sizing: border-box;
        }
        ul.task-list li[data-checked="true"]::before {
          background-color: ${editorColors.primary};
          background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>');
          background-size: 12px; background-repeat: no-repeat; background-position: center;
        }
        ul.task-list li[data-checked="true"] { text-decoration: line-through; opacity: 0.6; }
        .verse-line { margin-bottom: ${ms(DESIGN.fontSize.xs)}px; display: flex; gap: ${ms(DESIGN.spacing.sm)}px; align-items: flex-start; }
        .verse-num { font-weight: 800; color: ${editorColors.primary}; font-size: 12px; margin-top: ${ms(DESIGN.spacing.tiny)}px; min-width: ${ms(DESIGN.spacing.xl)}px; text-align: right; flex-shrink: 0; white-space: nowrap; }
        .verse-text { font-style: italic; color: ${editorColors.onSurface}; flex: 1; }
        ${readonly ? ".remove-verse-btn { display: none !important; }" : ""}
      </style>
    </head>
    <body onclick="document.getElementById('editor').focus();">
      <div id="editor" lang="pt-BR" spellcheck="${initialSpellcheckRef.current ? "true" : "false"}" autocorrect="${initialSpellcheckRef.current ? "on" : "off"}" contenteditable="${readonly ? "false" : "true"}" placeholder="Comece a escrever seu estudo aqui...">${sanitizeHtml(initialHtml)}</div>
      <script>
        const editor = document.getElementById('editor');
        let debounceTimer;
        let savedRange = null;

        function saveSelection() {
          let sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            let range = sel.getRangeAt(0);
            if (editor.contains(range.commonAncestorContainer)) {
              savedRange = range;
            }
          }
        }

        window.restoreSelection = function() {
          if (savedRange) {
            let sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(savedRange);
          }
          editor.focus();
        };
        
        editor.addEventListener('input', function() {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const msg = JSON.stringify({ type: 'contentChanged', data: editor.innerHTML });
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
            else window.parent.postMessage(msg, '*');
          }, 200);
        });

        function updateFormatState() {
          let left = document.queryCommandState('justifyLeft');
          let center = document.queryCommandState('justifyCenter');
          let right = document.queryCommandState('justifyRight');
          let full = document.queryCommandState('justifyFull');
          if (!left && !center && !right && !full) {
             left = true;
          }

          let isTask = false;
          let sel1 = window.getSelection();
          if (sel1 && sel1.rangeCount > 0 && sel1.anchorNode) {
             let node = sel1.anchorNode;
             let li = node.nodeType === 3 ? node.parentNode.closest('li') : (node.closest ? node.closest('li') : null);
             if (li && li.closest('ul.task-list')) isTask = true;
          }

          const state = {
            bold: document.queryCommandState('bold'),
            italic: document.queryCommandState('italic'),
            underline: document.queryCommandState('underline'),
            justifyLeft: left,
            justifyCenter: center,
            justifyRight: right,
            justifyFull: full,
            insertUnorderedList: document.queryCommandState('insertUnorderedList'),
            insertOrderedList: document.queryCommandState('insertOrderedList'),
            isTaskList: isTask,
            hiliteColor: document.queryCommandValue('hiliteColor'),
            fontSize: document.queryCommandValue('fontSize'),
          };
          const msg = JSON.stringify({ type: 'formatState', data: state });
          if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
          else window.parent.postMessage(msg, '*');
        }

        document.addEventListener('selectionchange', function() {
          saveSelection();
          updateFormatState();
        });

        window.execCmd = function(cmd, value) {
          window.restoreSelection();
          
          let sel = window.getSelection();
          let node = sel && sel.rangeCount > 0 ? sel.anchorNode : null;
          let li = node ? (node.nodeType === 3 ? node.parentNode : node).closest('li') : null;
          let ul = li ? li.closest('ul.task-list') : null;

          if (cmd === 'insertUnorderedList' && ul) {
            ul.classList.remove('task-list');
          } else if (cmd === 'insertOrderedList' && ul) {
            ul.classList.remove('task-list');
            document.execCommand(cmd, false, value);
          } else {
            document.execCommand(cmd, false, value);
          }
          
          if (cmd === 'undo' || cmd === 'redo') {
            setTimeout(() => {
              const msg = JSON.stringify({ type: 'contentChanged', data: editor.innerHTML });
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
              else window.parent.postMessage(msg, '*');
            }, 100);
          }
          
          saveSelection();
          setTimeout(updateFormatState, 50);
        };
        
        function ensureTrailingParagraph() {
          var last = editor.lastElementChild;
          if (!last || last.nodeName !== 'P' || last.innerHTML === '' || last.innerHTML === '<br>') return;
          var p = document.createElement('p');
          p.innerHTML = '<br>';
          editor.appendChild(p);
        }

        function moveCursorToTrailingParagraph() {
          ensureTrailingParagraph();
          var last = editor.lastElementChild;
          if (!last) return;
          var range = document.createRange();
          range.setStart(last, 0);
          range.collapse(true);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          editor.focus();
        }

        var guardObserver = new MutationObserver(function() {
          var last = editor.lastElementChild;
          if (last && last.nodeName !== 'P') {
            var p = document.createElement('p');
            p.innerHTML = '<br>';
            editor.appendChild(p);
          }
          document.querySelectorAll('.bible-verse').forEach(el => {
            if (el.getAttribute('contenteditable') !== 'false') {
              el.setAttribute('contenteditable', 'false');
            }
          });
        });
        guardObserver.observe(editor, { childList: true, subtree: true });

        function forceReadOnly() {
          document.querySelectorAll('.bible-verse').forEach(el => {
            el.setAttribute('contenteditable', 'false');
          });
        }
        setTimeout(forceReadOnly, 100);
        setTimeout(forceReadOnly, 500);

        ensureTrailingParagraph();

        window.insertHtml = function(html) {
          const sel = window.getSelection();
          const isInEditor = sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode);
          
          if (!isInEditor) {
            moveCursorToTrailingParagraph();
          } else {
            editor.focus();
          }

          document.execCommand('insertHTML', false, html);
          setTimeout(function() {
            if (!isInEditor) {
              moveCursorToTrailingParagraph();
            } else {
              // Try to move cursor to the P that was just inserted after the block
              const sel2 = window.getSelection();
              if (sel2.rangeCount > 0) {
                const node = sel2.anchorNode;
                const container = node.nodeType === 3 ? node.parentNode : node;
                if (container.nodeName !== 'P') {
                   // Fallback to end if we are stuck
                   moveCursorToTrailingParagraph();
                }
              }
            }
            updateFormatState();
          }, 80);
        };

        window.changeFontSize = function(delta) {
          window.restoreSelection();
          
          var selection = window.getSelection();
          if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
          
          var node = selection.anchorNode;
          var parent = node.nodeType === 3 ? node.parentNode : node;
          var currentSizeStr = window.getComputedStyle(parent).fontSize;
          var px = parseInt(currentSizeStr) || 16;
          
          var sizes = [11, 13, 16, 24, 32, 48, 64];
          var currentIndex = 2;
          var minDiff = Infinity;
          for (var i = 0; i < sizes.length; i++) {
              var diff = Math.abs(sizes[i] - px);
              if (diff < minDiff) { 
                 minDiff = diff; 
                 currentIndex = i; 
              }
          }
          
          var newIndex = currentIndex + delta;
          if (newIndex < 0) newIndex = 0;
          if (newIndex > 6) newIndex = 6;
          
          var newSize = newIndex + 1;
          document.execCommand('fontSize', false, newSize);
          saveSelection();
        };

        window.toggleTaskList = function() {
          window.restoreSelection();
          let sel = window.getSelection();
          if (!sel.rangeCount) return;
          let node = sel.anchorNode;
          let li = node ? (node.nodeType === 3 ? node.parentNode : node).closest('li') : null;
          
          if (li) {
             let ul = li.closest('ul');
             if (ul) {
               ul.classList.toggle('task-list');
             } else {
               let ol = li.closest('ol');
               if (ol) {
                  document.execCommand('insertOrderedList', false, null); 
                  document.execCommand('insertUnorderedList', false, null); 
                  setTimeout(window.toggleTaskList, 50); 
                  return;
               }
             }
          } else {
             document.execCommand('insertUnorderedList', false, null);
             setTimeout(() => {
               let sel2 = window.getSelection();
               let node2 = sel2.anchorNode;
               let li2 = node2 ? (node2.nodeType === 3 ? node2.parentNode : node2).closest('li') : null;
               if (li2) {
                 let ul2 = li2.closest('ul');
                 if (ul2) ul2.classList.add('task-list');
                 saveSelection();
                 updateFormatState();
               }
             }, 50);
             return;
          }
          saveSelection();
          setTimeout(updateFormatState, 50);
        };

        document.addEventListener('click', function(e) {
          let block = e.target.closest('.bible-verse');
          let insertBefore = false;
          
          // Check for click on editor background near any block
          if (e.target === editor) {
            const y = e.clientY;
            const blocks = document.querySelectorAll('.bible-verse');
            let closest = null;
            let minDist = Infinity;
            
            for (let b of blocks) {
              const rect = b.getBoundingClientRect();
              const dTop = Math.abs(y - rect.top);
              const dBottom = Math.abs(y - rect.bottom);
              if (dTop < minDist) { minDist = dTop; closest = b; insertBefore = true; }
              if (dBottom < minDist) { minDist = dBottom; closest = b; insertBefore = false; }
            }
            
            if (closest && minDist < 50) {
              block = closest;
            }
          }

          if (block && !e.target.classList.contains('remove-verse-btn')) {
            const targetEl = insertBefore ? block.previousElementSibling : block.nextElementSibling;
            
            if (!targetEl || targetEl.nodeName !== 'P') {
              var p = document.createElement('p');
              p.innerHTML = '<br>';
              if (insertBefore) block.parentNode.insertBefore(p, block);
              else block.parentNode.insertBefore(p, block.nextSibling);
              
              const range = document.createRange();
              const sel = window.getSelection();
              range.setStart(p, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);

              const msg = JSON.stringify({ type: 'contentChanged', data: editor.innerHTML });
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
              else window.parent.postMessage(msg, '*');
            } else {
              const range = document.createRange();
              const sel = window.getSelection();
              range.setStart(targetEl, 0);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }

          if (e.target.classList.contains('remove-verse-btn')) {
            let block = e.target.closest('.bible-verse');
            if (block) {
                block.remove();
                const msg = JSON.stringify({ type: 'contentChanged', data: editor.innerHTML });
                if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
                else window.parent.postMessage(msg, '*');
            }
            return;
          }

          let li = e.target.closest ? e.target.closest('ul.task-list li') : null;
          if (!li) return;
          let rect = li.getBoundingClientRect();
          if (e.clientX < rect.left + 8 && e.clientX > rect.left - 40) {
              let checked = li.getAttribute('data-checked') === 'true';
              if (checked) li.removeAttribute('data-checked');
              else li.setAttribute('data-checked', 'true');
              
              e.preventDefault();
              
              clearTimeout(debounceTimer);
              debounceTimer = setTimeout(() => {
                const msg = JSON.stringify({ type: 'contentChanged', data: editor.innerHTML });
                if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(msg);
                else window.parent.postMessage(msg, '*');
              }, 100);
          }
        });

        editor.addEventListener('keydown', function(e) {
          if (e.key === 'Backspace' || e.key === 'Delete') {
            let sel = window.getSelection();
            if (sel && sel.isCollapsed) {
              let node = sel.anchorNode;
              if (!node) return;
              let container = node.nodeType === 3 ? node.parentNode : node;
              let blockParent = (container.closest ? container.closest('p, div, li') : null) || container;
              
              if (e.key === 'Backspace' && sel.anchorOffset === 0) {
                if (blockParent.previousElementSibling && blockParent.previousElementSibling.classList.contains('bible-verse')) {
                  // If paragraph is empty, allow deleting the paragraph itself
                  if (blockParent.textContent.trim() === '' && !blockParent.querySelector('img')) {
                    const toFocus = blockParent.previousElementSibling.previousElementSibling;
                    blockParent.remove();
                    if (toFocus) {
                      const range = document.createRange();
                      const sel = window.getSelection();
                      range.selectNodeContents(toFocus);
                      range.collapse(false);
                      sel.removeAllRanges();
                      sel.addRange(range);
                    }
                    e.preventDefault();
                    return;
                  }
                  // If not empty, just prevent merging with the block
                  e.preventDefault();
                  return;
                }
              }

              if (e.key === 'Delete') {
                if (blockParent.nextElementSibling && blockParent.nextElementSibling.classList.contains('bible-verse')) {
                   const range = sel.getRangeAt(0);
                   const postRange = document.createRange();
                   postRange.selectNodeContents(blockParent);
                   postRange.setStart(range.endContainer, range.endOffset);
                   if (postRange.toString().trim().length === 0) {
                      e.preventDefault();
                      return;
                   }
                }
              }
            }
          }
          if (e.key === 'Enter') {
             let sel = window.getSelection();
             let li = sel.anchorNode ? (sel.anchorNode.nodeType === 3 ? sel.anchorNode.parentNode : sel.anchorNode).closest('ul.task-list li') : null;
             
             if (li) {
                 setTimeout(() => {
                    let newSel = window.getSelection();
                    let newLi = newSel.anchorNode ? (newSel.anchorNode.nodeType === 3 ? newSel.anchorNode.parentNode : newSel.anchorNode).closest('ul.task-list li') : null;
                    if (newLi && newLi !== li) {
                       newLi.removeAttribute('data-checked');
                    }
                 }, 10);
             }
          }
        });

        var allowedCommands = {
          execCmd: function(cmd, value) { window.execCmd(cmd, value); },
          changeFontSize: function(delta) { window.changeFontSize(Number(delta) || 0); },
          insertHtml: function(html) { window.insertHtml(String(html)); },
          toggleTaskList: function() { window.toggleTaskList(); },
          blur: function() { document.getElementById('editor').blur(); },
          setSpellcheck: function(isEnabled) {
            var editorEl = document.getElementById('editor');
            if (!editorEl) return;
            editorEl.setAttribute('spellcheck', Number(isEnabled) ? 'true' : 'false');
            editorEl.setAttribute('autocorrect', Number(isEnabled) ? 'on' : 'off');
            if (document.activeElement === editorEl) {
              saveSelection();
              editorEl.blur();
              window.restoreSelection();
            }
          },
          applyTheme: function(background, color, fontFamily) {
            document.body.style.backgroundColor = background;
            var editorEl = document.getElementById('editor');
            if (editorEl) {
              editorEl.style.color = color;
              editorEl.style.backgroundColor = background;
              editorEl.style.fontFamily = fontFamily;
            }
          }
        };

        window.runEditorCommand = function(command) {
          if (!command || !Object.prototype.hasOwnProperty.call(allowedCommands, command.name)) return;
          allowedCommands[command.name].apply(null, Array.isArray(command.args) ? command.args : []);
        };

        window.addEventListener('message', function(event) {
          if (event.source !== window.parent) return;
          try {
            var msg = JSON.parse(event.data);
            if (msg.type === 'command') window.runEditorCommand(msg.command);
          } catch(e) { }
        });

      </script>
    </body>
    </html>
  `,
      [
        initialHtml,
        editorColors,
        readerColors,
        readerFontFamily,
        ms,
        DESIGN,
        readonly,
      ],
    );

    return (
      <View style={{ flex: 1 }}>
        {showToolbar && !readonly && (
          <View
            style={[
              styles.toolbar,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingLeft: ms(DESIGN.spacing.sm),
                paddingRight: ms(DESIGN.spacing.huge),
                alignItems: "center",
              }}
            >
              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    { backgroundColor: colors.primary },
                    Platform.select({
                      web: { outlineStyle: "none" } as any,
                      default: {},
                    }),
                  ]}
                  onPress={onOpenVersePicker}
                  activeOpacity={0.7}
                >
                  <BibleIcon name="book-open" color={colors.onPrimary} />
                </TouchableOpacity>
              </View>

              <BibleDivider
                vertical
                height={20}
                margin={ms(DESIGN.spacing.sm)}
              />

              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.groupBtn}
                  onPress={() => changeFontSize(1)}
                >
                  <BibleText
                    style={{
                      fontWeight: "800",
                      fontSize: ms(DESIGN.spacing.lg),
                      color: colors.onSurface,
                      marginRight: ms(DESIGN.spacing.tiny),
                    }}
                  >
                    A
                  </BibleText>
                  <BibleIcon name="plus" color={colors.onSurface} />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={styles.groupBtn}
                  onPress={() => changeFontSize(-1)}
                >
                  <BibleText
                    style={{
                      fontWeight: "800",
                      fontSize: ms(DESIGN.spacing.md),
                      color: colors.onSurface,
                      marginRight: ms(DESIGN.spacing.tiny),
                    }}
                  >
                    A
                  </BibleText>
                  <BibleIcon name="minus" color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <BibleDivider
                vertical
                height={20}
                margin={ms(DESIGN.spacing.sm)}
              />

              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.bold && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => execDocumentCmd("bold")}
                >
                  <BibleIcon
                    name="bold"
                    color={
                      formatState.bold ? colors.onPrimary : colors.onSurface
                    }
                  />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.italic && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => execDocumentCmd("italic")}
                >
                  <BibleIcon
                    name="italic"
                    color={
                      formatState.italic ? colors.onPrimary : colors.onSurface
                    }
                  />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.underline && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => execDocumentCmd("underline")}
                >
                  <BibleIcon
                    name="underline"
                    color={
                      formatState.underline
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />
                </TouchableOpacity>
              </View>

              <BibleDivider
                vertical
                height={20}
                margin={ms(DESIGN.spacing.sm)}
              />

              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.insertUnorderedList &&
                      !formatState.isTaskList && {
                        backgroundColor: colors.primary,
                      },
                  ]}
                  onPress={() => execDocumentCmd("insertUnorderedList")}
                >
                  <BibleIcon
                    name="list"
                    color={
                      formatState.insertUnorderedList && !formatState.isTaskList
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.isTaskList && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() =>
                    injectToEditor({ name: "toggleTaskList", args: [] })
                  }
                >
                  <BibleIcon
                    name="check-square"
                    color={
                      formatState.isTaskList
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.insertOrderedList && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => execDocumentCmd("insertOrderedList")}
                >
                  <BibleIcon
                    name="list"
                    color={
                      formatState.insertOrderedList
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />
                  <BibleText
                    style={{
                      fontSize: ms(DESIGN.fontSize.xs),
                      color: formatState.insertOrderedList
                        ? colors.primary
                        : colors.onSurface,
                      position: "absolute",
                      right: ms(DESIGN.spacing.xs),
                      bottom: ms(DESIGN.spacing.xs),
                      fontWeight: "800",
                    }}
                  >
                    1.
                  </BibleText>
                </TouchableOpacity>
              </View>

              <BibleDivider
                vertical
                height={20}
                margin={ms(DESIGN.spacing.sm)}
              />

              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.groupBtn}
                  onPress={() => execDocumentCmd("outdent")}
                >
                  <BibleIcon name="arrow-left" color={colors.onSurface} />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={styles.groupBtn}
                  onPress={() => execDocumentCmd("indent")}
                >
                  <BibleIcon name="arrow-right" color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <BibleDivider
                vertical
                height={20}
                margin={ms(DESIGN.spacing.sm)}
              />

              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.justifyLeft && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => execDocumentCmd("justifyLeft")}
                >
                  <BibleIcon
                    name="align-left"
                    color={
                      formatState.justifyLeft
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.justifyCenter && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => execDocumentCmd("justifyCenter")}
                >
                  <BibleIcon
                    name="align-center"
                    color={
                      formatState.justifyCenter
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.justifyRight && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => execDocumentCmd("justifyRight")}
                >
                  <BibleIcon
                    name="align-right"
                    color={
                      formatState.justifyRight
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    formatState.justifyFull && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => execDocumentCmd("justifyFull")}
                >
                  <BibleIcon
                    name="align-justify"
                    color={
                      formatState.justifyFull
                        ? colors.onPrimary
                        : colors.onSurface
                    }
                  />
                </TouchableOpacity>
              </View>

              <BibleDivider
                vertical
                height={20}
                margin={ms(DESIGN.spacing.sm)}
              />

              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                {VERSE_HIGHLIGHTS.map((h, i) => (
                  <React.Fragment key={h.id}>
                    <TouchableOpacity
                      style={[styles.groupBtn, { width: ms(DESIGN.height.sm) }]}
                      onPress={() => applyHighlight(h.hex)}
                    >
                      <View
                        style={{
                          width: ms(DESIGN.fontSize.xxl),
                          height: ms(DESIGN.fontSize.xxl),
                          borderRadius: ms(DESIGN.borderRadius.sm),
                          backgroundColor: h.hex,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      />
                    </TouchableOpacity>
                    <BibleDivider vertical height={"60%"} />
                  </React.Fragment>
                ))}
                <TouchableOpacity
                  style={[styles.groupBtn, { width: ms(DESIGN.height.sm) }]}
                  onPress={() => applyHighlight("transparent")}
                >
                  <View
                    style={{
                      width: ms(DESIGN.fontSize.xxl),
                      height: ms(DESIGN.fontSize.xxl),
                      borderRadius: ms(DESIGN.borderRadius.sm),
                      borderWidth: 1.5,
                      borderColor: colors.textMuted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: ms(DESIGN.spacing.lg),
                        height: 1.5,
                        backgroundColor: colors.textMuted,
                        transform: [{ rotate: "45deg" }],
                      }}
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <BibleDivider
                vertical
                height={20}
                margin={ms(DESIGN.spacing.sm)}
              />

              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.groupBtn}
                  onPress={() => execDocumentCmd("undo")}
                >
                  <BibleIcon name="rotate-ccw" color={colors.onSurface} />
                </TouchableOpacity>
                <BibleDivider vertical height={"60%"} />
                <TouchableOpacity
                  style={styles.groupBtn}
                  onPress={() => execDocumentCmd("redo")}
                >
                  <BibleIcon name="rotate-cw" color={colors.onSurface} />
                </TouchableOpacity>
              </View>

              <BibleDivider
                vertical
                height={20}
                margin={ms(DESIGN.spacing.sm)}
              />

              <View
                style={[
                  styles.rowGroup,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.groupBtn,
                    isSpellcheckEnabled && { backgroundColor: colors.primary },
                  ]}
                  onPress={toggleSpellcheck}
                  accessibilityLabel="Corretor ortográfico"
                >
                  <BibleIcon
                    name="check-circle"
                    color={
                      isSpellcheckEnabled ? colors.onPrimary : colors.onSurface
                    }
                  />
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: ms(DESIGN.icon.xl),
                justifyContent: "center",
                alignItems: "center",
              }}
              pointerEvents="none"
            >
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  left: 0,
                  backgroundColor: colors.surface,
                  opacity: 0.8,
                }}
              />
              <BibleIcon
                name="chevron-right"
                color={colors.primary}
                size={ms(DESIGN.fontSize.md)}
              />
            </View>
          </View>
        )}

        {Platform.OS === "web" ? (
          <iframe
            ref={webIframeRef}
            srcDoc={editorHtml}
            style={{
              flex: 1,
              border: "none",
              backgroundColor: colors.surface,
              width: "100%",
              minHeight: 600,
            }}
            sandbox="allow-scripts"
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: editorHtml }}
            originWhitelist={["about:blank"]}
            onMessage={onMessage}
            style={{ flex: 1, backgroundColor: colors.surface }}
            hideKeyboardAccessoryView={true}
            keyboardDisplayRequiresUserAction={false}
            bounces={false}
          />
        )}
      </View>
    );
  },
);
