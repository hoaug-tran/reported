import { Request, Response, NextFunction } from "express";
import { db, sessions, users, eq, and, gt } from "@reported/database";
import { AppError } from "./error.js";
import { UserRole } from "@reported/contracts";

declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
      sessionToken?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.reported_session) {
      token = req.cookies.reported_session;
    }

    if (!token) {
      return next();
    }

    const sessionRecord = await db.query.sessions.findFirst({
      where: and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())),
      with: {},
    });

    if (!sessionRecord) {
      return next();
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, sessionRecord.userId),
    });

    if (user) {
      req.user = user;
      req.sessionToken = token;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    return next(
      new AppError(
        401,
        "UNAUTHORIZED",
        "Authentication required to access this resource",
      ),
    );
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      return next(
        new AppError(
          403,
          "FORBIDDEN",
          `Insufficient permissions. Allowed roles: ${allowedRoles.join(", ")}`,
        ),
      );
    }

    next();
  };
}
