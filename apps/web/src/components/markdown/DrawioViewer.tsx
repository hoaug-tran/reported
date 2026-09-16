import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  CircularProgress,
  Dialog,
  Button,
  Select,
  MenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Divider,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Maximize,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileCode,
  Image as ImageIcon,
  Layers,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useThemeContext } from "../../contexts/ThemeContext";
import {
  extractDrawioPages,
  exportCurrentPageSvg,
  exportCurrentPagePng,
  exportCurrentPageDrawio,
  exportFullDrawio,
  sanitizeFilename,
} from "../../utils/drawioExport";

interface DrawioViewerProps {
  xml?: string;
  url?: string;
  filename?: string;
  height?: number | string | Record<string, any>;
  onClose?: () => void;
}

let scriptLoadPromise: Promise<void> | null = null;

function loadViewerScript(): Promise<void> {
  if (typeof window !== "undefined" && (window as any).GraphViewer) {
    return Promise.resolve();
  }

  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="/vendor/drawio/viewer-static.min.js"]');
      if (existing) {
        if ((window as any).GraphViewer) {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", (e) => reject(e));
        return;
      }

      const script = document.createElement("script");
      script.src = "/vendor/drawio/viewer-static.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
  }

  return scriptLoadPromise;
}

export const DrawioViewer: React.FC<DrawioViewerProps> = ({
  xml: directXml,
  url,
  filename = "diagram.drawio",
  height,
  onClose,
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rawXml, setRawXml] = useState<string>(directXml || "");
  const [pages, setPages] = useState<Array<{ index: number; id: string; name: string }>>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [exportAnchorEl, setExportAnchorEl] = useState<HTMLElement | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const baseFilename = filename.replace(/\.drawio(\.xml)?$/i, "");
  const currentPageName = pages[currentPageIndex]?.name || `Trang ${currentPageIndex + 1}`;
  const effectiveHeight = onClose ? "100%" : (height || { xs: 450, sm: 580, md: 680 });

  const fetchXml = useCallback(async () => {
    if (directXml) {
      setRawXml(directXml);
      return directXml;
    }
    if (!url) {
      throw new Error("Không có đường dẫn tệp hoặc nội dung XML.");
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Tải tệp thất bại: HTTP ${response.status}`);
    }
    const text = await response.text();
    setRawXml(text);
    return text;
  }, [directXml, url]);

  const initViewer = useCallback(
    async (xmlContent: string) => {
      if (!containerRef.current) return;

      setLoading(true);
      setError(null);

      try {
        await loadViewerScript();

        const extracted = extractDrawioPages(xmlContent);
        setPages(extracted);

        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, "application/xml");

        if (doc.querySelector("parsererror")) {
          throw new Error("Tệp Draw.io XML không hợp lệ hoặc bị lỗi cấu trúc.");
        }

        containerRef.current.innerHTML = "";

        const config: Record<string, any> = {
          highlight: "#3b82f6",
          nav: true,
          resize: false,
          "auto-fit": true,
          "auto-origin": false,
          page: 0,
          "dark-mode": resolvedMode === "dark",
          lightbox: false,
        };

        const viewer = new (window as any).GraphViewer(
          containerRef.current,
          doc.documentElement,
          config,
        );

        if (containerRef.current) {
          containerRef.current.style.width = "100%";
          containerRef.current.style.height = "100%";
        }

        if (viewer?.graph) {
          viewer.graph.resizeContainer = false;
          viewer.graph.centerZoom = true;
          viewer.graph.setPanning(false);
          viewer.graph.useScrollbarsForPanning = false;
          viewer.crop = () => {};
          viewer.fitGraph = () => {};
          viewer.autoCrop = false;
          viewer.autoOrigin = false;
          setTimeout(() => {
            if (viewer.graph && containerRef.current) {
              containerRef.current.style.width = "100%";
              containerRef.current.style.height = "100%";
              viewer.graph.sizeDidChange();
              viewer.graph.fit(20);
              viewer.graph.center(true, true);
              if (viewer.graph.view) {
                setZoomScale(viewer.graph.view.scale || 1);
              }
            }
          }, 50);
        }

        viewerRef.current = viewer;
        setCurrentPageIndex(0);

        if (viewer?.graph?.view) {
          setZoomScale(viewer.graph.view.scale || 1);
        }
      } catch (err: any) {
        setError(err.message || "Không thể khởi tạo bộ xem sơ đồ Draw.io");
      } finally {
        setLoading(false);
      }
    },
    [resolvedMode],
  );

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const content = await fetchXml();
        if (isMounted && content) {
          await initViewer(content);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Lỗi tải sơ đồ");
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [fetchXml, initViewer]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (viewerRef.current?.graph && containerRef.current) {
      containerRef.current.style.width = "100%";
      containerRef.current.style.height = "100%";
      const timer = setTimeout(() => {
        if (viewerRef.current?.graph) {
          viewerRef.current.graph.sizeDidChange();
          viewerRef.current.graph.fit(20);
          viewerRef.current.graph.center(true, true);
          if (viewerRef.current.graph.view) {
            setZoomScale(viewerRef.current.graph.view.scale || 1);
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen]);

  const isFullView = isFullscreen || Boolean(onClose);
  const isFullViewRef = useRef(isFullView);
  useEffect(() => {
    isFullViewRef.current = isFullView;
  }, [isFullView]);

  const zoomToScale = useCallback(
    (targetScale: number, focalPoint?: { x: number; y: number }) => {
      const graph = viewerRef.current?.graph;
      const container = containerRef.current;
      if (!graph || !container) return;

      const currentScale = graph.view.scale || 1;
      const nextScale = Math.max(0.1, Math.min(6, Math.round(targetScale * 100) / 100));
      if (Math.abs(nextScale - currentScale) < 0.005) return;

      const rect = container.getBoundingClientRect();
      const cx = focalPoint ? focalPoint.x - rect.left : rect.width / 2;
      const cy = focalPoint ? focalPoint.y - rect.top : rect.height / 2;

      const curTranslate = graph.view.translate;
      const newTx = curTranslate.x + (cx / nextScale - cx / currentScale);
      const newTy = curTranslate.y + (cy / nextScale - cy / currentScale);

      graph.view.scaleAndTranslate(nextScale, newTx, newTy);
      setZoomScale(nextScale);
    },
    [],
  );

  const handleZoomIn = () => {
    const current = viewerRef.current?.graph?.view?.scale || zoomScale;
    zoomToScale(current * 1.25);
  };

  const handleZoomOut = () => {
    const current = viewerRef.current?.graph?.view?.scale || zoomScale;
    zoomToScale(current / 1.25);
  };

  const handleResetZoom = () => {
    const graph = viewerRef.current?.graph;
    const container = containerRef.current;
    if (!graph || !container) return;
    graph.view.scale = 1;
    graph.view.revalidate();
    graph.sizeDidChange();
    graph.center(true, true);
    setZoomScale(1);
  };

  const handleFit = useCallback(() => {
    const graph = viewerRef.current?.graph;
    const container = containerRef.current;
    if (!graph || !container) return;
    container.style.width = "100%";
    container.style.height = "100%";
    graph.sizeDidChange();
    graph.fit(20);
    graph.center(true, true);
    setZoomScale(graph.view.scale || 1);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let isDown = false;
    let startClientX = 0;
    let startClientY = 0;
    let initialTranslateX = 0;
    let initialTranslateY = 0;
    let initialScale = 1;
    let activePointerId: number | null = null;
    let rafId: number | null = null;
    let hasMoved = false;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (!viewerRef.current?.graph?.view) return;

      e.preventDefault();
      e.stopPropagation();

      const graph = viewerRef.current.graph;
      isDown = true;
      hasMoved = false;
      startClientX = e.clientX;
      startClientY = e.clientY;

      initialTranslateX = graph.view.translate?.x || 0;
      initialTranslateY = graph.view.translate?.y || 0;
      initialScale = graph.view.scale || 1;

      activePointerId = e.pointerId;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}

      el.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
      window.getSelection()?.removeAllRanges();
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDown || !viewerRef.current?.graph?.view) return;

      e.preventDefault();
      e.stopPropagation();

      const dx = e.clientX - startClientX;
      const dy = e.clientY - startClientY;

      if (!hasMoved && Math.hypot(dx, dy) > 2) {
        hasMoved = true;
      }

      if (hasMoved) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
        rafId = requestAnimationFrame(() => {
          if (!isDown || !viewerRef.current?.graph?.view) return;
          const targetX = initialTranslateX + dx / initialScale;
          const targetY = initialTranslateY + dy / initialScale;
          viewerRef.current.graph.view.setTranslate(targetX, targetY);
        });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDown) return;
      isDown = false;
      el.style.cursor = "grab";
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      window.getSelection()?.removeAllRanges();

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }

      if (activePointerId !== null) {
        try {
          el.releasePointerCapture(activePointerId);
        } catch {}
        activePointerId = null;
      }

      if (!viewerRef.current?.graph?.view) return;

      if (hasMoved) {
        const dx = e.clientX - startClientX;
        const dy = e.clientY - startClientY;
        const targetX = initialTranslateX + dx / initialScale;
        const targetY = initialTranslateY + dy / initialScale;
        viewerRef.current.graph.view.setTranslate(targetX, targetY);
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDblClick = (e: MouseEvent) => {
      e.preventDefault();
      handleFit();
    };

    const handleWheel = (e: WheelEvent) => {
      if (isFullViewRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const current = viewerRef.current?.graph?.view?.scale || 1;
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        zoomToScale(current * factor, { x: e.clientX, y: e.clientY });
      } else if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const current = viewerRef.current?.graph?.view?.scale || 1;
        const factor = e.deltaY < 0 ? 1.15 : 0.85;
        zoomToScale(current * factor, { x: e.clientX, y: e.clientY });
      }
    };

    let resizeTimer: any = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (viewerRef.current?.graph) {
          viewerRef.current.graph.sizeDidChange();
        }
      }, 150);
    };

    el.addEventListener("pointerdown", handlePointerDown);
    el.addEventListener("pointermove", handlePointerMove);
    el.addEventListener("pointerup", handlePointerUp);
    el.addEventListener("pointercancel", handlePointerUp);
    el.addEventListener("dragstart", handleDragStart);
    el.addEventListener("selectstart", handleSelectStart);
    el.addEventListener("dblclick", handleDblClick);
    el.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("resize", handleResize);

    return () => {
      el.removeEventListener("pointerdown", handlePointerDown);
      el.removeEventListener("pointermove", handlePointerMove);
      el.removeEventListener("pointerup", handlePointerUp);
      el.removeEventListener("pointercancel", handlePointerUp);
      el.removeEventListener("dragstart", handleDragStart);
      el.removeEventListener("selectstart", handleSelectStart);
      el.removeEventListener("dblclick", handleDblClick);
      el.removeEventListener("wheel", handleWheel);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [handleFit, zoomToScale]);

  const handleSelectPage = (targetIndex: number) => {
    if (!viewerRef.current || targetIndex < 0 || targetIndex >= pages.length) return;
    try {
      if (typeof viewerRef.current.selectPage === "function") {
        viewerRef.current.selectPage(targetIndex);
      }
      setCurrentPageIndex(targetIndex);
      setTimeout(() => {
        if (viewerRef.current?.graph && containerRef.current) {
          containerRef.current.style.width = "100%";
          containerRef.current.style.height = "100%";
          viewerRef.current.graph.sizeDidChange();
          viewerRef.current.graph.fit(20);
          viewerRef.current.graph.center(true, true);
          if (viewerRef.current.graph.view) {
            setZoomScale(viewerRef.current.graph.view.scale || 1);
          }
        }
      }, 50);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenExportMenu = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleCloseExportMenu = () => {
    setExportAnchorEl(null);
  };

  const handleExportSvg = async () => {
    handleCloseExportMenu();
    if (!viewerRef.current) return;
    setExporting(true);
    try {
      await exportCurrentPageSvg(viewerRef.current, baseFilename, currentPageName);
    } catch (err: any) {
      alert(err.message || "Lỗi khi xuất SVG");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPng = async () => {
    handleCloseExportMenu();
    if (!viewerRef.current) return;
    setExporting(true);
    try {
      await exportCurrentPagePng(viewerRef.current, baseFilename, currentPageName, 2);
    } catch (err: any) {
      alert(err.message || "Lỗi khi xuất PNG");
    } finally {
      setExporting(false);
    }
  };

  const handleExportCurrentDrawio = () => {
    handleCloseExportMenu();
    if (!rawXml) return;
    try {
      exportCurrentPageDrawio(rawXml, currentPageIndex, baseFilename, currentPageName);
    } catch (err: any) {
      alert(err.message || "Lỗi khi xuất Draw.io");
    }
  };

  const handleExportFullDrawio = () => {
    handleCloseExportMenu();
    if (!rawXml) return;
    try {
      exportFullDrawio(rawXml, baseFilename);
    } catch (err: any) {
      alert(err.message || "Lỗi khi tải file Draw.io");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: isFullscreen ? "100vw" : "100%",
        height: isFullscreen ? "100vh" : effectiveHeight,
        position: isFullscreen ? "fixed" : "relative",
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 0 : undefined,
        bottom: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : 1,
        backgroundColor: tokens.surface,
        border: isFullscreen ? "none" : `1px solid ${tokens.border}`,
        borderRadius: isFullscreen ? 0 : "2px",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "nowrap",
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          px: 1.5,
          py: 0.75,
          backgroundColor: tokens.surfaceHover,
          borderBottom: `1px solid ${tokens.border}`,
          gap: 1,
          zIndex: 10,
          "& .MuiIconButton-root": {
            flexShrink: 0,
            borderRadius: "2px",
          },
          "& .MuiButton-root": {
            flexShrink: 0,
            borderRadius: "2px",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0, flexShrink: 0 }}>
          <FileCode size={18} color={tokens.primary} style={{ flexShrink: 0 }} />
          <Typography
            variant="subtitle2"
            component="span"
            noWrap
            sx={{
              fontWeight: 600,
              maxWidth: { xs: 140, sm: 260 },
              color: tokens.textPrimary,
              fontSize: "0.85rem",
            }}
          >
            {filename}
          </Typography>

          {pages.length > 1 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1, flexShrink: 0 }}>
              <Tooltip title="Trang trước">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleSelectPage(currentPageIndex - 1)}
                    disabled={currentPageIndex <= 0}
                    sx={{ color: tokens.textPrimary, p: 0.5, borderRadius: "2px" }}
                  >
                    <ChevronLeft size={16} />
                  </IconButton>
                </span>
              </Tooltip>

              <Select
                size="small"
                value={currentPageIndex}
                onChange={(e) => handleSelectPage(Number(e.target.value))}
                renderValue={(val) => {
                  const pName = pages.find((p) => p.index === val)?.name || `Trang ${Number(val) + 1}`;
                  return (
                    <Box
                      component="span"
                      sx={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        width: "100%",
                      }}
                    >
                      {pName}
                    </Box>
                  );
                }}
                sx={{
                  height: 28,
                  fontSize: "0.78rem",
                  color: tokens.textPrimary,
                  backgroundColor: tokens.surface,
                  borderRadius: "2px",
                  width: { xs: 135, sm: 190, md: 215 },
                  flexShrink: 0,
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: tokens.border,
                    borderRadius: "2px",
                  },
                  "& .MuiSelect-select": {
                    py: 0.25,
                    px: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                  },
                }}
              >
                {pages.map((p) => (
                  <MenuItem
                    key={p.id}
                    value={p.index}
                    sx={{
                      fontSize: "0.8rem",
                      borderRadius: "2px",
                      maxWidth: 340,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.name}
                  </MenuItem>
                ))}
              </Select>

              <Tooltip title="Trang sau">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => handleSelectPage(currentPageIndex + 1)}
                    disabled={currentPageIndex >= pages.length - 1}
                    sx={{ color: tokens.textPrimary, p: 0.5, borderRadius: "2px" }}
                  >
                    <ChevronRight size={16} />
                  </IconButton>
                </span>
              </Tooltip>

              <Typography
                variant="caption"
                component="span"
                sx={{ color: tokens.textMuted, ml: 0.5, fontWeight: 500, flexShrink: 0 }}
              >
                {currentPageIndex + 1}/{pages.length}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Thu nhỏ">
            <IconButton size="small" onClick={handleZoomOut} sx={{ color: tokens.textPrimary, borderRadius: "2px" }}>
              <ZoomOut size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Đặt lại 100%">
            <Button
              size="small"
              onClick={handleResetZoom}
              sx={{
                minWidth: 46,
                height: 26,
                fontSize: "0.72rem",
                color: tokens.textPrimary,
                borderRadius: "2px",
                px: 0.5,
              }}
            >
              {Math.round(zoomScale * 100)}%
            </Button>
          </Tooltip>

          <Tooltip title="Phóng to">
            <IconButton size="small" onClick={handleZoomIn} sx={{ color: tokens.textPrimary, borderRadius: "2px" }}>
              <ZoomIn size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Vừa khung nhìn">
            <IconButton size="small" onClick={handleFit} sx={{ color: tokens.textPrimary, borderRadius: "2px" }}>
              <Maximize size={16} />
            </IconButton>
          </Tooltip>

          <Button
            size="small"
            variant="outlined"
            onClick={handleOpenExportMenu}
            disabled={exporting || loading}
            startIcon={
              exporting ? (
                <CircularProgress size={13} color="inherit" />
              ) : (
                <Download size={14} />
              )
            }
            endIcon={<ChevronDown size={14} />}
            sx={{
              height: 28,
              fontSize: "0.75rem",
              textTransform: "none",
              ml: 0.5,
              borderRadius: "2px",
              borderColor: tokens.border,
              color: tokens.textPrimary,
              "&:hover": {
                borderColor: tokens.primary,
                backgroundColor: tokens.surfaceHover,
              },
            }}
          >
            Tải về
          </Button>

          {!onClose && (
            <Tooltip title={isFullscreen ? "Thu nhỏ cửa sổ (Esc)" : "Toàn màn hình"}>
              <IconButton
                size="small"
                onClick={() => setIsFullscreen(!isFullscreen)}
                sx={{ color: tokens.textPrimary, ml: 0.5, borderRadius: "2px" }}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </IconButton>
            </Tooltip>
          )}

          {onClose && (
            <Tooltip title="Đóng">
              <IconButton size="small" onClick={onClose} sx={{ color: tokens.textPrimary, ml: 0.5, borderRadius: "2px" }}>
                <X size={16} />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          width: "100%",
          position: "relative",
          overflow: "hidden",
          backgroundColor: resolvedMode === "dark" ? "#18181b" : "#f8fafc",
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {loading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                resolvedMode === "dark" ? "rgba(24,24,27,0.85)" : "rgba(248,250,252,0.85)",
              zIndex: 5,
              gap: 1.5,
            }}
          >
            <CircularProgress size={36} sx={{ color: tokens.primary }} />
            <Typography variant="body2" component="span" sx={{ color: tokens.textMuted }}>
              Đang tải sơ đồ Draw.io...
            </Typography>
          </Box>
        )}

        {error && (
          <Box
            sx={{
              p: 3,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              maxWidth: 420,
              position: "absolute",
              inset: 0,
              margin: "auto",
              height: "fit-content",
            }}
          >
            <AlertCircle size={32} color="#ef4444" />
            <Typography variant="subtitle2" component="span" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
              Không thể hiển thị sơ đồ
            </Typography>
            <Typography variant="body2" component="span" sx={{ color: tokens.textMuted }}>
              {error}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshCw size={14} />}
              onClick={() => {
                if (rawXml) initViewer(rawXml);
              }}
              sx={{ mt: 1, borderRadius: "2px" }}
            >
              Thử lại
            </Button>
          </Box>
        )}

        <Box
          ref={containerRef}
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: error ? "none" : "block",
            cursor: "grab",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
            "&:active": {
              cursor: "grabbing",
            },
            "& svg": {
              maxWidth: "none !important",
              userSelect: "none",
              WebkitUserSelect: "none",
              pointerEvents: "none",
            },
            "& svg *": {
              userSelect: "none",
              WebkitUserSelect: "none",
              pointerEvents: "none",
            },
          }}
        />
      </Box>

      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={handleCloseExportMenu}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 240,
              borderRadius: "2px",
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              color: tokens.textPrimary,
            },
          },
        }}
      >
        <ListSubheader
          disableSticky
          sx={{
            lineHeight: "28px",
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            color: tokens.textMuted,
            backgroundColor: tokens.surface,
          }}
        >
          Trang hiện tại ({currentPageName})
        </ListSubheader>

        <MenuItem onClick={handleExportSvg} sx={{ borderRadius: "2px" }}>
          <ListItemIcon sx={{ color: tokens.textPrimary }}>
            <FileCode size={16} />
          </ListItemIcon>
          <ListItemText
            primary="Tải SVG (.svg)"
            secondary="Vector sắc nét vô cực"
            primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 500 }}
            secondaryTypographyProps={{ fontSize: "0.72rem", color: tokens.textMuted }}
          />
        </MenuItem>

        <MenuItem onClick={handleExportPng} sx={{ borderRadius: "2px" }}>
          <ListItemIcon sx={{ color: tokens.textPrimary }}>
            <ImageIcon size={16} />
          </ListItemIcon>
          <ListItemText
            primary="Tải PNG (.png)"
            secondary="Ảnh độ phân giải cao 2x"
            primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 500 }}
            secondaryTypographyProps={{ fontSize: "0.72rem", color: tokens.textMuted }}
          />
        </MenuItem>

        <MenuItem onClick={handleExportCurrentDrawio} sx={{ borderRadius: "2px" }}>
          <ListItemIcon sx={{ color: tokens.textPrimary }}>
            <Layers size={16} />
          </ListItemIcon>
          <ListItemText
            primary="Tải Draw.io (.drawio)"
            secondary="Chỉ riêng trang này"
            primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 500 }}
            secondaryTypographyProps={{ fontSize: "0.72rem", color: tokens.textMuted }}
          />
        </MenuItem>

        <Divider sx={{ my: 0.5, borderColor: tokens.border }} />

        <ListSubheader
          disableSticky
          sx={{
            lineHeight: "28px",
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            color: tokens.textMuted,
            backgroundColor: tokens.surface,
          }}
        >
          Toàn bộ sơ đồ ({pages.length} trang)
        </ListSubheader>

        <MenuItem onClick={handleExportFullDrawio} sx={{ borderRadius: "2px" }}>
          <ListItemIcon sx={{ color: tokens.textPrimary }}>
            <Download size={16} />
          </ListItemIcon>
          <ListItemText
            primary="Tải Draw.io gốc (.drawio)"
            secondary="Đầy đủ tất cả các trang"
            primaryTypographyProps={{ fontSize: "0.82rem", fontWeight: 500 }}
            secondaryTypographyProps={{ fontSize: "0.72rem", color: tokens.textMuted }}
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};
