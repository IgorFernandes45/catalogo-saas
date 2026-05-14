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
    select: { evolutionInstance: true, evolutionUrl: true, webhookSecret: true },
  });

  const evolution = buildEvolutionClient(config?.evolutionInstance, config?.evolutionUrl);
  if (!evolution) {
    return NextResponse.json({ error: "Agente não configurado." }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://catalogo-saas-wine.vercel.app";
  const secretParam = config?.webhookSecret ? `&secret=${config.webhookSecret}` : "";
  const webhookUrl = `${appUrl}/api/agent/webhook?storeId=${user.storeId}${secretParam}`;

  // Helper: always (re-)register webhook so messages flow even on reconnect
  const registerWebhook = async () => {
    try {
      await evolution.setWebhook(webhookUrl);
    } catch {
      // non-fatal — log for debug
      console.error("[start-qr] setWebhook failed");
    }
  };

  // Already connected — just ensure webhook is registered and return
  const currentStatus = await evolution.getStatus();
  if (currentStatus === "open") {
    await registerWebhook();
    return NextResponse.json({ connected: true });
  }

  // Try to get QR directly (v1 returns it synchronously when instance exists)
  const qr = await evolution.getQrCode();
  if (qr?.base64) {
    // Register webhook every time we serve a QR so it's always up-to-date
    await registerWebhook();
    const b64 = qr.base64;
    return NextResponse.json({
      qr: b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`,
    });
  }

  // Instance doesn't exist or expired — recreate it
  try { await evolution.deleteInstance(); } catch { /* ignore */ }
  await new Promise((r) => setTimeout(r, 1500));
  await evolution.createInstance();
  await registerWebhook();

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
