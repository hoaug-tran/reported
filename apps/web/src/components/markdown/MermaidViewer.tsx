import React, { useState, useEffect, useId } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
} from "@mui/material";
import {
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Code2,
  Download,
} from "lucide-react";
import { useThemeContext } from "../../contexts/ThemeContext";

interface MermaidViewerProps {
  code: string;
}

let mermaidPromise: Promise<typeof import("mermaid")["default"]> | null = null;
function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}

function detectDiagramType(code: string): string {
  const trimmed = code.trim();
  const firstLine = trimmed.split("\n")[0]?.trim().toLowerCase() || "";

  if (firstLine.startsWith("graph") || firstLine.startsWith("flowchart")) return "Flowchart";
  if (firstLine.startsWith("sequencediagram")) return "Sequence Diagram";
  if (firstLine.startsWith("classdiagram")) return "Class Diagram";
  if (firstLine.startsWith("statediagram")) return "State Diagram";
  if (firstLine.startsWith("erdiagram")) return "ER Diagram";
  if (firstLine.startsWith("gantt")) return "Gantt Chart";
  if (firstLine.startsWith("journey")) return "User Journey";
  if (firstLine.startsWith("gitgraph")) return "Git Graph";
  if (firstLine.startsWith("pie")) return "Pie Chart";
  if (firstLine.startsWith("mindmap")) return "Mindmap";
  if (firstLine.startsWith("timeline")) return "Timeline";
  if (firstLine.startsWith("quadrantchart")) return "Quadrant Chart";
  if (firstLine.startsWith("c4")) return "C4 Diagram";
  if (firstLine.startsWith("sankey")) return "Sankey Diagram";
  return "Mermaid Diagram";
}

