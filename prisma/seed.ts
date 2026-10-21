import { config as loadEnv } from "dotenv";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const email = process.env.DEMO_EMAIL ?? "demo@vaani.app";
const password = process.env.DEMO_PASSWORD ?? "Demo@12345";

async function main() {
  const passwordHash = await hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`Demo user ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
