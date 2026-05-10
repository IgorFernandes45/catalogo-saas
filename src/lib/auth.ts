import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "catalogo_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "catalogo-saas-dev-secret",
);

export type SessionUser = {
  userId: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "STORE_ADMIN" | "STORE_STAFF";
  storeId?: string | null;
};

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret);

    return {
      userId: String(payload.userId),
      name: String(payload.name),
      email: String(payload.email),
      role: payload.role as SessionUser["role"],
      storeId: payload.storeId ? String(payload.storeId) : null,
    };
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async () => {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      storeId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      store: {
        select: {
          id: true,
          name: true,
          slug: true,
          accessMode: true,
        },
      },
    },
  });
});

export const getCurrentUserBasic = cache(async () => {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      storeId: true,
      isActive: true,
    },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user || !user.isActive) {
    redirect("/login");
  }

  return user;
}

export async function requireSuperAdmin() {
  const user = await requireUser();

  if (user.role !== "SUPER_ADMIN") {
    redirect("/painel");
  }

  return user;
}

export async function requireStoreUser() {
  const user = await requireUser();

  if (user.role === "SUPER_ADMIN" || !user.storeId) {
    redirect("/admin");
  }

  return user;
}

export async function requireSalesEnabledStoreUser() {
  const user = await requireStoreUser();

  if (user.store?.accessMode === "CATALOG_ONLY") {
    redirect("/painel/produtos");
  }

  return user;
}

export function storeHasSales(accessMode?: string | null) {
  return accessMode !== "CATALOG_ONLY";
}
