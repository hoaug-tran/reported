import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { DB_ERROR_CODES, MESSAGES } from "../config/constants.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  try {
    if (err instanceof Error) {
      console.error(
        `[API Error] ${err.name}: ${err.message}\n${err.stack || ""}`,
      );
    } else {
      console.error("[API Error]", String(err));
    }
  } catch {
    console.error("[API Error] (Unserializable error occurred)");
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: MESSAGES.validationError,
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      },
    });
  }

  const pgError = err as { code?: string; detail?: string; message?: string };
  if (pgError?.code === DB_ERROR_CODES.invalidIdentifier) {
    return res.status(400).json({
      error: {
        code: "INVALID_IDENTIFIER",
        message: MESSAGES.invalidIdentifier,
      },
    });
  }
  if (pgError?.code === DB_ERROR_CODES.uniqueViolation) {
    return res.status(409).json({
      error: {
        code: "CONFLICT",
        message: MESSAGES.conflict,
      },
    });
  }
  if (pgError?.code === DB_ERROR_CODES.foreignKeyViolation) {
    return res.status(404).json({
      error: {
        code: "FOREIGN_KEY_VIOLATION",
        message: MESSAGES.foreignKeyViolation,
      },
    });
  }

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        process.env.NODE_ENV === "production"
          ? MESSAGES.internalError
          : err instanceof Error
            ? err.message
            : "Lỗi máy chủ nội bộ",
    },
  });
};
