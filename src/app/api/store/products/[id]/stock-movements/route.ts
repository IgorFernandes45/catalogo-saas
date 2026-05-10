import { NextResponse } from "next/server";

import { getCurrentUserBasic } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUserBasic();

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (user.role === "SUPER_ADMIN" || !user.storeId) {
    return NextResponse.json({ error: "Sem permissao para esta rota." }, { status: 403 });
  }

  const { id } = await context.params;
  const product = await prisma.product.findFirst({
    where: {
      id,
      storeId: user.storeId,
    },
    select: {
      id: true,
      trackStock: true,
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Produto nao encontrado." }, { status: 404 });
  }

  if (!product.trackStock) {
    return NextResponse.json(
      { movements: [] },
      {
        headers: {
          "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
        },
      },
    );
  }

  const movements = await prisma.stockMovement.findMany({
    where: {
      storeId: user.storeId,
      productId: product.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 8,
    select: {
      id: true,
      type: true,
      variantLabelSnapshot: true,
      quantity: true,
      quantityBefore: true,
      quantityAfter: true,
      notes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    movements: movements.map((movement) => ({
      ...movement,
      createdAt: movement.createdAt.toISOString(),
    })),
  }, {
    headers: {
      "Cache-Control": "private, max-age=15, stale-while-revalidate=30",
    },
  });
}
