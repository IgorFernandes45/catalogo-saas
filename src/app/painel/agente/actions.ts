"use server";

import { redirect } from "next/navigation";

import { requireStoreUser } from "@/lib/auth";
import { buildEvolutionClient } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";

export async function saveAgentConfigAction(formData: FormData) {
  const user = await requireStoreUser();
  if (!user.storeId) redirect("/painel");

  const storeId = user.storeId;

  const data = {
    isEnabled: formData.get("isEnabled") === "on",
    agentName: String(formData.get("agentName") ?? "Assistente").trim() || "Assistente",
    greetingMessage: String(formData.get("greetingMessage") ?? "").trim() || null,
    evolutionUrl: String(formData.get("evolutionUrl") ?? "").trim() || null,
    evolutionApiKey: String(formData.get("evolutionApiKey") ?? "").trim() || null,
    evolutionInstance: String(formData.get("evolutionInstance") ?? "").trim() || null,
    phoneNumber: String(formData.get("phoneNumber") ?? "").trim() || null,
    deliveryFee: String(formData.get("deliveryFee") ?? "").trim() || null,
    deliveryFeeNote: String(formData.get("deliveryFeeNote") ?? "").trim() || null,
    deliveryTime: String(formData.get("deliveryTime") ?? "").trim() || null,
    deliveryArea: String(formData.get("deliveryArea") ?? "").trim() || null,
    acceptedPaymentsJson: buildPaymentsJson(formData),
    openingHours: String(formData.get("openingHours") ?? "").trim() || null,
    customInstructions: String(formData.get("customInstructions") ?? "").trim() || null,
  };

  await prisma.agentConfig.upsert({
    where: { storeId },
    create: { storeId, ...data },
    update: data,
  });

  redirect("/painel/agente?success=Configurações+salvas+com+sucesso.");
}

export async function registerWebhookAction(formData: FormData) {
  const user = await requireStoreUser();
  if (!user.storeId) redirect("/painel");

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
    redirect("/painel/agente?error=Configure+a+Evolution+API+antes.");
  }

  const appUrl = String(formData.get("appUrl") ?? "").trim();
  if (!appUrl) redirect("/painel/agente?error=URL+do+app+não+informada.");

  const webhookUrl = `${appUrl}/api/agent/webhook?storeId=${user.storeId}`;

  try {
    await evolution.setWebhook(webhookUrl);
    redirect("/painel/agente?success=Webhook+registrado+com+sucesso.");
  } catch {
    redirect("/painel/agente?error=Não+foi+possível+registrar+o+webhook.");
  }
}

export async function createEvolutionInstanceAction() {
  const user = await requireStoreUser();
  if (!user.storeId) redirect("/painel");

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
    redirect("/painel/agente?error=Configure+a+Evolution+API+antes.");
  }

  try {
    await evolution.createInstance();
    redirect("/painel/agente?success=Instância+criada.+Escaneie+o+QR+Code+para+conectar.");
  } catch {
    redirect("/painel/agente?error=Não+foi+possível+criar+a+instância.");
  }
}

function buildPaymentsJson(formData: FormData): string {
  const options = ["PIX", "Dinheiro", "Cartão de débito", "Cartão de crédito", "Transferência bancária"];
  const selected = options.filter((opt) => formData.get(`payment_${opt}`) === "on");
  const custom = String(formData.get("paymentCustom") ?? "").trim();
  if (custom) selected.push(custom);
  return JSON.stringify(selected);
}
