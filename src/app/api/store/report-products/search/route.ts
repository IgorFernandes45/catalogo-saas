import { NextResponse } from "next/server";

import { getCurrentUserBasic } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUserBasic();

  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  if (user.role === "SUPER_ADMIN" || !user.storeId) {
    return NextResponse.json({ error: "Sem permissao para esta rota." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";
  const categoryId = searchParams.get("categoryId")?.trim() || "";
  const selectedId = searchParams.get("selectedId")?.trim() || "";
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 30);

  const [selectedProduct, products] = await Promise.all([
    selectedId
      ? prisma.product.findFirst({
          where: {
            id: selectedId,
            storeId: user.storeId,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            categoryId: true,
          },
        })
      : Promise.resolve(null),
    prisma.product.findMany({
      where: {
        storeId: user.storeId,
        isActive: true,
        ...(categoryId && categoryId !== "all" ? { categoryId } : {}),
        ...(query
          ? {
              name: {
                contains: query,
                mode: "insensitive",
              },
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
      },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: limit,
    }),
  ]);

  const merged = selectedProduct
    ? [selectedProduct, ...products.filter((product) => product.id !== selectedProduct.id)]
    : products;

  return NextResponse.json(
    {
      products: merged,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=30",
      },
    },
  );
}
