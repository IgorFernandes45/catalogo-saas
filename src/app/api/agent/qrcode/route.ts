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
    select: {
      evolutionUrl: true,
      evolutionApiKey: true,
      evolutionInstance: true,
    },
  });

  const evolution = buildEvolutionClient({
    evolutionUrl: config?.evolutionUrl ?? null,
    evolutionApiKey: config?.evolutionApiKey ?? null,
    evolutionInstance: config?.evolutionInstance ?? null,
  });
  if (!evolution) {
    return NextResponse.json({ error: "Evolution API não configurada." }, { status: 400 });
  }

  const qr = await evolution.getQrCode();
  return NextResponse.json({ qr });
}
