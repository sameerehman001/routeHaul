
import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";

import {
  approveUserAccount,
  getUserDetails,
  listPendingUsers,
  listUsersController,
  rejectUserAccount,
} from "./admin.controller.js";



const router = Router();

router.use(authenticate);
router.use(requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/users", listUsersController);
router.get("/users/pending", listPendingUsers);
router.get("/users/:userId", getUserDetails);

router.patch("/users/:userId/approve", approveUserAccount);
router.patch("/users/:userId/reject", rejectUserAccount);

export default router;
