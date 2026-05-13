import { NextResponse } from "next/server";

import { requireStoreUser } from "@/lib/auth";
import { buildEvolutionClient } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await requireStoreUser();
  if (!user.storeId) {
    return NextResponse.json({ error: "Sem loja vinculada." }, { status: 403 });
  }

  const config = await prisma.agentConfig.findUnique({
    where: { storeId: user.storeId },
    select: { evolutionInstance: true },
  });

  const evolution = buildEvolutionClient(config?.evolutionInstance);
  if (!evolution) {
    return NextResponse.json({ error: "Agente não configurado." }, { status: 400 });
  }

  // Delete existing instance and recreate to get a fresh QR
  try { await evolution.deleteInstance(); } catch { /* may not exist */ }

  await new Promise((r) => setTimeout(r, 1000));

  try { await evolution.createInstance(); } catch { /* ignore if exists */ }

  // Poll for QR code (up to 15s)
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const qr = await evolution.getQrCode();
    if (qr?.base64) {
      const b64 = qr.base64;
      return NextResponse.json({
        qr: b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`,
      });
    }
    if (qr?.code) {
      return NextResponse.json({ qr: null, code: qr.code });
    }
  }

  return NextResponse.json({ error: "QR Code não gerado. Tente novamente." }, { status: 504 });
}
