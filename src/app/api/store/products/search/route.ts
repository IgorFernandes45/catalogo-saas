import { NextResponse } from "next/server";

import { getCurrentUserBasic } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getVariantSalePrice(productPrice: number, variant: {
  priceOverride: unknown;
  promotionalPriceOverride: unknown;
  discountPercent: unknown;
}) {
  const regularPrice = Number(variant.priceOverride ?? productPrice);
  const discountPercent = variant.discountPercent ? Number(variant.discountPercent) : null;
  const promotionalPrice = variant.promotionalPriceOverride
    ? Number(variant.promotionalPriceOverride)
    : discountPercent
      ? Number((regularPrice * (1 - discountPercent / 100)).toFixed(2))
      : null;

  return promotionalPrice ?? regularPrice;
}

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
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 30);

  const products = await prisma.product.findMany({
    where: {
      storeId: user.storeId,
      isActive: true,
      ...(categoryId && categoryId !== "all" ? { categoryId } : {}),
      ...(query
        ? {
            OR: [
              {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                sku: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                barcode: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                variants: {
                  some: {
                    barcode: {
                      contains: query,
                      mode: "insensitive",
                    },
                  },
                },
              },
              {
                category: {
                  name: {
                    contains: query,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      price: true,
      promotionalPrice: true,
      trackStock: true,
      stockQuantity: true,
      categoryId: true,
      category: {
        select: {
          name: true,
        },
      },
      variants: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          label: true,
          stockQuantity: true,
          priceOverride: true,
          promotionalPriceOverride: true,
          discountPercent: true,
          barcode: true,
          isActive: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return NextResponse.json(
    {
      products: products.map((product) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: Number(product.price),
        promotionalPrice: product.promotionalPrice ? Number(product.promotionalPrice) : null,
        trackStock: product.trackStock,
        stockQuantity: product.stockQuantity,
        categoryId: product.categoryId,
        categoryName: product.category.name,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          label: variant.label,
          stockQuantity: variant.stockQuantity,
          priceOverride: variant.priceOverride ? Number(variant.priceOverride) : null,
          promotionalPriceOverride: variant.promotionalPriceOverride
            ? Number(variant.promotionalPriceOverride)
            : null,
          discountPercent: variant.discountPercent ? Number(variant.discountPercent) : null,
          unitPrice: getVariantSalePrice(Number(product.price), variant),
          barcode: variant.barcode,
          isActive: variant.isActive,
        })),
      })),
    },
    {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=20",
      },
    },
  );
}
