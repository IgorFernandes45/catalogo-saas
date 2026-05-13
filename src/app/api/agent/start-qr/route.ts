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

  // Check current status — if already open, no QR needed
  const currentStatus = await evolution.getStatus();
  if (currentStatus === "open") {
    return NextResponse.json({ connected: true });
  }

  // If not connected, try to get QR directly (v1 returns it synchronously)
  const qr = await evolution.getQrCode();
  if (qr?.base64) {
    const b64 = qr.base64;
    return NextResponse.json({
      qr: b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`,
    });
  }

  // Instance doesn't exist or expired — recreate it
  try { await evolution.deleteInstance(); } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 1500));
  await evolution.createInstance();

  // Register webhook
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://catalogo-saas-wine.vercel.app";
  try {
    await evolution.setWebhook(`${appUrl}/api/agent/webhook?storeId=${user.storeId}`);
  } catch { /* non-fatal */ }

  // Poll up to 15s for QR
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const fresh = await evolution.getQrCode();
    if (fresh?.base64) {
      const b64 = fresh.base64;
      return NextResponse.json({
        qr: b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`,
      });
    }
  }

  return NextResponse.json({ error: "QR Code não gerado. Tente novamente." }, { status: 504 });
}
