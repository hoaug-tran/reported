import React from "react";
import { Box, Typography } from "@mui/material";
import { useThemeContext } from "../../contexts/ThemeContext";

interface BrandLogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  showIcon?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "medium",
  showText = true,
  showIcon = false,
}) => {
  const { resolvedMode, tokens } = useThemeContext();

  const fontSizes = {
    small: "1.45rem",
    medium: "2.05rem",
    large: "2.85rem",
  };

  const isDark = resolvedMode === "dark";

  return (
    <Box sx={{ display: "flex", alignItems: "center", userSelect: "none" }}>
      {showText ? (
        <Box
          sx={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "flex-start",
            position: "relative",
            cursor: "pointer",
            px: 0.5,
            py: 0.2,
          }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: '"Kaushan Script", "Permanent Marker", cursive',
              fontSize: fontSizes[size],
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "0.015em",
              color: isDark ? "#ffffff" : "#0f172a",
              textShadow: isDark
                ? "0 2px 12px rgba(255, 255, 255, 0.15)"
                : "0 2px 8px rgba(15, 23, 42, 0.12)",
              transform: "rotate(-2.5deg)",
              display: "inline-block",
              whiteSpace: "nowrap",
            }}
          >
            Reported
          </Typography>
          <Box
            component="svg"
            viewBox="0 0 160 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            sx={{
              width: size === "large" ? 140 : size === "medium" ? 105 : 75,
              height: "auto",
              mt: -0.2,
              ml: 0.5,
              opacity: 0.9,
              transform: "rotate(-2.5deg)",
            }}
          >
            <path
              d="M3 8.5C35 4.5 90 3.5 157 7.5C125 10 70 11.5 3 8.5Z"
              fill={tokens.primary}
            />
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "8px",
            background: `linear-gradient(135deg, ${tokens.primary}, ${tokens.primaryHover})`,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: '"Kaushan Script", "Permanent Marker", cursive',
            fontWeight: 700,
            fontSize: "1.45rem",
            boxShadow: `0 2px 8px ${tokens.primaryGlow}`,
            userSelect: "none",
          }}
        >
          R
        </Box>
      )}
    </Box>
  );
};
