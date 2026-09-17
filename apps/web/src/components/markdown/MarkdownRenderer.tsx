import React, { useState, useMemo } from "react";
import { Box } from "@mui/material";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Paperclip } from "lucide-react";
import "katex/dist/katex.min.css";

import { CodeBlock } from "../code/CodeBlock";
import { JsonViewer } from "../json/JsonViewer";
import { MediaLightbox } from "../common/MediaLightbox";
import { AudioPlayer } from "../common/AudioPlayer";
import { MermaidViewer } from "./MermaidViewer";
import { GitHubAlert } from "./GitHubAlert";
import { DrawioViewer } from "./DrawioViewer";
import {
  cleanMarkdownContent,
  parseGitHubAlert,
  GitHubAlertType,
} from "../../utils/markdownUtils";
import { useThemeContext } from "../../contexts/ThemeContext";

interface MarkdownRendererProps {
  content: string;
}

const customSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "details",
    "summary",
    "kbd",
    "mark",
    "sub",
    "sup",
    "abbr",
    "span",
    "div",
    "section",
    "math",
    "semantics",
    "mrow",
    "mi",
    "mo",
    "mn",
    "msup",
    "msub",
    "mfrac",
    "munder",
    "mover",
    "msubsup",
    "mtable",
    "mtr",
    "mtd",
    "annotation",
  ],
  attributes: {
    ...defaultSchema.attributes,
    "*": ["className", "class", "style", "id"],
    a: ["href", "target", "rel", "title", "className", "class"],
    img: ["src", "alt", "title", "className", "class", "loading"],
    input: ["type", "checked", "disabled", "className", "class"],
    details: ["open", "className", "class"],
    th: ["align", "style", "className", "class"],
    td: ["align", "style", "className", "class"],
    code: ["className", "class"],
    span: ["className", "class", "style", "aria-hidden"],
  },
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { tokens, resolvedMode } = useThemeContext();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState("");
  const [lightboxAlt, setLightboxAlt] = useState("");

  const normalizedContent = useMemo(() => {
    return cleanMarkdownContent(content || "");
  }, [content]);

  const components: Components = useMemo(() => {
    return {
      pre({ children }) {
        return <>{children}</>;
      },

      p({ children, ...props }) {
        return (
          <div className="markdown-paragraph" {...props}>
            {children}
          </div>
        );
      },

      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || "");
        const lang = match ? match[1].toLowerCase() : "";
        const rawCode = String(children).replace(/\n$/, "");
        const isInline = !match && !rawCode.includes("\n");

        if (lang === "mermaid") {
          return <MermaidViewer code={rawCode} />;
        }

        if (lang === "drawio" || (lang === "xml" && rawCode.includes("<mxfile"))) {
          return (
            <Box sx={{ my: 2 }}>
              <DrawioViewer xml={rawCode} filename="diagram.drawio" />
            </Box>
          );
        }

        if (lang === "json") {
          return <JsonViewer data={rawCode} title="JSON Payload" />;
        }

        if (!isInline || lang) {
          return <CodeBlock code={rawCode} language={lang || ""} />;
        }

        return (
          <code className="inline-code" {...props}>
            {children}
          </code>
        );
      },

      blockquote({ children }) {
        const extractText = (nodes: React.ReactNode): string => {
          if (typeof nodes === "string") return nodes;
          if (Array.isArray(nodes)) return nodes.map(extractText).join("");
          if (React.isValidElement(nodes) && (nodes.props as { children?: React.ReactNode }).children) {
            return extractText((nodes.props as { children?: React.ReactNode }).children);
          }
          return "";
        };

        const rawText = extractText(children);
        const alertInfo = parseGitHubAlert(rawText);

        if (alertInfo.isAlert && alertInfo.type) {
          const cleanedChildren = React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === "p") {
              const pChildren = (child.props as { children?: React.ReactNode }).children;
              if (typeof pChildren === "string") {
                const stripped = pChildren.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/i, "");
                return <p>{stripped}</p>;
              }
              if (Array.isArray(pChildren) && typeof pChildren[0] === "string") {
                const first = pChildren[0].replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/i, "");
                return <p>{[first, ...pChildren.slice(1)]}</p>;
              }
            }
            return child;
          });

          return (
            <GitHubAlert type={alertInfo.type as GitHubAlertType} title={alertInfo.title}>
              {cleanedChildren}
            </GitHubAlert>
          );
        }

        return <blockquote>{children}</blockquote>;
      },

      table({ children }) {
        return (
          <div className="table-wrapper">
            <table className="markdown-table">{children}</table>
          </div>
        );
      },

      th({ children, style, ...props }) {
        return (
          <th style={style} {...props}>
            {children}
          </th>
        );
      },

      td({ children, style, ...props }) {
        return (
          <td style={style} {...props}>
            {children}
          </td>
        );
      },

      input({ type, checked, ...props }) {
        if (type === "checkbox") {
          return (
            <input
              type="checkbox"
              checked={checked}
              disabled
              className={`task-checkbox ${checked ? "checked" : ""}`}
              {...props}
            />
          );
        }
        return <input type={type} {...props} />;
      },

      a({ href = "", children, ...props }) {
        const textContent = String(children);

        const isAudio =
          textContent.includes("\uD83C\uDF99") ||
          textContent.includes("Voice") ||
          textContent.includes("Audio") ||
          textContent.includes("Tin nhắn thoại") ||
          /\.(mp3|wav|ogg|m4a)(\?.*)?$/i.test(href);

        if (isAudio) {
          return (
            <Box sx={{ my: 1.5, maxWidth: 420 }}>
              <AudioPlayer src={href} />
            </Box>
          );
        }

        const isVideo =
          textContent.includes("\uD83C\uDFAC") ||
          textContent.includes("Video") ||
          textContent.includes("Clip") ||
          /\.(mp4|mov|webm|mkv|avi)(\?.*)?$/i.test(href);

        if (isVideo) {
          const videoSrc = href.includes("?")
            ? href.includes("inline=true")
              ? href
              : `${href}&inline=true`
            : `${href}?inline=true`;

          return (
            <Box sx={{ my: 1.5, maxWidth: 640 }}>
              <video
                src={videoSrc}
                controls
                preload="metadata"
                playsInline
                style={{
                  width: "100%",
                  maxHeight: 420,
                  borderRadius: 8,
                  backgroundColor: "#000000",
                  border: `1px solid ${tokens.border}`,
                  display: "block",
                }}
              />
            </Box>
          );
        }

        const isDrawio =
          /\.drawio(\?.*)?$/i.test(href) ||
          /\.drawio$/i.test(textContent);

        if (isDrawio) {
          const drawioName =
            textContent.replace(/^[\uD83D\uDCCE\s]+/, "").replace(/^File:\s*/, "") ||
            href.split("/").pop()?.split("?")[0] ||
            "diagram.drawio";
          return (
            <Box sx={{ my: 2 }}>
              <DrawioViewer url={href} filename={drawioName} />
            </Box>
          );
        }

        const isFile =
          textContent.includes("\uD83D\uDCCE") ||
          textContent.startsWith("File:") ||
          /\.(pdf|docx?|xlsx?|pptx?|zip|tar|gz|txt|csv|json|log|sql)(\?.*)?$/i.test(textContent);

        if (isFile) {
          const label = textContent.replace(/^[\uD83D\uDCCE\s]+/, "").replace(/^File:\s*/, "");
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="file-link" {...props}>
              <Paperclip size={14} style={{ flexShrink: 0 }} />
              <span>{label || textContent}</span>
            </a>
          );
        }

        if (textContent.startsWith("@") && !textContent.includes(" ")) {
          const username = textContent.substring(1);
          return (
            <a href={`/users/${username}`} className="mention-tag" {...props}>
              {children}
            </a>
          );
        }

        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="markdown-link"
            {...props}
          >
            {children}
          </a>
        );
      },

      img({ src = "", alt = "", ...props }) {
        if (/\.drawio(\?.*)?$/i.test(src)) {
          return (
            <Box sx={{ my: 2 }}>
              <DrawioViewer url={src} filename={alt || "diagram.drawio"} />
            </Box>
          );
        }

        return (
          <img
            src={src}
            alt={alt}
            className="markdown-img"
            loading="lazy"
            onClick={() => {
              setLightboxSrc(src);
              setLightboxAlt(alt || "Image Preview");
              setLightboxOpen(true);
            }}
            {...props}
          />
        );
      },

      details({ children, ...props }) {
        return (
          <details className="markdown-details" {...props}>
            {children}
          </details>
        );
      },

      summary({ children, ...props }) {
        return (
          <summary className="markdown-summary" {...props}>
            {children}
          </summary>
        );
      },

      kbd({ children, ...props }) {
        return (
          <kbd className="markdown-kbd" {...props}>
            {children}
          </kbd>
        );
      },

      mark({ children, ...props }) {
        return (
          <mark className="markdown-mark" {...props}>
            {children}
          </mark>
        );
      },
    };
  }, [tokens, setLightboxSrc, setLightboxAlt, setLightboxOpen]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflowWrap: "break-word",
        wordBreak: "break-word",
        lineHeight: 1.65,
        color: tokens.textPrimary,
        fontSize: "0.875rem",
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        "& p, & .markdown-paragraph": { m: 0, mb: 1.5, "&:last-child": { mb: 0 } },
        "& h1": {
          fontSize: "1.5rem",
          fontWeight: 700,
          mt: 3,
          mb: 1.5,
          pb: 0.6,
          borderBottom: `1px solid ${tokens.border}`,
          lineHeight: 1.3,
          "&:first-of-type": { mt: 0.5 },
        },
        "& h2": {
          fontSize: "1.3rem",
          fontWeight: 600,
          mt: 2.5,
          mb: 1.25,
          pb: 0.5,
          borderBottom: `1px solid ${tokens.border}`,
          lineHeight: 1.35,
        },
        "& h3": { fontSize: "1.125rem", fontWeight: 600, mt: 2, mb: 1, lineHeight: 1.4 },
        "& h4": { fontSize: "1rem", fontWeight: 600, mt: 1.75, mb: 0.75 },
        "& h5": { fontSize: "0.925rem", fontWeight: 600, mt: 1.5, mb: 0.5 },
        "& h6": { fontSize: "0.875rem", fontWeight: 600, color: tokens.textSecondary, mt: 1.25, mb: 0.5 },

        "& ul, & ol": {
          pl: 3,
          my: 1.25,
          "& li": {
            my: 0.35,
            lineHeight: 1.6,
          },
          "& ul, & ol": {
            my: 0.35,
            pl: 2.5,
          },
        },
        "& li": {
          "&.task-list-item": {
            listStyleType: "none",
            ml: -2.5,
          },
        },

        "& .task-checkbox": {
          mr: 1,
          verticalAlign: "middle",
          cursor: "default",
          accentColor: tokens.primary,
          width: 14,
          height: 14,
        },

        "& blockquote": {
          m: 0,
          my: 1.5,
          py: 0.5,
          pl: 2,
          borderLeft: `3px solid ${tokens.border}`,
          color: tokens.textSecondary,
          fontStyle: "normal",
          "& p": { mb: 0.75, "&:last-child": { mb: 0 } },
        },

        "& .inline-code": {
          px: "0.45em",
          py: "0.2em",
          borderRadius: "4px",
          backgroundColor:
            resolvedMode === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(135, 131, 120, 0.15)",
          color: resolvedMode === "dark" ? "#ff7b72" : "#eb5757",
          fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
          fontSize: "0.85em",
          fontWeight: 500,
          border: `1px solid ${
            resolvedMode === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.05)"
          }`,
          boxDecorationBreak: "clone",
          WebkitBoxDecorationBreak: "clone",
          whiteSpace: "break-spaces",
          wordBreak: "break-word",
        },

        "& .mention-tag": {
          color: tokens.primary,
          backgroundColor: tokens.selected,
          borderRadius: "4px",
          px: 0.6,
          py: 0.15,
          fontWeight: 600,
          textDecoration: "none",
          fontSize: "0.8125rem",
          transition: "background-color 0.15s",
          "&:hover": { textDecoration: "underline", backgroundColor: tokens.hover },
        },

        "& .markdown-link": {
          color: tokens.primary,
          textDecoration: "none",
          fontWeight: 500,
          wordBreak: "break-word",
          "&:hover": { textDecoration: "underline" },
        },

        "& .file-link": {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          px: 1.25,
          py: 0.5,
          my: 0.5,
          borderRadius: "6px",
          backgroundColor: tokens.surfaceSecondary,
          border: `1px solid ${tokens.border}`,
          color: tokens.primary,
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.8125rem",
          transition: "background-color 0.15s, border-color 0.15s",
          "&:hover": {
            backgroundColor: tokens.hover,
            borderColor: tokens.primary,
            textDecoration: "none",
          },
        },

        "& .markdown-img": {
          maxWidth: "100%",
          height: "auto",
          borderRadius: "8px",
          border: `1px solid ${tokens.border}`,
          my: 1.5,
          cursor: "zoom-in",
          transition: "box-shadow 0.15s ease",
          "&:hover": {
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          },
        },

        "& hr": {
          border: "none",
          borderTop: `1px solid ${tokens.border}`,
          my: 2.5,
        },

        "& .table-wrapper": {
          overflowX: "auto",
          my: 2,
          borderRadius: "8px",
          border: `1px solid ${tokens.border}`,
        },
        "& .markdown-table": {
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.8125rem",
          "& th": {
            backgroundColor: tokens.surfaceSecondary,
            padding: "10px 14px",
            fontWeight: 600,
            borderBottom: `1px solid ${tokens.border}`,
          },
          "& td": {
            padding: "8px 14px",
            borderBottom: `1px solid ${tokens.border}`,
          },
          "& tr:last-child td": {
            borderBottom: "none",
          },
          "& tr:nth-of-type(even)": {
            backgroundColor: resolvedMode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          },
        },

        "& .markdown-details": {
          my: 1.5,
          p: 1.5,
          borderRadius: "8px",
          border: `1px solid ${tokens.border}`,
          backgroundColor: resolvedMode === "dark" ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
          "&[open]": {
            backgroundColor: "transparent",
          },
        },
        "& .markdown-summary": {
          fontWeight: 600,
          cursor: "pointer",
          userSelect: "none",
          color: tokens.textPrimary,
          fontSize: "0.875rem",
          "&:hover": {
            color: tokens.primary,
          },
        },

        "& .markdown-kbd": {
          display: "inline-block",
          padding: "2px 6px",
          fontSize: "0.75rem",
          fontWeight: 600,
          lineHeight: "1",
          color: tokens.textPrimary,
          verticalAlign: "middle",
          backgroundColor: tokens.surfaceSecondary,
          border: `1px solid ${tokens.border}`,
          borderRadius: "4px",
          boxShadow: resolvedMode === "dark" ? "inset 0 -1px 0 rgba(255,255,255,0.1)" : "inset 0 -1px 0 rgba(0,0,0,0.2)",
          fontFamily: '"JetBrains Mono", monospace',
        },

        "& .markdown-mark": {
          backgroundColor: resolvedMode === "dark" ? "rgba(234, 179, 8, 0.25)" : "rgba(250, 204, 21, 0.4)",
          color: tokens.textPrimary,
          padding: "0.1em 0.3em",
          borderRadius: "3px",
        },

        "& .katex-display": {
          my: 2,
          overflowX: "auto",
          overflowY: "hidden",
          py: 1,
        },
        "& .katex": {
          fontSize: "1.05em",
        },
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, customSanitizeSchema], rehypeKatex]}
        components={components}
      >
        {normalizedContent}
      </ReactMarkdown>

      <MediaLightbox
        open={lightboxOpen}
        src={lightboxSrc}
        alt={lightboxAlt}
        onClose={() => setLightboxOpen(false)}
      />
    </Box>
  );
};
