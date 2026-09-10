import React, { useState, useEffect, useRef } from "react";
import { Box, IconButton, Tooltip, Typography, Fade } from "@mui/material";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Download,
} from "lucide-react";

interface MediaLightboxProps {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  open,
  src,
  alt = "Image Preview",
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (open) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    }
  }, [open, src]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
      if (e.key === "0") handleReset();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = alt || "image.png";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!open) return null;

  return (
    <Fade in={open}>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
          backgroundColor: "rgba(10, 14, 20, 0.92)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          overflow: "hidden",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Box
          sx={{
            position: "absolute",
            top: 20,
            left: 24,
            right: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255, 255, 255, 0.8)",
              fontWeight: 600,
              maxWidth: "60%",
            }}
            noWrap
          >
            {alt}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(8px)",
              px: 1.5,
              py: 0.6,
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <Tooltip title="Thu nhỏ (-)">
              <IconButton
                size="small"
                onClick={handleZoomOut}
                sx={{ color: "#fff" }}
              >
                <ZoomOut size={17} />
              </IconButton>
            </Tooltip>

            <Typography
              variant="caption"
              sx={{
                color: "#fff",
                fontWeight: 600,
                minWidth: 40,
                textAlign: "center",
              }}
            >
              {Math.round(scale * 100)}%
            </Typography>

            <Tooltip title="Phóng to (+)">
              <IconButton
                size="small"
                onClick={handleZoomIn}
                sx={{ color: "#fff" }}
              >
                <ZoomIn size={17} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Xoay 90°">
              <IconButton
                size="small"
                onClick={handleRotate}
                sx={{ color: "#fff" }}
              >
                <RotateCw size={17} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Đặt lại (0)">
              <IconButton
                size="small"
                onClick={handleReset}
                sx={{ color: "#fff" }}
              >
                <RotateCcw size={17} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Tải ảnh về">
              <IconButton
                size="small"
                onClick={handleDownload}
                sx={{ color: "#fff" }}
              >
                <Download size={17} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Đóng (Esc)">
              <IconButton
                size="small"
                onClick={onClose}
                sx={{ color: "#fff", ml: 0.5 }}
              >
                <X size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box
          sx={{
            flex: 1,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          onMouseDown={handleMouseDown}
        >
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              objectFit: "contain",
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transition: isDragging ? "none" : "transform 0.15s ease-out",
              boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
              borderRadius: "4px",
              pointerEvents: "auto",
            }}
            draggable={false}
          />
        </Box>
      </Box>
    </Fade>
  );
};
