

import prisma from "../../config/page.js";
import type { Prisma } from "../../generated/prisma/client.js";

export interface CreateVehicleInput {
  type:
    | "CAR"
    | "VAN"
    | "PICKUP"
    | "TRUCK"
    | "TRAILER"
    | "REFRIGERATED_TRUCK"
    | "FLATBED"
    | "TANKER"
    | "OTHER";
  registrationNumber: string;
  capacityKg: number;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string;
  description?: string;
}

export async function createVehicle(
  driverId: number,
  input: CreateVehicleInput
) {
  // Confirm that the driver account is still active.
  const driver = await prisma.user.findFirst({
    where: {
      id: driverId,
      role: "DRIVER",
      status: "ACTIVE",
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!driver) {
    throw new Error("Active driver account not found");
  }

  try {
    return await prisma.vehicle.create({
      data: {
        driverId,
        type: input.type,
        registrationNumber: input.registrationNumber,
        capacityKg: input.capacityKg,
        make: input.make,
        model: input.model,
        year: input.year,
        licensePlate: input.licensePlate,
        description: input.description,
        status: "ACTIVE",
      },
      select: {
        id: true,
        driverId: true,
        type: true,
        status: true,
        make: true,
        model: true,
        year: true,
        registrationNumber: true,
        licensePlate: true,
        capacityKg: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error(
        "A vehicle with this registration number or license plate already exists"
      );
    }

    throw error;
  }
}

export async function listMyVehicles(driverId: number) {
  return prisma.vehicle.findMany({
    where: {
      driverId,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      driverId: true,
      type: true,
      status: true,
      make: true,
      model: true,
      year: true,
      registrationNumber: true,
      licensePlate: true,
      capacityKg: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}


export async function getVehicleById(
  driverId: number,
  vehicleId: number
) {
  return prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      driverId,
      deletedAt: null,
    },
    select: {
      id: true,
      driverId: true,
      type: true,
      status: true,
      make: true,
      model: true,
      year: true,
      registrationNumber: true,
      licensePlate: true,
      capacityKg: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export interface UpdateVehicleInput {
  type?:
    | "CAR"
    | "VAN"
    | "PICKUP"
    | "TRUCK"
    | "TRAILER"
    | "REFRIGERATED_TRUCK"
    | "FLATBED"
    | "TANKER"
    | "OTHER";
  registrationNumber?: string;
  capacityKg?: number;
  make?: string;
  model?: string;
  year?: number;
  licensePlate?: string | null;
  description?: string | null;
}

export async function updateVehicle(
  driverId: number,
  vehicleId: number,
  input: UpdateVehicleInput
) {
  try {
    const result = await prisma.vehicle.updateMany({
      where: {
        id: vehicleId,
        driverId,
        deletedAt: null,
      },
      data: input,
    });

    if (result.count === 0) {
      return null;
    }

    return getVehicleById(driverId, vehicleId);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new Error(
        "A vehicle with this registration number or license plate already exists"
      );
    }

    throw error;
  }
}

export async function deleteVehicle(
  driverId: number,
  vehicleId: number
) {
  const result = await prisma.vehicle.updateMany({
    where: {
      id: vehicleId,
      driverId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  return result.count > 0;
}
