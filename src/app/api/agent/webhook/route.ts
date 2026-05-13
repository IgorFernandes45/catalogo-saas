/**
 * Evolution API webhook — receives incoming WhatsApp messages and runs the AI agent.
 * URL: POST /api/agent/webhook?storeId=xxx
 */

import { NextResponse } from "next/server";

import { runAgent, loadConversation, saveConversation, type AgentMessage } from "@/lib/agent";
import { buildEvolutionClient } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";

interface EvolutionMessage {
  event?: string;
  data?: {
    key?: { remoteJid?: string; fromMe?: boolean };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string };
    };
  };
}

function extractMessageText(msg: EvolutionMessage): string | null {
  const m = msg.data?.message;
  if (!m) return null;
  return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || null;
}

function extractPhone(jid: string): string {
  return jid.split("@")[0];
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    if (!storeId) return NextResponse.json({ ok: true });

    const body = (await request.json()) as EvolutionMessage;

    if (body.event && body.event !== "messages.upsert") return NextResponse.json({ ok: true });
    if (body.data?.key?.fromMe) return NextResponse.json({ ok: true });

    const remoteJid = body.data?.key?.remoteJid || "";
    const text = extractMessageText(body);
    if (!remoteJid || remoteJid.includes("@g.us") || !text) return NextResponse.json({ ok: true });

    const config = await prisma.agentConfig.findUnique({
      where: { storeId },
      select: { isEnabled: true, evolutionInstance: true },
    });

    if (!config?.isEnabled) return NextResponse.json({ ok: true });

    const evolution = buildEvolutionClient(config.evolutionInstance);
    if (!evolution) return NextResponse.json({ ok: true });

    const customerPhone = extractPhone(remoteJid);
    const customerName = body.data?.pushName || undefined;
    const history = await loadConversation(storeId, customerPhone);

    const reply = await runAgent({ storeId, customerPhone, customerMessage: text, history });

    const updatedHistory: AgentMessage[] = [
      ...history,
      { role: "user", content: text },
      { role: "assistant", content: reply },
    ];
    await saveConversation(storeId, customerPhone, customerName, updatedHistory);
    await evolution.sendText(remoteJid, reply);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[agent/webhook]", err);
    return NextResponse.json({ ok: true });
  }
}
