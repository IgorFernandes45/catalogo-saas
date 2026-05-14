import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// ROTA TEMPORÁRIA — remover após uso
const TOKEN = "2fe6121809b321476f591ba66e3fb37d";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("token") !== TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};

  // 1. Add webhookSecret column if it doesn't exist
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "AgentConfig" ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;
    `);
    results.migration = "webhookSecret column OK";
  } catch (e) {
    results.migration = `migration error: ${String(e)}`;
  }

  // 2. Reset passwords
  try {
    const hash = await bcrypt.hash("loja2025", 10);
    await prisma.user.update({
      where: { email: "gestor@lojateste.com" },
      data: { passwordHash: hash },
    });
    results.gestor = "gestor@lojateste.com / loja2025 ✓";
  } catch (e) {
    results.gestor = `error: ${String(e)}`;
  }

  try {
    const adminHash = await bcrypt.hash("admin2025", 10);
    await prisma.user.update({
      where: { email: "admin@catalogosaas.com" },
      data: { passwordHash: adminHash },
    });
    results.admin = "admin@catalogosaas.com / admin2025 ✓";
  } catch (e) {
    results.admin = `error: ${String(e)}`;
  }

  return NextResponse.json({ ok: true, ...results });
}
