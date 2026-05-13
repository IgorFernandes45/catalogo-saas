import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.productCustomAttributeValue.deleteMany();
  await prisma.productImportSession.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categoryCustomAttribute.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
}

async function main() {
  await resetDatabase();

  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Administrador",
      email: "admin@catalogosaas.com",
      passwordHash: adminPassword,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED_CREATE_ADMIN",
      entityType: "USER",
      entityId: admin.id,
    },
  });

  console.log("Banco de dados limpo e pronto para uso.");
  console.log("Super admin:");
  console.log("  E-mail : admin@catalogosaas.com");
  console.log("  Senha  : admin123");
  console.log("");
  console.log("Crie as lojas pelo painel em /admin/stores/new.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
