
import type { NextFunction, Request, Response } from "express";

import type { AuthenticatedRequest } from "./auth.middleware.js";

import type { AuthUserRole } from "../modules/auth/auth.types.js";

export function requireRole(...allowedRoles: AuthUserRole[]) {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(authReq.user.role as AuthUserRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
    }

    next();
  };
}
