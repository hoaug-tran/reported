import React from "react";
import { Box, Typography } from "@mui/material";
import {
  Info,
  Lightbulb,
  AlertCircle,
  AlertTriangle,
  OctagonAlert,
  LucideIcon,
} from "lucide-react";
import { GitHubAlertType } from "../../utils/markdownUtils";
import { useThemeContext } from "../../contexts/ThemeContext";

interface GitHubAlertProps {
  type: GitHubAlertType;
  title?: string;
  children: React.ReactNode;
}

const ALERT_CONFIG: Record<
  GitHubAlertType,
  {
    icon: LucideIcon;
    lightColor: string;
    darkColor: string;
    defaultTitle: string;
  }
> = {
  note: {
    icon: Info,
    lightColor: "#0969da",
    darkColor: "#58a6ff",
    defaultTitle: "Note",
  },
  tip: {
    icon: Lightbulb,
    lightColor: "#1a7f37",
    darkColor: "#3fb950",
    defaultTitle: "Tip",
  },
  important: {
    icon: AlertCircle,
    lightColor: "#8250df",
    darkColor: "#bc8cff",
    defaultTitle: "Important",
  },
  warning: {
    icon: AlertTriangle,
    lightColor: "#9a6700",
    darkColor: "#d29922",
    defaultTitle: "Warning",
  },
  caution: {
    icon: OctagonAlert,
    lightColor: "#cf222e",
    darkColor: "#f85149",
    defaultTitle: "Caution",
  },
};

export const GitHubAlert: React.FC<GitHubAlertProps> = ({
  type,
  title,
  children,
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const config = ALERT_CONFIG[type] || ALERT_CONFIG.note;
  const isDark = resolvedMode === "dark";
  const accentColor = isDark ? config.darkColor : config.lightColor;
  const IconComponent = config.icon;

  return (
    <Box
      sx={{
        my: 2,
        p: 2,
        borderRadius: "8px",
        borderLeft: `4px solid ${accentColor}`,
        borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
        backgroundColor: isDark
          ? `${accentColor}10`
          : `${accentColor}0a`,
        transition: "border-color 0.2s, background-color 0.2s",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 0.75,
          color: accentColor,
        }}
      >
        <IconComponent size={18} style={{ flexShrink: 0 }} />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            fontSize: "0.85rem",
            color: accentColor,
            textTransform: "capitalize",
            letterSpacing: "0.02em",
          }}
        >
          {title || config.defaultTitle}
        </Typography>
      </Box>
      <Box
        sx={{
          color: tokens.textPrimary,
          fontSize: "0.875rem",
          lineHeight: 1.65,
          "& p": { m: 0, mb: 1, "&:last-child": { mb: 0 } },
          "& a": {
            color: tokens.primary,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          },
          "& code": {
            px: 0.6,
            py: 0.15,
            borderRadius: "4px",
            backgroundColor: tokens.surfaceSecondary,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: "0.8125rem",
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
