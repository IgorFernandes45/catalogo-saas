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

  const results: Record<string, unknown> = {};

  // 1. Add webhookSecret column if missing
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "AgentConfig" ADD COLUMN IF NOT EXISTS "webhookSecret" TEXT;`,
    );
    results.migration = "webhookSecret column OK";
  } catch (e) {
    results.migration = `error: ${String(e)}`;
  }

  // 2. Reset passwords
  try {
    const hash = await bcrypt.hash("loja2025", 10);
    await prisma.user.update({ where: { email: "gestor@lojateste.com" }, data: { passwordHash: hash } });
    results.gestor = "gestor@lojateste.com / loja2025 ✓";
  } catch (e) { results.gestor = String(e); }

  try {
    const h = await bcrypt.hash("admin2025", 10);
    await prisma.user.update({ where: { email: "admin@catalogosaas.com" }, data: { passwordHash: h } });
    results.admin = "admin@catalogosaas.com / admin2025 ✓";
  } catch (e) { results.admin = String(e); }

  // 3. Show current agent config state (Vercel DB)
  try {
    const agents = await prisma.agentConfig.findMany({
      select: { storeId: true, isEnabled: true, evolutionInstance: true, evolutionUrl: true },
    });
    results.agentConfigs = agents;

    // Ensure all agents are enabled
    for (const a of agents) {
      if (!a.isEnabled) {
        await prisma.agentConfig.update({
          where: { storeId: a.storeId },
          data: { isEnabled: true },
        });
        results.agentEnabled = `enabled storeId ${a.storeId}`;
      }
    }
  } catch (e) { results.agentConfigs = String(e); }

  return NextResponse.json({ ok: true, ...results });
}
