"use server";

import { redirect } from "next/navigation";

import { requireStoreUser } from "@/lib/auth";
import { buildEvolutionClient } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";

export async function saveAgentConfigAction(formData: FormData) {
  const user = await requireStoreUser();
  if (!user.storeId) redirect("/painel");

  const data = {
    agentName: String(formData.get("agentName") ?? "Assistente").trim() || "Assistente",
    greetingMessage: String(formData.get("greetingMessage") ?? "").trim() || null,
    deliveryZonesJson: buildDeliveryZonesJson(formData),
    deliveryFeeNote: String(formData.get("deliveryFeeNote") ?? "").trim() || null,
    deliveryTime: String(formData.get("deliveryTime") ?? "").trim() || null,
    acceptedPaymentsJson: buildPaymentsJson(formData),
    openingHours: String(formData.get("openingHours") ?? "").trim() || null,
    customInstructions: String(formData.get("customInstructions") ?? "").trim() || null,
  };

  await prisma.agentConfig.update({
    where: { storeId: user.storeId },
    data,
  });

  redirect("/painel/agente?success=Configurações+salvas+com+sucesso.");
}

export async function registerWebhookAction() {
  const user = await requireStoreUser();
  if (!user.storeId) redirect("/painel");

  const config = await prisma.agentConfig.findUnique({
    where: { storeId: user.storeId },
    select: { evolutionInstance: true, evolutionUrl: true },
  });

  const evolution = buildEvolutionClient(config?.evolutionInstance, config?.evolutionUrl);
  if (!evolution) {
    redirect("/painel/agente?error=Agente+não+configurado.+Contate+o+administrador.");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "";

  if (!appUrl) {
    redirect("/painel/agente?error=URL+do+sistema+não+configurada.");
  }

  const webhookUrl = `${appUrl}/api/agent/webhook?storeId=${user.storeId}`;

  try {
    await evolution.setWebhook(webhookUrl);
    redirect("/painel/agente?success=Webhook+registrado+com+sucesso.");
  } catch {
    redirect("/painel/agente?error=Não+foi+possível+registrar+o+webhook.");
  }
}

export async function connectWhatsAppAction() {
  const user = await requireStoreUser();
  if (!user.storeId) redirect("/painel");

  const config = await prisma.agentConfig.findUnique({
    where: { storeId: user.storeId },
    select: { evolutionInstance: true, evolutionUrl: true },
  });

  const evolution = buildEvolutionClient(config?.evolutionInstance, config?.evolutionUrl);
  if (!evolution) {
    redirect("/painel/agente?error=Agente+não+configurado.+Contate+o+administrador.");
  }

  try {
    await evolution.createInstance();
  } catch {
    // Instance may already exist — ignore error
  }

  redirect("/painel/agente?tab=conexao");
}

function buildPaymentsJson(formData: FormData): string {
  const options = ["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência bancária"];
  const selected = options.filter((opt) => formData.get(`payment_${opt}`) === "on");
  const custom = String(formData.get("paymentCustom") ?? "").trim();
  if (custom) selected.push(custom);
  return JSON.stringify(selected);
}

function buildDeliveryZonesJson(formData: FormData): string | null {
  const zones: { area: string; fee: string }[] = [];
  let i = 0;
  while (formData.has(`zone_area_${i}`)) {
    const area = String(formData.get(`zone_area_${i}`) ?? "").trim();
    const fee = String(formData.get(`zone_fee_${i}`) ?? "").trim();
    if (area || fee) zones.push({ area, fee });
    i++;
  }
  return zones.length > 0 ? JSON.stringify(zones) : null;
}
