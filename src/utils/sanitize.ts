const BLOCKED_TAGS =
  /<\s*(script|iframe|object|embed|style|link|meta|base|form|frame|frameset|applet)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|iframe|object|embed|style|link|meta|base|form|frame|frameset|applet)\b[^>]*\/?>/gi;
const EVENT_ATTRIBUTES = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const SCRIPT_URL_ATTRIBUTES =
  /\s+(href|src|xlink:href|action|formaction|srcdoc)\s*=\s*("\s*(?:javascript|vbscript|data):[^"]*"|'\s*(?:javascript|vbscript|data):[^']*'|(?:javascript|vbscript|data):[^\s>]*)/gi;
const VOICE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function sanitizeHtml(html: string): string {
  let previous: string;
  let current = html ?? "";
  do {
    previous = current;
    current = current
      .replace(BLOCKED_TAGS, "")
      .replace(EVENT_ATTRIBUTES, "")
      .replace(SCRIPT_URL_ATTRIBUTES, "");
  } while (current !== previous);
  return current;
}

export function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isSafeVoiceId(value: string): boolean {
  return VOICE_ID_PATTERN.test(value);
}
