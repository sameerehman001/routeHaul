
import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
  createVehicle,
  deleteVehicle,
  getVehicleById,
  listMyVehicles,
  updateVehicle,
} from "./vehicle.service.js";

const createVehicleSchema = z.object({
  type: z.enum([
    "CAR",
    "VAN",
    "PICKUP",
    "TRUCK",
    "TRAILER",
    "REFRIGERATED_TRUCK",
    "FLATBED",
    "TANKER",
    "OTHER",
  ]),
  registrationNumber: z.string().trim().min(1).max(50),
  capacityKg: z.number().int().positive(),
  make: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  licensePlate: z.string().trim().min(1).max(30).optional(),
  description: z.string().trim().max(1000).optional(),
}).strict();

export async function createVehicleController(
  req: AuthenticatedRequest,
  res: Response
) {
  const parsed = createVehicleSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid vehicle details",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const vehicle = await createVehicle(
      req.user.userId,
      parsed.data
    );

    return res.status(201).json({
      success: true,
      message: "Vehicle registered successfully",
      data: vehicle,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Active driver account not found") {
        return res.status(403).json({
          success: false,
          message: error.message,
        });
      }

      if (error.message.includes("already exists")) {
        return res.status(409).json({
          success: false,
          message: error.message,
        });
      }
    }

    console.error("Create vehicle error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to register vehicle",
    });
  }
}


export async function listMyVehiclesController(
  req: AuthenticatedRequest,
  res: Response
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const vehicles = await listMyVehicles(req.user.userId);

    return res.status(200).json({
      success: true,
      message: "Your vehicles retrieved successfully",
      data: vehicles,
      total: vehicles.length,
    });
  } catch (error) {
    console.error("List my vehicles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your vehicles",
    });
  }
}

function parseVehicleId(value: string | string[]): number | null {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

export async function getVehicleByIdController(
  req: AuthenticatedRequest,
  res: Response
) {
  const vehicleId = parseVehicleId(req.params.vehicleId);

  if (vehicleId === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid vehicle ID",
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const vehicle = await getVehicleById(
      req.user.userId,
      vehicleId
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle retrieved successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Get vehicle error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve vehicle",
    });
  }
}

const updateVehicleSchema = z.object({
  type: z.enum([
    "CAR",
    "VAN",
    "PICKUP",
    "TRUCK",
    "TRAILER",
    "REFRIGERATED_TRUCK",
    "FLATBED",
    "TANKER",
    "OTHER",
  ]).optional(),

  registrationNumber: z.string().trim().min(1).max(50).optional(),
  capacityKg: z.number().int().positive().optional(),
  make: z.string().trim().min(1).max(100).optional(),
  model: z.string().trim().min(1).max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  licensePlate: z.string().trim().min(1).max(30).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update" }
);

export async function updateVehicleController(
  req: AuthenticatedRequest,
  res: Response
) {
  const vehicleId = parseVehicleId(req.params.vehicleId);

  if (vehicleId === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid vehicle ID",
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const parsed = updateVehicleSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid vehicle details",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const vehicle = await updateVehicle(
      req.user.userId,
      vehicleId,
      parsed.data
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("already exists")
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Update vehicle error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update vehicle",
    });
  }
}

export async function deleteVehicleController(
  req: AuthenticatedRequest,
  res: Response
) {
  const vehicleId = parseVehicleId(req.params.vehicleId);

  if (vehicleId === null) {
    return res.status(400).json({
      success: false,
      message: "Invalid vehicle ID",
    });
  }

  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  try {
    const deleted = await deleteVehicle(
      req.user.userId,
      vehicleId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Delete vehicle error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete vehicle",
    });
  }
}