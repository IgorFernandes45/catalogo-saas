import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
const sessionCookie = "catalogo_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "catalogo-saas-dev-secret",
);

type SessionUser = {
  userId: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "STORE_ADMIN" | "STORE_STAFF";
  storeId?: string | null;
};

async function createSessionCookie(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret);

  return `${sessionCookie}=${token}`;
}

async function timedRequest(
  label: string,
  path: string,
  init: RequestInit & { cookie?: string } = {},
) {
  const start = performance.now();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(init.cookie ? { Cookie: init.cookie } : {}),
    },
    redirect: "manual",
  });
  const body = await response.text();
  const durationMs = Number((performance.now() - start).toFixed(1));

  return {
    label,
    path,
    status: response.status,
    durationMs,
    bytes: body.length,
    location: response.headers.get("location"),
  };
}

async function averageRequests(
  label: string,
  path: string,
  count: number,
  cookie?: string,
) {
  const results = [];

  for (let index = 0; index < count; index += 1) {
    results.push(await timedRequest(`${label} #${index + 1}`, path, { cookie }));
  }

  const averageMs =
    results.reduce((total, result) => total + result.durationMs, 0) / results.length;

  return {
    label,
    path,
    averageMs: Number(averageMs.toFixed(1)),
    samples: results,
  };
}

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@catalogosaas.com" },
  });

  const stressUsers = await prisma.user.findMany({
    where: {
      email: {
        startsWith: "stress-loja",
      },
    },
    include: {
      store: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  if (!admin || !stressUsers.length) {
    throw new Error("Dados de stress nao encontrados. Rode primeiro npm run stress:seed.");
  }

  const adminCookie = await createSessionCookie({
    userId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    storeId: admin.storeId,
  });

  const routeResults = [];

  routeResults.push(await averageRequests("admin-stores", "/admin/stores", 3, adminCookie));

  for (const stressUser of stressUsers) {
    const cookie = await createSessionCookie({
      userId: stressUser.id,
      name: stressUser.name,
      email: stressUser.email,
      role: stressUser.role,
      storeId: stressUser.storeId,
    });
    const store = stressUser.store;

    if (!store) {
      continue;
    }

    const firstProduct = await prisma.product.findFirst({
      where: { storeId: store.id, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { slug: true, id: true, name: true },
    });

    routeResults.push(
      await averageRequests(`catalog-${store.slug}`, `/loja/${store.slug}`, 3),
    );
    routeResults.push(
      await averageRequests(
        `painel-produtos-${store.slug}`,
        "/painel/produtos?trackStock=1&lowStock=1",
        3,
        cookie,
      ),
    );
    routeResults.push(
      await averageRequests(
        `painel-relatorios-${store.slug}`,
        "/painel/relatorios?dateFrom=2026-01-01&dateTo=2026-12-31",
        3,
        cookie,
      ),
    );
    routeResults.push(
      await averageRequests(
        `painel-pedidos-${store.slug}`,
        "/painel/pedidos?search=Cliente",
        3,
        cookie,
      ),
    );

    if (firstProduct) {
      routeResults.push(
        await averageRequests(
          `produto-${store.slug}`,
          `/loja/${store.slug}/produto/${firstProduct.slug}`,
          2,
        ),
      );
      routeResults.push(
        await averageRequests(
          `historico-estoque-${store.slug}`,
          `/api/store/products/${firstProduct.id}/stock-movements`,
          2,
          cookie,
        ),
      );
    }
  }

  const firstStore = stressUsers[0]?.store;

  if (!firstStore) {
    throw new Error("Nenhuma loja de stress disponivel.");
  }

  const cartProducts = await prisma.product.findMany({
    where: {
      storeId: firstStore.id,
      isActive: true,
      trackStock: true,
      stockQuantity: {
        gt: 4,
      },
    },
    take: 3,
    orderBy: {
      stockQuantity: "desc",
    },
    select: {
      id: true,
      name: true,
      price: true,
      promotionalPrice: true,
      color: true,
      size: true,
    },
  });

  const orderPayload = {
    customerName: "Stress HTTP Runner",
    customerPhone: "83999990000",
    deliveryAddress: "",
    deliveryNumber: "",
    deliveryDistrict: "",
    deliveryCity: "",
    deliveryComplement: "",
    deliveryReference: "",
    notes: "Pedido gerado pelo teste pesado automatizado.",
    items: cartProducts.map((product) => ({
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: Number(product.promotionalPrice ?? product.price),
      notes: "Fluxo HTTP",
      attributes: [product.color, product.size].filter(Boolean),
    })),
  };

  const orderRuns = await Promise.all(
    Array.from({ length: 5 }, (_, index) =>
      timedRequest("order-api", `/api/public/store/${firstStore.slug}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": `10.0.0.${index + 10}`,
        },
        body: JSON.stringify({
          ...orderPayload,
          customerName: `Stress HTTP Runner ${index + 1}`,
          customerPhone: `83999990${(index + 10).toString().padStart(2, "0")}`,
        }),
      }),
    ),
  );

  const publicBurst = await Promise.all(
    Array.from({ length: 8 }, (_, index) =>
      timedRequest("catalog-burst", `/loja/${firstStore.slug}`, {
        headers: {
          "x-forwarded-for": `172.18.0.${index + 20}`,
        },
      }),
    ),
  );

  const summary = {
    baseUrl,
    routeResults,
    orderRuns,
    publicBurst: {
      averageMs: Number(
        (
          publicBurst.reduce((total, result) => total + result.durationMs, 0) /
          publicBurst.length
        ).toFixed(1),
      ),
      maxMs: Math.max(...publicBurst.map((result) => result.durationMs)),
      statuses: publicBurst.map((result) => result.status),
    },
    database: {
      stores: await prisma.store.count(),
      products: await prisma.product.count(),
      orders: await prisma.order.count(),
      stockMovements: await prisma.stockMovement.count(),
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
