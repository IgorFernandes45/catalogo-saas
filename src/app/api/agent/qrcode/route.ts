import { NextResponse } from "next/server";

import { requireStoreUser } from "@/lib/auth";
import { buildEvolutionClient } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireStoreUser();
  if (!user.storeId) {
    return NextResponse.json({ error: "Sem loja vinculada." }, { status: 403 });
  }

  const config = await prisma.agentConfig.findUnique({
    where: { storeId: user.storeId },
    select: { evolutionInstance: true, evolutionUrl: true },
  });

  const evolution = buildEvolutionClient(config?.evolutionInstance, config?.evolutionUrl);
  if (!evolution) {
    return NextResponse.json({ error: "Agente não configurado para esta loja." }, { status: 400 });
  }

  const qr = await evolution.getQrCode();
  return NextResponse.json({ qr });
}
