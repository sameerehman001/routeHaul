
import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/config/page.js";

async function main() {
  const name = process.env.SUPER_ADMIN_NAME;
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!name || !email || !password) {
    throw new Error(
      "Missing SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, or SUPER_ADMIN_PASSWORD in .env",
    );
  }

  if (password.length < 12) {
    throw new Error("Super-admin password must be at least 12 characters");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });

  if (existingUser) {
    throw new Error(
      `An account with email ${email} already exists. No changes were made.`,
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const superAdmin = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      isEmailVerified: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  console.log("Super-admin created successfully:");
  console.log(superAdmin);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to create super-admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
