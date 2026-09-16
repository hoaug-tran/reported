export type GitHubAlertType = "note" | "tip" | "important" | "warning" | "caution";

export interface ParsedAlert {
  isAlert: boolean;
  type?: GitHubAlertType;
  title?: string;
  body?: string;
}

export function cleanMarkdownContent(raw: string): string {
  if (!raw) return "";

  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\uFEFF\u200B\u200C\u200D]/g, "");

  const blockRegex = /(?:```[\s\S]*?```)|(?:\$\$[\s\S]*?\$\$)/g;
  const tokens: Array<{ isProtected: boolean; content: string }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        isProtected: false,
        content: text.substring(lastIndex, match.index),
      });
    }
    tokens.push({
      isProtected: true,
      content: match[0],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      isProtected: false,
      content: text.substring(lastIndex),
    });
  }

  const cleaned = tokens
    .map((token) => {
      if (token.isProtected) {
        return token.content;
      }

      let seg = token.content;
      seg = seg.replace(/\n{3,}/g, "\n\n");
      seg = seg
        .split("\n")
        .map((line) => {
          if (line.endsWith("  ") && !line.endsWith("   ")) {
            return line;
          }
          return line.replace(/[ \t]+$/, "");
        })
        .join("\n");

      return seg;
    })
    .join("");

  return cleaned.trim();
}

export function parseGitHubAlert(rawText: string): ParsedAlert {
  if (!rawText) return { isAlert: false };

  const trimmed = rawText.trim();
  const alertMatch = trimmed.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*\n)?([\s\S]*)$/i);

  if (!alertMatch) {
    return { isAlert: false };
  }

  const alertType = alertMatch[1].toLowerCase() as GitHubAlertType;
  const alertBody = alertMatch[2]?.trim() || "";

  const titles: Record<GitHubAlertType, string> = {
    note: "Note",
    tip: "Tip",
    important: "Important",
    warning: "Warning",
    caution: "Caution",
  };

  return {
    isAlert: true,
    type: alertType,
    title: titles[alertType] || alertType.toUpperCase(),
    body: alertBody,
  };
}
