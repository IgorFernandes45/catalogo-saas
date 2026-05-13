"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/lib/auth";
import { buildEvolutionClient } from "@/lib/evolution";
import { prisma } from "@/lib/prisma";
import { storeSchema } from "@/lib/validations";
import { normalizeWhatsapp, parseCheckbox, slugify } from "@/lib/utils";

function buildStorePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: slugify(String(formData.get("slug") ?? formData.get("name") ?? "")),
    description: String(formData.get("description") ?? "").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim(),
    bannerUrl: String(formData.get("bannerUrl") ?? "").trim(),
    whatsappNumber: normalizeWhatsapp(String(formData.get("whatsappNumber") ?? "")),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    primaryColor: String(formData.get("primaryColor") ?? "#102542"),
    secondaryColor: String(formData.get("secondaryColor") ?? "#f97316"),
    accentColor: String(formData.get("accentColor") ?? "#22c55e"),
    themeMode: String(formData.get("themeMode") ?? "light"),
    accessMode: String(formData.get("accessMode") ?? "FULL"),
    catalogUsesImages: parseCheckbox(formData.get("catalogUsesImages")),
    status: parseCheckbox(formData.get("status")),
  };
}

export async function createStoreAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const managerName = String(formData.get("managerName") ?? "").trim();
  const managerEmail = String(formData.get("managerEmail") ?? "").trim().toLowerCase();
  const managerPassword = String(formData.get("managerPassword") ?? "");

  const parsed = storeSchema.safeParse(buildStorePayload(formData));

  if (!parsed.success) {
    redirect(`/admin/stores/new?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Dados inválidos.")}`);
  }

  if (!managerName || !managerEmail || managerPassword.length < 6) {
    redirect("/admin/stores/new?error=Preencha%20os%20dados%20do%20gestor%20da%20loja.");
  }

  const existingStore = await prisma.store.findFirst({
    where: {
      OR: [{ slug: parsed.data.slug }, { email: parsed.data.email || undefined }],
    },
  });

  if (existingStore) {
    redirect("/admin/stores/new?error=Ja%20existe%20uma%20loja%20com%20esse%20slug%20ou%20e-mail.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: managerEmail },
  });

  if (existingUser) {
    redirect("/admin/stores/new?error=Ja%20existe%20um%20usuario%20com%20este%20e-mail.");
  }

  const passwordHash = await bcrypt.hash(managerPassword, 10);

  const store = await prisma.store.create({
    data: {
      ...parsed.data,
      logoUrl: parsed.data.logoUrl || null,
      bannerUrl: parsed.data.bannerUrl || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      users: {
        create: {
          name: managerName,
          email: managerEmail,
          passwordHash,
          role: "STORE_ADMIN",
          isActive: true,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      storeId: store.id,
      action: "CREATE_STORE",
      entityType: "STORE",
      entityId: store.id,
    },
  });

  redirect("/admin/stores?success=Loja%20criada%20com%20sucesso.");
}

export async function updateStoreAction(formData: FormData) {
  const admin = await requireSuperAdmin();
  const storeId = String(formData.get("storeId") ?? "");
  const parsed = storeSchema.safeParse(buildStorePayload(formData));

  if (!parsed.success || !storeId) {
    redirect(`/admin/stores/${storeId}/edit?error=${encodeURIComponent(parsed.error?.issues[0]?.message || "Dados inválidos.")}`);
  }

  await prisma.store.update({
    where: { id: storeId },
    data: {
      ...parsed.data,
      logoUrl: parsed.data.logoUrl || null,
      bannerUrl: parsed.data.bannerUrl || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      storeId,
      action: "UPDATE_STORE",
      entityType: "STORE",
      entityId: storeId,
    },
  });

  redirect(`/admin/stores/${storeId}/edit?success=Loja%20atualizada%20com%20sucesso.`);
}

export async function saveStoreAgentAction(formData: FormData) {
  await requireSuperAdmin();
  const storeId = String(formData.get("storeId") ?? "");
  if (!storeId) redirect("/admin/stores");

  const isEnabled = formData.get("agentEnabled") === "on";
  const evolutionInstance = String(formData.get("evolutionInstance") ?? "").trim() || null;
  const phoneNumber = String(formData.get("phoneNumber") ?? "").trim() || null;

  await prisma.agentConfig.upsert({
    where: { storeId },
    create: { storeId, isEnabled, evolutionInstance, phoneNumber },
    update: { isEnabled, evolutionInstance, phoneNumber },
  });

  if (isEnabled && evolutionInstance) {
    const evolution = buildEvolutionClient(evolutionInstance);
    if (evolution) {
      try {
        await evolution.createInstance();
      } catch {
        // Instance may already exist
      }
    }
  }

  redirect(`/admin/stores/${storeId}/edit?success=Agente+IA+configurado+com+sucesso.`);
}
