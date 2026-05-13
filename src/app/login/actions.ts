"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  clearRateLimit,
  consumeRateLimit,
  getClientIdentifier,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validations";

export async function loginAction(formData: FormData) {
  const headerStore = await headers();
  const clientIp = getClientIdentifier(headerStore.get("x-forwarded-for"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rateLimitKey = `login:${clientIp}:${email || "anonymous"}`;
  const rateLimit = consumeRateLimit(rateLimitKey, 5, 10 * 60 * 1000);

  if (!rateLimit.allowed) {
    redirect(
      `/login?error=${encodeURIComponent(
        `Muitas tentativas de login. Tente novamente em ${rateLimit.retryAfterSeconds}s.`,
      )}`,
    );
  }

  const parsed = loginSchema.safeParse({
    email,
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Dados inválidos.")}`);
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { store: true },
  });

  if (!user || !user.isActive) {
    redirect("/login?error=Usuario%20nao%20encontrado%20ou%20inativo.");
  }

  const isValid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isValid) {
    redirect("/login?error=Senha%20invalida.");
  }

  clearRateLimit(rateLimitKey);

  await createSession({
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    storeId: user.storeId,
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      storeId: user.storeId,
      action: "LOGIN_SUCCESS",
      entityType: "AUTH",
      entityId: user.id,
    },
  });

  redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/painel");
}
