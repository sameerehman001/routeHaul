import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { requireRole } from "./middleware/role.middleware.js";
import adminRoutes from "./modules/admin/admin.routes.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "RouteHaul API is running",
  });
});

app.get(
  "/api/test/admin",
  authenticate,
  requireRole("ADMIN", "SUPER_ADMIN"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "You have admin access",
    });
  }
);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

export default app;