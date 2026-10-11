import { Router } from "express";

import {
  login,
  register,
  refresh,
  logout,
  me,
} from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticate, me);
// router.get(
//   "/admin/users",
//   authenticate,
//   requireRole("ADMIN", "SUPER_ADMIN"),
//   getUsers
// );

export default router;