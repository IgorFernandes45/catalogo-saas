/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const statements = [
  "CREATE EXTENSION IF NOT EXISTS pg_trgm",
  'CREATE INDEX IF NOT EXISTS "Product_name_trgm_idx" ON "Product" USING gin ("name" gin_trgm_ops)',
  'CREATE INDEX IF NOT EXISTS "Product_shortDescription_trgm_idx" ON "Product" USING gin ("shortDescription" gin_trgm_ops)',
  'CREATE INDEX IF NOT EXISTS "Category_name_trgm_idx" ON "Category" USING gin ("name" gin_trgm_ops)',
  'CREATE INDEX IF NOT EXISTS "ProductCustomAttributeValue_valueText_trgm_idx" ON "ProductCustomAttributeValue" USING gin ("valueText" gin_trgm_ops)',
];

async function main() {
  for (const statement of statements) {
    const started = performance.now();
    await prisma.$executeRawUnsafe(statement);
    console.log(`${Math.round(performance.now() - started)}ms ${statement}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
