import React, { useState, useEffect } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { Copy, Check, ListOrdered, WrapText } from "lucide-react";
import { useThemeContext } from "../../contexts/ThemeContext";
import Prism from "prismjs";

import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-jsx.js";
import "prismjs/components/prism-tsx.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-bash.js";
import "prismjs/components/prism-sql.js";
import "prismjs/components/prism-yaml.js";
import "prismjs/components/prism-docker.js";
import "prismjs/components/prism-csharp.js";
import "prismjs/components/prism-java.js";
import "prismjs/components/prism-markdown.js";

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbersDefault?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "text",
  showLineNumbersDefault = true,
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(
    showLineNumbersDefault,
  );
  const [wrapLines, setWrapLines] = useState(false);

  const cleanCode = (code || "").trim();
  const langKey = language.toLowerCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedCode = React.useMemo(() => {
    const grammar =
      Prism.languages[langKey] ||
      Prism.languages.text ||
      Prism.languages.javascript;
    try {
      return Prism.highlight(cleanCode, grammar, langKey);
    } catch {
      return cleanCode;
    }
  }, [cleanCode, langKey]);

  const lines = cleanCode.split("\n");

  return (
    <Box
      sx={{
        my: 1.5,
        borderRadius: "6px",
        border: `1px solid ${tokens.codeBorder}`,
        backgroundColor: tokens.codeBackground,
        overflow: "hidden",
        fontSize: "0.8125rem",
        fontFamily: '"JetBrains Mono", monospace',
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.5,
          borderBottom: `1px solid ${tokens.codeBorder}`,
          backgroundColor: resolvedMode === "dark" ? "#161b22" : "#f6f8fa",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: tokens.textSecondary,
            fontFamily: "inherit",
          }}
        >
          {language}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={wrapLines ? "Unwrap lines" : "Wrap lines"}>
            <IconButton
              size="small"
              onClick={() => setWrapLines(!wrapLines)}
              sx={{ color: wrapLines ? tokens.primary : tokens.textSecondary }}
            >
              <WrapText size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip
            title={showLineNumbers ? "Hide line numbers" : "Show line numbers"}
          >
            <IconButton
              size="small"
              onClick={() => setShowLineNumbers(!showLineNumbers)}
              sx={{
                color: showLineNumbers ? tokens.primary : tokens.textSecondary,
              }}
            >
              <ListOrdered size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip title={copied ? "Copied!" : "Copy code"}>
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{ color: tokens.textSecondary }}
            >
              {copied ? (
                <Check size={16} color={tokens.success} />
              ) : (
                <Copy size={16} />
              )}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          p: 1.5,
          overflowX: wrapLines ? "hidden" : "auto",
          whiteSpace: wrapLines ? "pre-wrap" : "pre",
          wordBreak: wrapLines ? "break-all" : "normal",
          lineHeight: 1.6,
        }}
      >
        {showLineNumbers ? (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td
                    style={{
                      userSelect: "none",
                      textAlign: "right",
                      paddingRight: "16px",
                      color: tokens.textSecondary,
                      opacity: 0.6,
                      verticalAlign: "top",
                      width: "1%",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{ verticalAlign: "top" }}
                    dangerouslySetInnerHTML={{
                      __html: Prism.highlight(
                        line,
                        Prism.languages[langKey] ||
                          Prism.languages.text ||
                          Prism.languages.javascript,
                        langKey,
                      ),
                    }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        )}
      </Box>
    </Box>
  );
};
