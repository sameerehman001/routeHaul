
import type { AuthUserRole } from "../auth/auth.types.js";
import type { Prisma } from "../../generated/prisma/client.js";
import prisma from "../../config/page.js";
import bcrypt from "bcryptjs";

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



export interface CreateAdminInput {
  name: string;
  email: string;
  password: string;
}

export async function createAdmin(data: CreateAdminInput) {
  const name = data.name.trim();
  const email = data.email.trim().toLowerCase();

  if (!name || name.length > 100) {
    throw new Error("Name must be between 1 and 100 characters");
  }

  if (data.password.length < 12 || data.password.length > 128) {
    throw new Error("Password must be between 12 and 128 characters");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("An account with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  try {
    return await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "ADMIN",
        status: "ACTIVE",
        isEmailVerified: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });
  } catch (error) {
    // Handle a duplicate email if two requests race each other.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error("An account with this email already exists");
    }

    throw error;
  }
}


export interface ListAdminsFilters {
  page: number;
  limit: number;
  search?: string;
}

export async function listAdmins(filters: ListAdminsFilters) {
  const { page, limit, search } = filters;
  const skip = (page - 1) * limit;

const where: Prisma.UserWhereInput = {
  role: "ADMIN",
  deletedAt: null,
  ...(search
    ? {
        OR: [
          {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      }
    : {}),
};

  const [admins, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
    }),
    prisma.user.count({ where }),
  ]);

  return {
    admins,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

const adminDetailsSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function getAdminById(adminId: number) {
  return prisma.user.findFirst({
    where: {
      id: adminId,
      role: "ADMIN",
      deletedAt: null,
    },
    select: adminDetailsSelect,
  });
}

export interface UpdateAdminInput {
  name?: string;
  email?: string;
  phone?: string | null;
}

export async function updateAdmin(
  adminId: number,
  input: UpdateAdminInput
) {
  const data: Prisma.UserUpdateManyMutationInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.email !== undefined) {
    data.email = input.email;
  }

  if (input.phone !== undefined) {
    data.phone = input.phone;
  }

  try {
    const result = await prisma.user.updateMany({
      where: {
        id: adminId,
        role: "ADMIN",
        deletedAt: null,
      },
      data,
    });

    if (result.count === 0) {
      return null;
    }

    return await prisma.user.findFirst({
      where: {
        id: adminId,
        role: "ADMIN",
        deletedAt: null,
      },
      select: adminDetailsSelect,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error("An account with this email already exists");
    }

    throw error;
  }
}

export type AdminAccountStatus = "ACTIVE" | "DEACTIVATED";

export async function updateAdminStatus(
  adminId: number,
  status: AdminAccountStatus
) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: {
        id: adminId,
        role: "ADMIN",
        deletedAt: null,
      },
      data: {
        status,
      },
    });

    if (result.count === 0) {
      return null;
    }

    // Revoke every active refresh-token session when deactivating.
    if (status === "DEACTIVATED") {
      await tx.refreshToken.updateMany({
        where: {
          userId: adminId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    return tx.user.findFirst({
      where: {
        id: adminId,
        role: "ADMIN",
        deletedAt: null,
      },
      select: adminDetailsSelect,
    });
  });
}