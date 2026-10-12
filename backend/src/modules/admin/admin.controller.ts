
import type { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import {
  approveUser,
  createAdmin,
  getPendingUsers,
  getUserForReview,
  listAdmins,
  listUsers,
  rejectUser,
} from "./admin.service.js";


function parseUserId(value: string | string[]): number | null {
  // A user ID should be a single string, not an array.
  if (typeof value !== "string") {
    return null;
  }

  const userId = Number(value);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}


function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}

function getErrorStatus(message: string): number {
  if (message.toLowerCase().includes("not found")) {
    return 404;
  }

  return 400;
}

export async function listPendingUsers(
  _req: Request,
  res: Response
) {
  try {
    const users = await getPendingUsers();

    return res.status(200).json({
      success: true,
      message: "Pending users fetched successfully",
      data: users,
    });
  } catch (error) {
    console.error("List pending users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending users",
    });
  }
}

export async function getUserDetails(
  req: Request,
  res: Response
) {
  const userId = parseUserId(req.params.userId);

  if (userId === null) {
    return res.status(400).json({
      success: false,
      message: "A valid user ID is required",
    });
  }

  try {
    const user = await getUserForReview(userId);

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: user,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    return res.status(getErrorStatus(message)).json({
      success: false,
      message,
    });
  }
}

export async function approveUserAccount(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = parseUserId(req.params.userId);

  if (userId === null) {
    return res.status(400).json({
      success: false,
      message: "A valid user ID is required",
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const user = await approveUser(userId, req.user);

    return res.status(200).json({
      success: true,
      message: "User approved successfully",
      data: user,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    return res.status(getErrorStatus(message)).json({
      success: false,
      message,
    });
  }
}

export async function rejectUserAccount(
  req: AuthenticatedRequest,
  res: Response
) {
  const userId = parseUserId(req.params.userId);

  if (userId === null) {
    return res.status(400).json({
      success: false,
      message: "A valid user ID is required",
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const body = req.body as { reason?: unknown } | undefined;
  const reason =
    typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!reason || reason.length < 5 || reason.length > 500) {
    return res.status(400).json({
      success: false,
      message: "Rejection reason must be between 5 and 500 characters",
    });
  }

  try {
    const user = await rejectUser(
      userId,
      req.user,
      reason
    );

    return res.status(200).json({
      success: true,
      message: "User rejected successfully",
      data: user,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    return res.status(getErrorStatus(message)).json({
      success: false,
      message,
    });
  }
}

const allowedRoles = ["DRIVER", "BROKER"] as const;

const allowedStatuses = [
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "SUSPENDED",
  "DEACTIVATED",
] as const;

function readQueryString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}


export async function listUsersController(
  req: Request,
  res: Response,
) {
  const rawPage = readQueryString(req.query.page) ?? "1";
  const rawLimit = readQueryString(req.query.limit) ?? "10";
  const roleValue = readQueryString(req.query.role);
  const statusValue = readQueryString(req.query.status);
  const search = readQueryString(req.query.search);

  const page = Number(rawPage);
  const limit = Number(rawLimit);

  if (!Number.isSafeInteger(page) || page < 1) {
    return res.status(400).json({
      success: false,
      message: "Page must be a positive integer",
    });
  }

  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: "Limit must be between 1 and 100",
    });
  }

  if (
    roleValue !== undefined &&
    !allowedRoles.includes(roleValue as (typeof allowedRoles)[number])
  ) {
    return res.status(400).json({
      success: false,
      message: "Role must be DRIVER or BROKER",
    });
  }

  if (
    statusValue !== undefined &&
    !allowedStatuses.includes(
      statusValue as (typeof allowedStatuses)[number],
    )
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid user status",
    });
  }

  if (search && search.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Search cannot exceed 100 characters",
    });
  }

  try {
    const result = await listUsers({
      page,
      limit,
      role: roleValue as "DRIVER" | "BROKER" | undefined,
      status: statusValue as
        | "PENDING"
        | "ACTIVE"
        | "REJECTED"
        | "SUSPENDED"
        | "DEACTIVATED"
        | undefined,
      search,
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("List users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
}


export async function createAdminController(
  req: Request,
  res: Response
) {
  const body = req.body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  } | undefined;

  const name =
    typeof body?.name === "string" ? body.name.trim() : "";

  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password = body?.password;

  if (!name || name.length > 100) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 1 and 100 characters",
    });
  }

  if (
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid email address is required",
    });
  }

  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    return res.status(400).json({
      success: false,
      message: "Password must be between 12 and 128 characters",
    });
  }

  try {
    const admin = await createAdmin({
      name,
      email,
      password,
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: admin,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    if (message.includes("already exists")) {
      return res.status(409).json({
        success: false,
        message,
      });
    }

    if (
      message.includes("Name must") ||
      message.includes("Password must")
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    console.error("Create admin error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create admin account",
    });
  }
}


export async function listAdminsController(
  req: Request,
  res: Response
) {
  try {
    const pageValue = req.query.page;
    const limitValue = req.query.limit;
    const searchValue = req.query.search;

    const page =
      typeof pageValue === "string" ? Number(pageValue) : 1;

    const limit =
      typeof limitValue === "string" ? Number(limitValue) : 10;

    const search =
      typeof searchValue === "string" ? searchValue.trim() : "";

    if (!Number.isInteger(page) || page < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    if (search.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Search cannot exceed 100 characters",
      });
    }

    const result = await listAdmins({
      page,
      limit,
      search,
    });

    return res.status(200).json({
      success: true,
      message: "Admin accounts retrieved successfully",
      data: result.admins,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("List admins error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve admin accounts",
    });
  }
}