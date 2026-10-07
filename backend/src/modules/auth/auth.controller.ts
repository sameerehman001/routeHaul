import type { Request, Response } from "express";

import {
  loginSchema,
  registerSchema,
} from "./auth.validation.js";

import {
  loginUser,
  registerUser,
} from "./auth.service.js";

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