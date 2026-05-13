/**
 * Evolution API webhook — receives incoming WhatsApp messages and runs the AI agent.
 *
 * URL pattern: POST /api/agent/webhook?storeId=xxx
 * The storeId query param identifies which store this webhook belongs to.
 */

import { NextResponse } from "next/server";

import { runAgent, loadConversation, saveConversation, type AgentMessage } from "@/lib/agent";
import { buildEvolutionClient } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";

// Evolution API message payload (simplified)
interface EvolutionMessage {
  event?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: { caption?: string };
    };
    messageType?: string;
  };
}

function extractMessageText(msg: EvolutionMessage): string | null {
  const m = msg.data?.message;
  if (!m) return null;
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    null
  );
}

function extractPhone(jid: string): string {
  // jid format: "5511999999999@s.whatsapp.net"
  return jid.split("@")[0];
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId obrigatório." }, { status: 400 });
    }

    const body = (await request.json()) as EvolutionMessage;

    // Only handle MESSAGES_UPSERT events with actual message content
    if (body.event && body.event !== "messages.upsert") {
      return NextResponse.json({ ok: true });
    }

    // Ignore messages sent by the bot itself
    if (body.data?.key?.fromMe) {
      return NextResponse.json({ ok: true });
    }

    const remoteJid = body.data?.key?.remoteJid || "";
    const text = extractMessageText(body);

    // Ignore group messages and non-text messages
    if (!remoteJid || remoteJid.includes("@g.us") || !text) {
      return NextResponse.json({ ok: true });
    }

    const config = await prisma.agentConfig.findUnique({
      where: { storeId },
      select: {
        isEnabled: true,
        agentName: true,
        evolutionUrl: true,
        evolutionApiKey: true,
        evolutionInstance: true,
      },
    });

    if (!config?.isEnabled) {
      return NextResponse.json({ ok: true });
    }

    const evolution = buildEvolutionClient(config);
    if (!evolution) {
      return NextResponse.json({ ok: true });
    }

    const customerPhone = extractPhone(remoteJid);
    const customerName = body.data?.pushName || undefined;

    // Load existing conversation history
    const history = await loadConversation(storeId, customerPhone);

    // Run the agent
    const reply = await runAgent({
      storeId,
      customerPhone,
      customerMessage: text,
      history,
    });

    // Save updated history
    const updatedHistory: AgentMessage[] = [
      ...history,
      { role: "user", content: text },
      { role: "assistant", content: reply },
    ];
    await saveConversation(storeId, customerPhone, customerName, updatedHistory);

    // Send reply via Evolution API
    await evolution.sendText(remoteJid, reply);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[agent/webhook]", err);
    // Return 200 so Evolution doesn't retry indefinitely
    return NextResponse.json({ ok: true });
  }
}
