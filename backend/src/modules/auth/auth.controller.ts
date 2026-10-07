import type { Request, Response } from "express";

import {
  loginSchema,
  registerSchema,
} from "./auth.validation.js";

import {
    getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "./auth.service.js";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

export async function register(
  req: Request,
  res: Response
) {
  try {
    const payload = registerSchema.parse(req.body);

    const user = await registerUser(payload);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: user,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Registration failed",
    });
  }
}

export async function login(
  req: Request,
  res: Response
) {
  try {
    console.log("Content-Type:", req.headers["content-type"]);
    console.log("Request body:", req.body);

    const payload = loginSchema.parse(req.body);

    const result = await loginUser(payload);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(401).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Login failed",
    });
  }
}


export async function refresh(
  req: Request,
  res: Response
) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    if (typeof refreshToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Refresh token must be a string",
      });
    }

    const result = await refreshAccessToken(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    return res.status(401).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to refresh token",
    });
  }
}

export async function logout(
  req: Request,
  res: Response
) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    if (typeof refreshToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Refresh token must be a string",
      });
    }

    await logoutUser(refreshToken);

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Logout failed",
    });
  }
}


export async function me(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await getCurrentUser(req.user.userId);

    return res.status(200).json({
      success: true,
      message: "Current user fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(404).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "User not found",
    });
  }
}