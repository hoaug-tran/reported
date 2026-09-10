import React from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import { ShieldOff, Home, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useThemeContext } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";

interface AccessDeniedPageProps {
  isDeleted?: boolean;
  message?: string;
  description?: string;
  showBackButton?: boolean;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  isDeleted = false,
  message,
  description,
  showBackButton = true,
}) => {
  const { tokens } = useThemeContext();
  const { t } = useI18n();
  const [, setLocation] = useLocation();

  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        py: 8,
        px: 3,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          backgroundColor: "rgba(248,81,73,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 3,
        }}
      >
        <ShieldOff size={40} color="#f85149" strokeWidth={1.5} />
      </Box>

      <Typography
        variant="h1"
        sx={{
          fontSize: "5rem",
          fontWeight: 800,
          color: tokens.textPrimary,
          lineHeight: 1,
          mb: 1,
          letterSpacing: "-0.04em",
          opacity: 0.15,
        }}
      >
        403
      </Typography>

      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: tokens.textPrimary, mb: 1 }}
      >
        {message || t("notAuthorized")}
      </Typography>

      <Typography
        variant="body1"
        sx={{
          color: tokens.textSecondary,
          mb: isDeleted ? 2 : 4,
          maxWidth: 480,
        }}
      >
        {description || t("notAuthorizedDesc")}
      </Typography>

      {isDeleted && (
        <Alert
          severity="warning"
          sx={{
            mb: 4,
            maxWidth: 480,
            borderRadius: "8px",
            backgroundColor: "rgba(210,153,34,0.1)",
            border: "1px solid rgba(210,153,34,0.3)",
            "& .MuiAlert-icon": { color: "#d2991e" },
          }}
        >
          {t("notAuthorizedDesc")}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 1.5 }}>
        {showBackButton && (
          <Button
            variant="outlined"
            startIcon={<ArrowLeft size={16} />}
            onClick={() => window.history.back()}
            sx={{ textTransform: "none", borderRadius: "8px" }}
          >
            {t("goBack")}
          </Button>
        )}
        <Button
          variant="contained"
          startIcon={<Home size={16} />}
          onClick={() => setLocation("/")}
          sx={{
            textTransform: "none",
            borderRadius: "8px",
            backgroundColor: tokens.primary,
            boxShadow: "none",
          }}
        >
          {t("backToDashboard")}
        </Button>
      </Box>
    </Box>
  );
};
