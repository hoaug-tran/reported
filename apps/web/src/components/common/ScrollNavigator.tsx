import React, { useState, useEffect } from "react";
import { Box, IconButton, Tooltip, Zoom } from "@mui/material";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useScrollContext } from "../../contexts/ScrollContext";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useI18n } from "../../contexts/I18nContext";

export const ScrollNavigator: React.FC = () => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const { scrollContainerRef, scrollToTop, scrollToBottom, canScroll } = useScrollContext();
  const [direction, setDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      const ratio = el.scrollTop / maxScroll;
      if (ratio > 0.5) {
        setDirection("up");
      } else if (ratio < 0.35) {
        setDirection("down");
      }
    };

    handleScroll();
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef]);

  const isVi = language === "vi";
  const isUp = direction === "up";
  const label = isUp
    ? (isVi ? "Lên đầu trang" : "Scroll to top")
    : (isVi ? "Xuống cuối trang" : "Scroll to bottom");

  const handleClick = () => {
    if (isUp) {
      scrollToTop("smooth");
    } else {
      scrollToBottom("smooth");
    }
  };

  return (
    <Zoom in={canScroll} unmountOnExit>
      <Box
        sx={{
          position: "fixed",
          right: { xs: 14, sm: 20, md: 24 },
          bottom: { xs: 20, sm: 28 },
          zIndex: 1100,
        }}
      >
        <Tooltip title={label} placement="left" arrow>
          <IconButton
            onClick={handleClick}
            aria-label={label}
            sx={{
              width: { xs: 38, sm: 42 },
              height: { xs: 38, sm: 42 },
              borderRadius: "50%",
              backgroundColor: tokens.surface,
              border: `1px solid ${tokens.border}`,
              backdropFilter: "blur(12px)",
              color: tokens.textPrimary,
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.14), 0 2px 5px rgba(0, 0, 0, 0.08)",
              transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, background-color 0.2s ease",
              "&:hover": {
                backgroundColor: tokens.hover,
                transform: "scale(1.08)",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2), 0 3px 8px rgba(0, 0, 0, 0.1)",
              },
              "&:active": {
                transform: "scale(0.95)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.25s ease, opacity 0.2s ease",
              }}
            >
              {isUp ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </Box>
          </IconButton>
        </Tooltip>
      </Box>
    </Zoom>
  );
};
