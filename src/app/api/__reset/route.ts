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

  const hash = await bcrypt.hash("loja2025", 10);
  await prisma.user.update({
    where: { email: "gestor@lojateste.com" },
    data: { passwordHash: hash },
  });

  const adminHash = await bcrypt.hash("admin2025", 10);
  await prisma.user.update({
    where: { email: "admin@catalogosaas.com" },
    data: { passwordHash: adminHash },
  });

  return NextResponse.json({
    ok: true,
    gestor: "gestor@lojateste.com / loja2025",
    admin: "admin@catalogosaas.com / admin2025",
  });
}
