import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

const EXPORT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,600;0,700;0,800;1,400&display=swap');
  @media print { 
    @page { size: A4; margin: 15mm; } 
    body { padding: 0 !important; margin: 0 !important; }
  }
  body { 
    font-family: 'Helvetica', 'Arial', sans-serif; 
    color: #2d3436; 
    line-height: 1.5; 
    padding: 15mm; 
    margin: 0;
    font-size: 12px;
    width: 100%;
  }
  h1 { color: #006b6b; font-size: 16px; margin-bottom: 4px; font-weight: 800; }
  .meta { color: #a0a0a0; font-size: 10px; margin-bottom: 20px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  .bible-verse { 
    border-left: 3px solid #008080; 
    padding: 10px 16px; 
    background: #f8fdfc; 
    border-radius: 4px; 
    margin: 12px 0; 
    page-break-inside: avoid; 
    overflow-wrap: break-word; 
    word-wrap: break-word; 
    word-break: break-word;
    box-shadow: inset 0 0 0 1px rgba(0,128,128,0.05);
  }
  .remove-verse-btn { display: none !important; }
  .bible-verse .verse-title { 
    color: #008080; 
    display: block; 
    margin-bottom: 8px; 
    font-size: 11px; 
    font-weight: 800; 
    letter-spacing: 0.5px; 
    text-transform: uppercase; 
  }
  .verse-line { margin-bottom: 6px; display: flex; gap: 8px; align-items: flex-start; }
  .verse-num { font-weight: 800; color: #008080; font-size: 10px; margin-top: 2px; min-width: 20px; text-align: right; flex-shrink: 0; white-space: nowrap; opacity: 0.7; }
  .verse-text { font-style: italic; color: #2d3436; flex: 1; font-size: 11.5px; }
  p { margin: 8px 0; font-size: 12px; }
  ul.task-list { list-style: none; padding-left: 28px; }
  ul.task-list li { position: relative; margin-bottom: 8px; }
  ul.task-list li::before {
    content: ''; position: absolute; left: -26px; top: 4px; width: 18px; height: 18px;
    border: 2px solid #008080; border-radius: 4px; background-color: transparent; box-sizing: border-box;
  }
  ul.task-list li[data-checked="true"]::before {
    background-color: #008080;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>');
    background-size: 12px; background-repeat: no-repeat; background-position: center;
  }
  ul.task-list li[data-checked="true"] { text-decoration: line-through; opacity: 0.6; }
  .study-divider { border-top: 1px dashed #ccc; margin: 30px 0; }
  ul, ol { padding-left: 20px; margin: 8px 0; }
`;

export async function exportToPDF(
  title: string,
  htmlContent: string,
  showTitle: boolean = true,
) {
  try {
    const htmlDocument = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${EXPORT_CSS}</style></head><body>
      ${showTitle ? `<h1 class="main-title">${title}</h1>` : ""}
      ${htmlContent.replace(/<p>\s*<br\s*\/?>\s*<\/p>/gi, "")}
    </body></html>`;

    if (Platform.OS === "web") {
      const frame = document.createElement("iframe");
      frame.style.position = "fixed";
      frame.style.right = "0";
      frame.style.bottom = "0";
      frame.style.width = "0";
      frame.style.height = "0";
      frame.style.border = "0";
      frame.srcdoc = htmlDocument;
      frame.onload = () => {
        const frameWindow = frame.contentWindow;
        if (!frameWindow) {
          document.body.removeChild(frame);
          return;
        }
        frameWindow.onafterprint = () => {
          if (frame.parentNode) document.body.removeChild(frame);
        };
        setTimeout(() => {
          frameWindow.focus();
          frameWindow.print();
        }, 300);
      };
      document.body.appendChild(frame);
    } else {
      const { uri } = await Print.printToFileAsync({
        html: htmlDocument,
        width: 612,
        height: 792,
      });
      const safeTitle = title.replace(/[^a-z0-9]/gi, "_") || "documento";
      const newUri = `${(FileSystem as any).documentDirectory}${safeTitle}.pdf`;
      try {
        await FileSystem.deleteAsync(newUri, { idempotent: true });
      } catch (e) {}
      await FileSystem.copyAsync({ from: uri, to: newUri });
      await Sharing.shareAsync(newUri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    }
  } catch (e: any) {
    Alert.alert("Erro na geração de PDF", String(e?.message || e));
  }
}
