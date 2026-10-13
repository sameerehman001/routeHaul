
import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";

import {
  approveUserAccount,
  createAdminController,
  getAdminDetailsController,
  getUserDetails,
  listAdminsController,  
  listPendingUsers,
  listUsersController,
  rejectUserAccount,
  updateAdminController,
  updateAdminStatusController,
} from "./admin.controller.js";



const router = Router();

// Only SUPER_ADMIN can create admin accounts.
router.post(
  "/admins",
  authenticate,
  requireRole("SUPER_ADMIN"),
  createAdminController
);
router.get(
  "/admins",
  authenticate,
  requireRole("SUPER_ADMIN"),
  listAdminsController
);

router.get(
  "/admins/:adminId",
  authenticate,
  requireRole("SUPER_ADMIN"),
  getAdminDetailsController
);

router.patch(
  "/admins/:adminId",
  authenticate,
  requireRole("SUPER_ADMIN"),
  updateAdminController
);

router.patch(
  "/admins/:adminId/status",
  authenticate,
  requireRole("SUPER_ADMIN"),
  updateAdminStatusController
);

// Existing routes: ADMIN and SUPER_ADMIN.
router.use(authenticate);
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

// Keep your existing routes below this point.
router.get("/users/pending", listPendingUsers);
router.get("/users/:userId", getUserDetails);
router.patch("/users/:userId/approve", approveUserAccount);
router.patch("/users/:userId/reject", rejectUserAccount);
router.get("/users", listUsersController);

export default router;