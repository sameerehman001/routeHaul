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

  const sessionId = crypto.randomUUID();

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
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

  const expiresAt = new Date(refreshTokenPayload.exp * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
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

  if (!payload.exp) {
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

  const user = storedToken.user;

  if (user.deletedAt) {
    throw new Error("This account is no longer available");
  }

  if (user.status === "REJECTED") {
    throw new Error("Your account has been rejected");
  }

  const newSessionId = crypto.randomUUID();

  const newAccessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
  });

  const newRefreshToken = generateRefreshToken({
    userId: user.id,
    sessionId: newSessionId,
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
  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
  });

  if (!storedToken) {
    throw new Error("Refresh token not found");
  }

  if (storedToken.revokedAt) {
    return;
  }

  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}