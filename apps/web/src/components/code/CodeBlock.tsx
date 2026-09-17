import React, { useState, useMemo } from "react";
import {
  Box,
  ButtonBase,
  IconButton,
  InputBase,
  MenuItem,
  Popover,
  Tooltip,
} from "@mui/material";
import {
  Copy,
  Check,
  ListOrdered,
  WrapText,
  ChevronDown,
  Search,
  X,
  Sparkles,
} from "lucide-react";
import hljs from "highlight.js";
import { useThemeContext } from "../../contexts/ThemeContext";

interface LanguageDefinition {
  id: string;
  name: string;
  aliases?: string[];
}

const POPULAR_LANGUAGES: LanguageDefinition[] = [
  { id: "typescript", name: "TypeScript", aliases: ["ts"] },
  { id: "javascript", name: "JavaScript", aliases: ["js", "mjs", "cjs"] },
  { id: "python", name: "Python", aliases: ["py"] },
  { id: "java", name: "Java" },
  { id: "c", name: "C" },
  { id: "cpp", name: "C++", aliases: ["c++", "cc", "cxx"] },
  { id: "csharp", name: "C#", aliases: ["cs"] },
  { id: "go", name: "Go", aliases: ["golang"] },
  { id: "rust", name: "Rust", aliases: ["rs"] },
  { id: "sql", name: "SQL" },
  { id: "bash", name: "Bash", aliases: ["sh", "zsh", "shell"] },
  { id: "powershell", name: "PowerShell", aliases: ["ps1", "ps"] },
  { id: "php", name: "PHP" },
  { id: "ruby", name: "Ruby", aliases: ["rb"] },
  { id: "swift", name: "Swift" },
  { id: "kotlin", name: "Kotlin", aliases: ["kt"] },
  { id: "dart", name: "Dart" },
  { id: "html", name: "HTML", aliases: ["xml", "xhtml"] },
  { id: "css", name: "CSS" },
  { id: "scss", name: "SCSS", aliases: ["sass"] },
  { id: "json", name: "JSON" },
  { id: "yaml", name: "YAML", aliases: ["yml"] },
  { id: "toml", name: "TOML", aliases: ["ini"] },
  { id: "markdown", name: "Markdown", aliases: ["md"] },
  { id: "dockerfile", name: "Dockerfile", aliases: ["docker"] },
  { id: "graphql", name: "GraphQL", aliases: ["gql"] },
  { id: "solidity", name: "Solidity", aliases: ["sol"] },
  { id: "lua", name: "Lua" },
  { id: "r", name: "R" },
  { id: "scala", name: "Scala" },
  { id: "elixir", name: "Elixir", aliases: ["ex"] },
  { id: "erlang", name: "Erlang", aliases: ["erl"] },
  { id: "haskell", name: "Haskell", aliases: ["hs"] },
  { id: "clojure", name: "Clojure", aliases: ["clj"] },
  { id: "perl", name: "Perl", aliases: ["pl"] },
  { id: "x86asm", name: "Assembly (x86)", aliases: ["nasm", "asm"] },
  { id: "armasm", name: "Assembly (ARM)" },
  { id: "wasm", name: "WebAssembly", aliases: ["wat"] },
  { id: "latex", name: "LaTeX", aliases: ["tex"] },
  { id: "makefile", name: "Makefile", aliases: ["make", "mk"] },
  { id: "cmake", name: "CMake" },
  { id: "nginx", name: "Nginx" },
  { id: "apache", name: "Apache" },
  { id: "diff", name: "Diff", aliases: ["patch"] },
  { id: "plaintext", name: "Plain Text", aliases: ["text", "txt"] },
];

const TOP_AUTO_LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "sql",
  "rust",
  "go",
  "java",
  "csharp",
  "cpp",
  "c",
  "bash",
  "json",
  "yaml",
  "html",
  "css",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "markdown",
  "dockerfile",
  "graphql",
];

