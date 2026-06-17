import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth/password";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.SEED_ADMIN_USER || "admin";
  const password = process.env.SEED_ADMIN_PASS || "changeme123";
  const name = process.env.SEED_ADMIN_NAME || "Administrator";

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`✓ admin '${username}' already exists — skipping`);
    return;
  }
  await prisma.user.create({
    data: { username, name, role: "admin", passwordHash: hashPassword(password) },
  });
  console.log(`✓ created admin account '${username}'`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
