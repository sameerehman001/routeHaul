import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../modules/auth/auth.jwt.js";
import prisma from "../config/page.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    role: string;
    sessionId: string;
  };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required",
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const payload = verifyAccessToken(token);

    if (
      !Number.isInteger(payload.userId) ||
      typeof payload.sessionId !== "string" ||
      !payload.sessionId
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid access token payload",
      });
    }

    const activeSession = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.userId,
        sessionId: payload.sessionId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!activeSession) {
      return res.status(401).json({
        success: false,
        message: "Session has expired or been revoked. Please log in again.",
      });
    }

    req.user = {
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
    };

    return next();
  } catch (error) {
    if (error instanceof Error) {
      console.error("Authentication error:", error.message);
    }

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}