const splitHighlightedLines = (html: string): string[] => {
  const lines = html.split("\n");
  const result: string[] = [];
  const openTags: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prefix = openTags.join("");
    const tagRegex = /(<\/?span[^>]*>)/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(line)) !== null) {
      const tag = match[1];
      if (tag.startsWith("</span")) {
        openTags.pop();
      } else if (tag.startsWith("<span")) {
        openTags.push(tag);
      }
    }

    const suffix = "</span>".repeat(openTags.length);
    result.push(prefix + line + suffix);
  }
  return result;
};

const resolveLanguageId = (lang: string): string => {
  const normalized = (lang || "").toLowerCase().trim();
  if (!normalized) return "";

  for (const def of POPULAR_LANGUAGES) {
    if (def.id === normalized || def.aliases?.includes(normalized)) {
      return def.id;
    }
  }

  if (hljs.getLanguage(normalized)) {
    return normalized;
  }

  return normalized;
};

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbersDefault?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "",
  showLineNumbersDefault = true,
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(
    showLineNumbersDefault,
  );
  const [wrapLines, setWrapLines] = useState(false);
  const [userSelectedLang, setUserSelectedLang] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const cleanCode = useMemo(() => (code || "").trim(), [code]);

  const explicitLang = useMemo(() => {
    const resolved = resolveLanguageId(language);
    if (
      resolved === "text" ||
      resolved === "plaintext" ||
      resolved === "txt" ||
      !resolved
    ) {
      return "";
    }
    return resolved;
  }, [language]);

  const activeMode = useMemo(() => {
    if (userSelectedLang === "auto") return "auto";
    if (userSelectedLang) return "manual";
    if (explicitLang) return "explicit";
    return "auto";
  }, [userSelectedLang, explicitLang]);

  const effectiveLangKey = useMemo(() => {
    if (activeMode === "manual" && userSelectedLang) {
      return userSelectedLang;
    }
    if (activeMode === "explicit" && explicitLang) {
      return explicitLang;
    }
    return "";
  }, [activeMode, userSelectedLang, explicitLang]);

  const highlightResult = useMemo(() => {
    if (!cleanCode) {
      return { html: "", detectedLang: "plaintext", isAuto: false };
    }

    if (activeMode === "auto" || !effectiveLangKey) {
      try {
        const topResult = hljs.highlightAuto(cleanCode, TOP_AUTO_LANGUAGES);
        if (topResult.relevance >= 3 && topResult.language) {
          return {
            html: topResult.value,
            detectedLang: topResult.language,
            isAuto: true,
          };
        }
        const fullResult = hljs.highlightAuto(cleanCode);
        return {
          html: fullResult.value,
          detectedLang: fullResult.language || "plaintext",
          isAuto: true,
        };
      } catch {
        return {
          html: cleanCode,
          detectedLang: "plaintext",
          isAuto: true,
        };
      }
    }

    try {
      const isRegistered = Boolean(hljs.getLanguage(effectiveLangKey));
      if (isRegistered) {
        const res = hljs.highlight(cleanCode, {
          language: effectiveLangKey,
          ignoreIllegals: true,
        });
        return {
          html: res.value,
          detectedLang: effectiveLangKey,
          isAuto: false,
        };
      }
      const autoRes = hljs.highlightAuto(cleanCode);
      return {
        html: autoRes.value,
        detectedLang: autoRes.language || effectiveLangKey,
        isAuto: false,
      };
    } catch {
      return {
        html: cleanCode,
        detectedLang: effectiveLangKey || "plaintext",
        isAuto: false,
      };
    }
  }, [cleanCode, activeMode, effectiveLangKey]);

  const currentLangDefinition = useMemo(() => {
    const target = highlightResult.detectedLang;
    return (
      POPULAR_LANGUAGES.find(
        (l) => l.id === target || l.aliases?.includes(target),
      ) || {
        id: target,
        name: target.charAt(0).toUpperCase() + target.slice(1),
      }
    );
  }, [highlightResult.detectedLang]);

  const filteredLanguages = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return POPULAR_LANGUAGES;
    return POPULAR_LANGUAGES.filter((item) => {
      if (item.name.toLowerCase().includes(q)) return true;
      if (item.id.toLowerCase().includes(q)) return true;
      if (item.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [searchQuery]);

  const highlightedLines = useMemo(() => {
    return splitHighlightedLines(highlightResult.html);
  }, [highlightResult.html]);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenPicker = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setSearchQuery("");
  };

  const handleClosePicker = () => {
    setAnchorEl(null);
  };

  const handleSelectLanguage = (langId: string) => {
    setUserSelectedLang(langId);
    handleClosePicker();
  };

  return (
    <Box
      sx={{
        my: 2,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        borderRadius: "8px",
        border: `1px solid ${tokens.codeBorder}`,
        backgroundColor: tokens.codeBackground,
        overflow: "hidden",
        fontSize: "0.8125rem",
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        boxShadow:
          resolvedMode === "dark"
            ? "0 2px 8px rgba(0, 0, 0, 0.25)"
            : "0 1px 3px rgba(0, 0, 0, 0.04)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.25,
          py: 0.6,
          borderBottom: `1px solid ${tokens.codeBorder}`,
          backgroundColor: resolvedMode === "dark" ? "#141a24" : "#f4f6f8",
          minWidth: 0,
          maxWidth: "100%",
          boxSizing: "border-box",
        }}
      >
        <ButtonBase
          onClick={handleOpenPicker}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1,
            py: 0.4,
            borderRadius: "5px",
            color: tokens.textSecondary,
            transition: "all 0.15s ease",
            "&:hover": {
              backgroundColor: tokens.hover,
              color: tokens.textPrimary,
            },
          }}
        >
          <span
            style={{
              fontWeight: 600,
              fontSize: "0.75rem",
              letterSpacing: "0.02em",
            }}
          >
            {currentLangDefinition.name}
          </span>
          {highlightResult.isAuto && (
            <Box
              component="span"
              sx={{
                fontSize: "0.625rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                px: 0.6,
                py: 0.1,
                borderRadius: "3px",
                backgroundColor:
                  resolvedMode === "dark"
                    ? "rgba(56, 139, 253, 0.18)"
                    : "rgba(79, 70, 229, 0.12)",
                color: tokens.primary,
                display: "inline-flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <Sparkles size={10} />
              Auto
            </Box>
          )}
          <ChevronDown size={13} style={{ opacity: 0.7 }} />
        </ButtonBase>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title={wrapLines ? "Unwrap lines" : "Wrap lines"}>
            <IconButton
              size="small"
              onClick={() => setWrapLines(!wrapLines)}
              sx={{
                color: wrapLines ? tokens.primary : tokens.textSecondary,
                backgroundColor: wrapLines ? tokens.selected : "transparent",
              }}
            >
              <WrapText size={15} />
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
                backgroundColor: showLineNumbers
                  ? tokens.selected
                  : "transparent",
              }}
            >
              <ListOrdered size={15} />
            </IconButton>
          </Tooltip>

          <Tooltip title={copied ? "Copied!" : "Copy code"}>
            <IconButton
              size="small"
              onClick={handleCopy}
              sx={{
                color: copied ? tokens.success : tokens.textSecondary,
                backgroundColor: copied ? tokens.selected : "transparent",
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          p: 1.5,
          overflowX: wrapLines ? "hidden" : "auto",
          whiteSpace: wrapLines ? "pre-wrap" : "pre",
          wordBreak: wrapLines ? "break-word" : "normal",
          lineHeight: 1.6,
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          fontSize: "0.8125rem",
        }}
      >
        {showLineNumbers ? (
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              tableLayout: "auto",
            }}
          >
            <tbody>
              {highlightedLines.map((lineHtml, idx) => (
                <tr key={idx}>
                  <td
                    style={{
                      userSelect: "none",
                      WebkitUserSelect: "none",
                      MozUserSelect: "none",
                      textAlign: "right",
                      paddingRight: "16px",
                      color: tokens.textSecondary,
                      opacity: 0.45,
                      verticalAlign: "top",
                      width: "1%",
                      whiteSpace: "nowrap",
                      fontSize: "0.8125rem",
                      lineHeight: "inherit",
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td
                    style={{
                      verticalAlign: "top",
                      padding: 0,
                      whiteSpace: wrapLines ? "pre-wrap" : "pre",
                      wordBreak: wrapLines ? "break-word" : "normal",
                      lineHeight: "inherit",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: lineHtml || "&nbsp;",
                    }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <code
            className="hljs"
            style={{
              display: "block",
              fontFamily: "inherit",
              fontSize: "inherit",
              lineHeight: "inherit",
              whiteSpace: wrapLines ? "pre-wrap" : "pre",
              wordBreak: wrapLines ? "break-word" : "normal",
            }}
            dangerouslySetInnerHTML={{ __html: highlightResult.html }}
          />
        )}
      </Box>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePicker}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            width: 250,
            maxHeight: 360,
            borderRadius: "8px",
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            boxShadow:
              resolvedMode === "dark"
                ? "0 10px 30px rgba(0,0,0,0.6)"
                : "0 8px 24px rgba(0,0,0,0.12)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box sx={{ p: 1, borderBottom: `1px solid ${tokens.border}` }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1,
              py: 0.5,
              borderRadius: "5px",
              backgroundColor: tokens.surfaceSecondary,
              border: `1px solid ${tokens.border}`,
            }}
          >
            <Search
              size={14}
              style={{ color: tokens.textSecondary, flexShrink: 0 }}
            />
            <InputBase
              autoFocus
              placeholder="Search language..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{
                fontSize: "0.8125rem",
                color: tokens.textPrimary,
                width: "100%",
                "& input": { p: 0 },
              }}
            />
            {searchQuery && (
              <IconButton
                size="small"
                onClick={() => setSearchQuery("")}
                sx={{ p: 0.2 }}
              >
                <X size={12} />
              </IconButton>
            )}
          </Box>
        </Box>

        <Box sx={{ overflowY: "auto", flex: 1, py: 0.5 }}>
          {!searchQuery && (
            <MenuItem
              selected={userSelectedLang === "auto"}
              onClick={() => handleSelectLanguage("auto")}
              sx={{
                fontSize: "0.8125rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: 0.75,
                px: 1.5,
                borderRadius: "5px",
                mx: 0.5,
                color:
                  userSelectedLang === "auto"
                    ? tokens.primary
                    : tokens.textPrimary,
                fontWeight: userSelectedLang === "auto" ? 600 : 400,
                "&.Mui-selected": {
                  backgroundColor: tokens.selected,
                },
                "&:hover": {
                  backgroundColor: tokens.hover,
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Sparkles size={14} color={tokens.primary} />
                <span>Auto Detect</span>
              </Box>
              {userSelectedLang === "auto" && (
                <Check size={14} color={tokens.primary} />
              )}
            </MenuItem>
          )}

          {filteredLanguages.map((lang) => {
            const isSelected =
              userSelectedLang !== "auto" &&
              highlightResult.detectedLang.toLowerCase() ===
                lang.id.toLowerCase();

            return (
              <MenuItem
                key={lang.id}
                selected={isSelected}
                onClick={() => handleSelectLanguage(lang.id)}
                sx={{
                  fontSize: "0.8125rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 0.75,
                  px: 1.5,
                  borderRadius: "5px",
                  mx: 0.5,
                  color: isSelected ? tokens.primary : tokens.textPrimary,
                  fontWeight: isSelected ? 600 : 400,
                  "&.Mui-selected": {
                    backgroundColor: tokens.selected,
                  },
                  "&:hover": {
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                <span>{lang.name}</span>
                {isSelected && <Check size={14} color={tokens.primary} />}
              </MenuItem>
            );
          })}

          {filteredLanguages.length === 0 && (
            <Box
              sx={{
                py: 2,
                px: 1.5,
                textAlign: "center",
                color: tokens.textSecondary,
                fontSize: "0.75rem",
              }}
            >
              No matching languages
            </Box>
          )}
        </Box>
      </Popover>
    </Box>
  );
};
