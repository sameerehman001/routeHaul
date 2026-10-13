
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { createVehicleController, deleteVehicleController, getVehicleByIdController, listMyVehiclesController, updateVehicleController } from "./vehicle.controller.js";

const router = Router();

router.use(authenticate);
router.use(requireRole("DRIVER"));

router.post("/", createVehicleController);
router.get("/my", listMyVehiclesController);

router.get("/:vehicleId", getVehicleByIdController);

router.patch("/:vehicleId", updateVehicleController);

router.delete("/:vehicleId", deleteVehicleController);

export default router;
