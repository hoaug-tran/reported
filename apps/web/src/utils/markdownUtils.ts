export type GitHubAlertType = "note" | "tip" | "important" | "warning" | "caution";

export interface ParsedAlert {
  isAlert: boolean;
  type?: GitHubAlertType;
  title?: string;
  body?: string;
}

const ALLOWED_HTML_TAGS =
  "details|summary|kbd|mark|sub|sup|abbr|span|div|section|p|b|i|u|s|strong|em|a|img|code|pre|blockquote|table|thead|tbody|tfoot|tr|th|td|ul|ol|li|br|hr|h[1-6]|video|audio|source|math|semantics|mrow|mi|mo|mn|msup|msub|mfrac|munder|mover|msubsup|mtable|mtr|mtd|annotation";

export const cleanMarkdownContent = (raw: string): string => {
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

  const htmlTagPattern = new RegExp(`^<\\/?(?:${ALLOWED_HTML_TAGS})\\b`, "i");
  const autolinkPattern = /^<https?:|^<mailto:/i;

  const cleaned = tokens
    .map((token) => {
      if (token.isProtected) {
        return token.content;
      }

      let seg = token.content;
      seg = seg.replace(/\n{3,}/g, "\n\n");

      seg = seg.replace(
        /(?:^|\n)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]([^\n]*(?:\n[^\n#*-`>].*)*)/gi,
        (fullMatch) => {
          const lines = fullMatch.trim().split("\n");
          const formatted = lines
            .map((line) => (line.startsWith(">") ? line : `> ${line}`))
            .join("\n");
          return `\n\n${formatted}\n\n`;
        },
      );

      seg = seg.replace(/<([^>\n]*>)?/g, (tagMatch) => {
        if (htmlTagPattern.test(tagMatch) || autolinkPattern.test(tagMatch)) {
          return tagMatch;
        }
        return tagMatch.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      });

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

export const linkifyMentions = (raw: string): string => {
  const protectedBlocks = raw.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return protectedBlocks
    .map((segment, index) => {
      if (index % 2 === 1) return segment;
      return segment.replace(
        /(^|[\s(])@([a-zA-Z0-9_-]{1,39})\b/g,
        "$1[@$2](/users/$2)",
      );
    })
    .join("");
}

export const parseGitHubAlert = (rawText: string): ParsedAlert => {
  if (!rawText) return { isAlert: false };

  const trimmed = rawText.trim();
  const alertMatch =
    trimmed.match(
      /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*[\r\n]+|\s+)([\s\S]*)$/i,
    ) || trimmed.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]$/i);

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

