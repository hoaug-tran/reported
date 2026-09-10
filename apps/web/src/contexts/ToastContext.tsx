import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { Box, Typography, IconButton, Button } from "@mui/material";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { useThemeContext } from "./ThemeContext";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  message: React.ReactNode;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastItem extends ToastOptions {
  id: string;
  type: ToastType;
  createdAt: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string, type?: ToastType) => string;
  success: (
    message: React.ReactNode,
    title?: string,
    duration?: number,
  ) => string;
  error: (
    message: React.ReactNode,
    title?: string,
    duration?: number,
  ) => string;
  warning: (
    message: React.ReactNode,
    title?: string,
    duration?: number,
  ) => string;
  info: (message: React.ReactNode, title?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalToastHandler:
  ((options: ToastOptions | string, type?: ToastType) => string) | null = null;

export const toast = {
  show: (options: ToastOptions | string, type?: ToastType) =>
    globalToastHandler ? globalToastHandler(options, type) : "",
  success: (message: React.ReactNode, title?: string, duration?: number) =>
    globalToastHandler
      ? globalToastHandler({ message, title, type: "success", duration })
      : "",
  error: (message: React.ReactNode, title?: string, duration?: number) =>
    globalToastHandler
      ? globalToastHandler({ message, title, type: "error", duration })
      : "",
  warning: (message: React.ReactNode, title?: string, duration?: number) =>
    globalToastHandler
      ? globalToastHandler({ message, title, type: "warning", duration })
      : "",
  info: (message: React.ReactNode, title?: string, duration?: number) =>
    globalToastHandler
      ? globalToastHandler({ message, title, type: "info", duration })
      : "",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (options: ToastOptions | string, typeParam?: ToastType): string => {
      const id =
        typeof options === "object" && options.id
          ? options.id
          : `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const normalized: ToastItem =
        typeof options === "string"
          ? {
              id,
              message: options,
              type: typeParam || "info",
              duration: 4500,
              createdAt: Date.now(),
            }
          : {
              ...options,
              id,
              type: options.type || typeParam || "info",
              duration:
                options.duration !== undefined ? options.duration : 4500,
              createdAt: Date.now(),
            };

      setToasts((prev) => {
        const filtered = prev.filter((t) => t.id !== id);
        return [...filtered, normalized];
      });

      if (normalized.duration && normalized.duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, normalized.duration);
      }

      return id;
    },
    [dismiss],
  );

  const success = useCallback(
    (message: React.ReactNode, title?: string, duration?: number) => {
      return showToast({ message, title, type: "success", duration });
    },
    [showToast],
  );

  const error = useCallback(
    (message: React.ReactNode, title?: string, duration?: number) => {
      return showToast({ message, title, type: "error", duration });
    },
    [showToast],
  );

  const warning = useCallback(
    (message: React.ReactNode, title?: string, duration?: number) => {
      return showToast({ message, title, type: "warning", duration });
    },
    [showToast],
  );

  const info = useCallback(
    (message: React.ReactNode, title?: string, duration?: number) => {
      return showToast({ message, title, type: "info", duration });
    },
    [showToast],
  );

  useEffect(() => {
    globalToastHandler = showToast;
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastOptions>;
      if (customEvent.detail) {
        showToast(customEvent.detail);
      }
    };
    window.addEventListener("reported-toast", handleCustomToast);
    return () => {
      globalToastHandler = null;
      window.removeEventListener("reported-toast", handleCustomToast);
    };
  }, [showToast]);

  const getToastStyle = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle2 size={19} color={tokens.success} />,
          borderColor: `${tokens.success}40`,
          glowColor: tokens.successGlow,
          badgeColor: tokens.success,
        };
      case "error":
        return {
          icon: <AlertCircle size={19} color={tokens.error} />,
          borderColor: `${tokens.error}40`,
          glowColor: tokens.errorGlow,
          badgeColor: tokens.error,
        };
      case "warning":
        return {
          icon: <AlertTriangle size={19} color={tokens.warning} />,
          borderColor: `${tokens.warning}40`,
          glowColor: tokens.warningGlow,
          badgeColor: tokens.warning,
        };
      case "info":
      default:
        return {
          icon: <Info size={19} color={tokens.info} />,
          borderColor: `${tokens.info}40`,
          glowColor: "rgba(56, 139, 253, 0.15)",
          badgeColor: tokens.info,
        };
    }
  };

  const isDark = resolvedMode === "dark";

  return (
    <ToastContext.Provider
      value={{ showToast, success, error, warning, info, dismiss, clearAll }}
    >
      {children}
      <Box
        id="reported-toast-container"
        sx={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 99999,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          maxWidth: 400,
          width: "calc(100vw - 56px)",
          pointerEvents: "none",
          "@keyframes toastSlideIn": {
            "0%": {
              transform: "translateX(60px) translateY(10px) scale(0.96)",
              opacity: 0,
            },
            "100%": {
              transform: "translateX(0) translateY(0) scale(1)",
              opacity: 1,
            },
          },
        }}
      >
        {toasts.map((t) => {
          const style = getToastStyle(t.type);
          return (
            <Box
              key={t.id}
              sx={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                p: 1.8,
                borderRadius: "10px",
                backgroundColor: isDark
                  ? "rgba(18, 24, 36, 0.94)"
                  : "rgba(255, 255, 255, 0.96)",
                backdropFilter: "blur(16px)",
                border: `1px solid ${style.borderColor}`,
                boxShadow: isDark
                  ? `0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px ${style.glowColor}`
                  : `0 10px 25px rgba(0, 0, 0, 0.12), 0 0 10px ${style.glowColor}`,
                animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                transition: "all 0.2s ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 3.5,
                  backgroundColor: style.badgeColor,
                }}
              />

              <Box sx={{ flexShrink: 0, mt: 0.2 }}>{style.icon}</Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                {t.title && (
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.875rem",
                      color: tokens.textPrimary,
                      lineHeight: 1.3,
                      mb: 0.3,
                    }}
                  >
                    {t.title}
                  </Typography>
                )}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: "0.8125rem",
                    color: t.title ? tokens.textSecondary : tokens.textPrimary,
                    lineHeight: 1.45,
                    wordBreak: "break-word",
                  }}
                >
                  {t.message}
                </Typography>

                {t.action && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    sx={{
                      mt: 1,
                      py: 0.3,
                      px: 1.2,
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      textTransform: "none",
                      borderColor: style.borderColor,
                      color: style.badgeColor,
                    }}
                  >
                    {t.action.label}
                  </Button>
                )}
              </Box>

              <IconButton
                size="small"
                onClick={() => dismiss(t.id)}
                sx={{
                  p: 0.4,
                  mt: -0.4,
                  mr: -0.4,
                  color: tokens.textSecondary,
                  "&:hover": {
                    color: tokens.textPrimary,
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                <X size={15} />
              </IconButton>
            </Box>
          );
        })}
      </Box>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: toast.show,
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      dismiss: () => {},
      clearAll: () => {},
    };
  }
  return context;
};
