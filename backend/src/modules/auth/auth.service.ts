import bcrypt from "bcryptjs";
import crypto from "crypto";



import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./auth.jwt.js";

import type {
  LoginInput,
  RegisterInput,
} from "./auth.validation.js";
import prisma from "../../config/page.js";
import { hashRefreshToken } from "./auth.utils.js";


export async function registerUser(data: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      phone: data.phone,
      role: data.role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
    },
  });

  return user;
}



export async function loginUser(data: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatched = await bcrypt.compare(
    data.password,
    user.password
  );

  if (!passwordMatched) {
    throw new Error("Invalid email or password");
  }

  if (user.deletedAt) {
    throw new Error("This account is no longer available");
  }

  if (user.status === "REJECTED") {
    throw new Error("Your account has been rejected");
  }

  // Generate one unique ID for this login session.
  const sessionId = crypto.randomUUID();

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
    sessionId,
  });

  const refreshToken = generateRefreshToken({
    userId: user.id,
    sessionId,
  });

  const tokenHash = hashRefreshToken(refreshToken);
  const refreshTokenPayload = verifyRefreshToken(refreshToken);

  if (!refreshTokenPayload.exp) {
    throw new Error("Refresh token expiration is missing");
  }

  const expiresAt = new Date(
    refreshTokenPayload.exp * 1000
  );

  // IMPORTANT: Save the same sessionId used in both tokens.
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      sessionId,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
    },
    accessToken,
    refreshToken,
  };
}





export async function refreshAccessToken(
  refreshToken: string
) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (!payload.exp || !payload.sessionId) {
    throw new Error("Invalid refresh token");
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!storedToken) {
    throw new Error("Refresh token not found");
  }

  if (storedToken.revokedAt) {
    throw new Error("Refresh token has been revoked");
  }

  if (storedToken.expiresAt <= new Date()) {
    throw new Error("Refresh token has expired");
  }

  // Legacy tokens without a session ID must log in again.
  if (!storedToken.sessionId) {
    throw new Error("Session is invalid. Please log in again");
  }

  // Ensure the signed token and database record match.
  if (
    payload.sessionId !== storedToken.sessionId ||
    payload.userId !== storedToken.userId
  ) {
    throw new Error("Refresh token session mismatch");
  }

  const user = storedToken.user;

  if (user.deletedAt) {
    throw new Error("This account is no longer available");
  }

  if (user.status === "REJECTED") {
    throw new Error("Your account has been rejected");
  }

  // IMPORTANT: Keep the existing session ID.
  // Do not generate a new session ID during token refresh.
  const sessionId = storedToken.sessionId;

  const newAccessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
    sessionId,
  });

  const newRefreshToken = generateRefreshToken({
    userId: user.id,
    sessionId,
  });

  const newRefreshTokenHash = hashRefreshToken(
    newRefreshToken
  );

  const newRefreshTokenPayload =
    verifyRefreshToken(newRefreshToken);

  if (!newRefreshTokenPayload.exp) {
    throw new Error("Refresh token expiration is missing");
  }

  const newExpiresAt = new Date(
    newRefreshTokenPayload.exp * 1000
  );

  // Rotate the refresh token while preserving its session.
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    }),

    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newRefreshTokenHash,
        sessionId,
        expiresAt: newExpiresAt,
      },
    }),
  ]);

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}



export async function logoutUser(refreshToken: string) {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (!payload.sessionId) {
    throw new Error("Invalid refresh token session");
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    select: {
      id: true,
      userId: true,
      sessionId: true,
      revokedAt: true,
    },
  });

  if (!storedToken) {
    throw new Error("Refresh token not found");
  }

  if (
    storedToken.userId !== payload.userId ||
    storedToken.sessionId !== payload.sessionId
  ) {
    throw new Error("Refresh token session mismatch");
  }

  if (storedToken.revokedAt) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: {
      userId: storedToken.userId,
      sessionId: storedToken.sessionId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}



export async function getCurrentUser(userId: number) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      isEmailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}