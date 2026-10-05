import "dotenv/config";

import app from "./app.js";
import prisma from "./config/page.js";


const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`RouteHaul API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    process.exit(1);
  }
}

startServer();