export const MermaidViewer: React.FC<MermaidViewerProps> = ({ code }) => {
  const { tokens, resolvedMode } = useThemeContext();
  const rawId = useId();
  const diagramId = `mermaid-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const [svgHtml, setSvgHtml] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSource, setShowSource] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const cleanCode = (code || "").trim();
  const diagramType = detectDiagramType(cleanCode);

  useEffect(() => {
    let isCancelled = false;

    async function renderDiagram() {
      if (!cleanCode) {
        setSvgHtml("");
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const mermaid = await getMermaid();

        if (isCancelled) return;

        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedMode === "dark" ? "dark" : "neutral",
          securityLevel: "strict",
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          themeVariables: {
            fontSize: "13px",
            darkMode: resolvedMode === "dark",
          },
        });

        const renderId = `${diagramId}-${Date.now().toString(36)}`;

        const existingEl = document.getElementById(renderId);
        if (existingEl) existingEl.remove();

        const { svg } = await mermaid.render(renderId, cleanCode);

        if (!isCancelled) {
          setSvgHtml(svg);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.warn("Mermaid render warning:", err);
          const errorMsg = err instanceof Error ? err.message : String(err);
          const errorEl = document.getElementById(`d${diagramId}`);
          if (errorEl) errorEl.remove();

          setError(errorMsg);
          setSvgHtml("");
          setLoading(false);
        }
      }
    }

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [cleanCode, resolvedMode, diagramId]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySvg = () => {
    if (!svgHtml) return;
    navigator.clipboard.writeText(svgHtml);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoom(1);

  if (error) {
    return (
      <Box
        sx={{
          my: 2,
          borderRadius: "8px",
          border: `1px solid ${tokens.error}`,
          backgroundColor: "rgba(248, 81, 73, 0.06)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1,
            backgroundColor: "rgba(248, 81, 73, 0.1)",
            borderBottom: `1px solid ${tokens.error}30`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AlertTriangle size={18} color={tokens.error} />
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: tokens.error, textTransform: "uppercase" }}
            >
              {diagramType} Syntax Warning
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowSource((prev) => !prev)}
              startIcon={<Code2 size={14} />}
              sx={{ fontSize: "0.75rem", color: tokens.textSecondary, textTransform: "none" }}
            >
              {showSource ? "Ẩn mã nguồn" : "Xem mã nguồn"}
            </Button>
            <Tooltip title={copied ? "Đã chép!" : "Sao chép mã"}>
              <IconButton size="small" onClick={handleCopyCode} sx={{ color: tokens.textSecondary }}>
                {copied ? <Check size={15} color={tokens.success} /> : <Copy size={15} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          <Typography
            variant="body2"
            sx={{
              color: tokens.error,
              fontSize: "0.8125rem",
              fontFamily: '"JetBrains Mono", monospace',
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              mb: showSource ? 1.5 : 0,
            }}
          >
            {error}
          </Typography>

          {showSource && (
            <Box
              component="pre"
              sx={{
                p: 1.5,
                m: 0,
                borderRadius: "6px",
                backgroundColor: tokens.codeBackground,
                border: `1px solid ${tokens.codeBorder}`,
                color: tokens.textPrimary,
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: "0.8125rem",
                overflowX: "auto",
                lineHeight: 1.5,
              }}
            >
              <code>{cleanCode}</code>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box
        sx={{
          my: 2,
          borderRadius: "8px",
          border: `1px solid ${tokens.codeBorder}`,
          backgroundColor: tokens.codeBackground,
          overflow: "hidden",
          transition: "border-color 0.2s, box-shadow 0.2s",
          "&:hover": {
            borderColor: tokens.primary,
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 1.5,
            py: 0.6,
            borderBottom: `1px solid ${tokens.codeBorder}`,
            backgroundColor: resolvedMode === "dark" ? "#161b22" : "#f6f8fa",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: tokens.textSecondary,
                fontSize: "0.75rem",
              }}
            >
              {diagramType}
            </Typography>
            {loading && <CircularProgress size={12} thickness={5} sx={{ color: tokens.primary }} />}
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip title="Thu nhỏ">
              <span>
                <IconButton
                  size="small"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.5 || loading}
                  sx={{ color: tokens.textSecondary, p: 0.5 }}
                >
                  <ZoomOut size={15} />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Đặt lại kích thước">
              <Button
                size="small"
                onClick={handleResetZoom}
                disabled={zoom === 1 || loading}
                sx={{
                  px: 0.75,
                  py: 0.2,
                  minWidth: 42,
                  fontSize: "0.75rem",
                  color: tokens.textSecondary,
                  textTransform: "none",
                  fontWeight: 600,
                }}
              >
                {Math.round(zoom * 100)}%
              </Button>
            </Tooltip>

            <Tooltip title="Phóng to">
              <span>
                <IconButton
                  size="small"
                  onClick={handleZoomIn}
                  disabled={zoom >= 2.5 || loading}
                  sx={{ color: tokens.textSecondary, p: 0.5 }}
                >
                  <ZoomIn size={15} />
                </IconButton>
              </span>
            </Tooltip>

            <Box sx={{ width: 1, height: 14, backgroundColor: tokens.divider, mx: 0.5 }} />

            <Tooltip title={showSource ? "Xem sơ đồ" : "Xem mã Mermaid"}>
              <IconButton
                size="small"
                onClick={() => setShowSource((prev) => !prev)}
                sx={{ color: showSource ? tokens.primary : tokens.textSecondary, p: 0.5 }}
              >
                <Code2 size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title={copiedSvg ? "Đã chép SVG!" : "Sao chép mã SVG"}>
              <IconButton
                size="small"
                onClick={handleCopySvg}
                disabled={!svgHtml || loading}
                sx={{ color: tokens.textSecondary, p: 0.5 }}
              >
                {copiedSvg ? <Check size={15} color={tokens.success} /> : <Download size={15} />}
              </IconButton>
            </Tooltip>

            <Tooltip title={copied ? "Đã chép!" : "Sao chép mã nguồn"}>
              <IconButton size="small" onClick={handleCopyCode} sx={{ color: tokens.textSecondary, p: 0.5 }}>
                {copied ? <Check size={15} color={tokens.success} /> : <Copy size={15} />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Xem toàn màn hình">
              <IconButton
                size="small"
                onClick={() => setIsFullscreen(true)}
                disabled={!svgHtml || loading}
                sx={{ color: tokens.textSecondary, p: 0.5 }}
              >
                <Maximize2 size={15} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {showSource ? (
          <Box
            component="pre"
            sx={{
              p: 2,
              m: 0,
              backgroundColor: tokens.codeBackground,
              color: tokens.textPrimary,
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              overflowX: "auto",
            }}
          >
            <code>{cleanCode}</code>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              overflow: "auto",
              maxHeight: 520,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 140,
              backgroundColor: resolvedMode === "dark" ? "#0d1117" : "#ffffff",
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 4, color: tokens.textSecondary }}>
                <CircularProgress size={20} />
                <Typography variant="caption">Đang dựng sơ đồ {diagramType}...</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "top center",
                  transition: "transform 0.15s ease-out",
                  display: "inline-block",
                  "& svg": {
                    maxWidth: "100%",
                    height: "auto",
                    display: "block",
                  },
                }}
                dangerouslySetInnerHTML={{ __html: svgHtml }}
              />
            )}
          </Box>
        )}
      </Box>

      <Dialog
        open={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{
          sx: {
            width: "95vw",
            height: "92vh",
            maxWidth: "none",
            backgroundColor: tokens.surface,
            borderRadius: "12px",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1.5,
            px: 3,
            borderBottom: `1px solid ${tokens.border}`,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem" }}>
            {diagramType} - Toàn màn hình
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tooltip title="Thu nhỏ">
              <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                <ZoomOut size={16} />
              </IconButton>
            </Tooltip>
            <Button size="small" onClick={handleResetZoom} sx={{ minWidth: 46 }}>
              {Math.round(zoom * 100)}%
            </Button>
            <Tooltip title="Phóng to">
              <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 2.5}>
                <ZoomIn size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Đóng toàn màn hình">
              <IconButton size="small" onClick={() => setIsFullscreen(false)}>
                <Minimize2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </DialogTitle>
        <DialogContent
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "auto",
            p: 4,
            backgroundColor: resolvedMode === "dark" ? "#0d1117" : "#ffffff",
          }}
        >
          <Box
            sx={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease-out",
              display: "inline-block",
              "& svg": {
                maxWidth: "100%",
                height: "auto",
                display: "block",
              },
            }}
            dangerouslySetInnerHTML={{ __html: svgHtml }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
