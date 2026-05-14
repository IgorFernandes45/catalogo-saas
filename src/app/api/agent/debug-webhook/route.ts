/**
 * ROTA TEMPORÁRIA DE DIAGNÓSTICO — remover após uso
 * Captura o último payload recebido do Evolution API para depuração.
 */

import { NextResponse } from "next/server";

// In-memory store (lasts for the lifetime of the serverless instance)
let lastPayload: unknown = null;
let lastReceivedAt: string | null = null;

export async function POST(request: Request) {
  try {
    lastPayload = await request.json();
    lastReceivedAt = new Date().toISOString();
    console.log("[debug-webhook] received:", JSON.stringify(lastPayload).slice(0, 500));
  } catch (e) {
    lastPayload = { error: String(e) };
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ lastReceivedAt, lastPayload });
}
