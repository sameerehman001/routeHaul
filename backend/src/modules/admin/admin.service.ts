
import type { AuthUserRole } from "../auth/auth.types.js";
import type { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../config/page.js";

type Reviewer = {
  userId: number;
};

export async function getPendingUsers() {
  return prisma.user.findMany({
    where: {
      role: {
        in: ["DRIVER", "BROKER"],
      },
      status: "PENDING",
      deletedAt: null,
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
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function getUserForReview(userId: number) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      role: {
        in: ["DRIVER", "BROKER"],
      },
      deletedAt: null,
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
      approvalHistory: {
        select: {
          id: true,
          action: true,
          reason: true,
          createdAt: true,
          performedBy: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!user) {
    throw new Error("Driver or broker account not found");
  }

  return user;
}

export async function approveUser(
  targetUserId: number,
  reviewer: Reviewer
) {
  if (targetUserId === reviewer.userId) {
    throw new Error("You cannot approve your own account");
  }

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: {
        id: targetUserId,
        role: {
          in: ["DRIVER", "BROKER"],
        },
        status: "PENDING",
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!target) {
      throw new Error(
        "Pending driver or broker account not found"
      );
    }

    const now = new Date();

    const updatedUser = await tx.user.update({
      where: {
        id: target.id,
      },
      data: {
        status: "ACTIVE",
        approvedAt: now,
        approvedById: reviewer.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        approvedAt: true,
        approvedById: true,
      },
    });

    await tx.approvalHistory.create({
      data: {
        userId: target.id,
        action: "APPROVED",
        performedById: reviewer.userId,
      },
    });

    return updatedUser;
  });
}

export async function rejectUser(
  targetUserId: number,
  reviewer: Reviewer,
  reason: string
) {
  if (targetUserId === reviewer.userId) {
    throw new Error("You cannot reject your own account");
  }

  return prisma.$transaction(async (tx) => {
    const target = await tx.user.findFirst({
      where: {
        id: targetUserId,
        role: {
          in: ["DRIVER", "BROKER"],
        },
        status: "PENDING",
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!target) {
      throw new Error(
        "Pending driver or broker account not found"
      );
    }

    const updatedUser = await tx.user.update({
      where: {
        id: target.id,
      },
      data: {
        status: "REJECTED",
        approvedAt: null,
        approvedById: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await tx.approvalHistory.create({
      data: {
        userId: target.id,
        action: "REJECTED",
        performedById: reviewer.userId,
        reason,
      },
    });

    return updatedUser;
  });
}

export interface ListUsersFilters {
  page: number;
  limit: number;
  role?: "DRIVER" | "BROKER";
  status?:
    | "PENDING"
    | "ACTIVE"
    | "REJECTED"
    | "SUSPENDED"
    | "DEACTIVATED";
  search?: string;
}

export async function listUsers(filters: ListUsersFilters) {
  const { page, limit, role, status, search } = filters;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    role: role ?? { in: ["DRIVER", "BROKER"] },
  };

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
        approvedAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


