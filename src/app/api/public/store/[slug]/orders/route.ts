import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { consumeRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import { orderSchema } from "@/lib/validations";
import { buildWhatsAppMessage, createWhatsAppLink } from "@/lib/whatsapp";

function getVariantUnitPrice(productPrice: number, variant: {
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

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const clientIp = getClientIdentifier(request.headers.get("x-forwarded-for"));
  const rateLimit = consumeRateLimit(`order:${slug}:${clientIp}`, 8, 10 * 60 * 1000);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Muitas tentativas de envio. Tente novamente em ${rateLimit.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  const body = await request.json();

  const parsed = orderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Pedido invalido." },
      { status: 400 },
    );
  }

  const store = await prisma.store.findFirst({
    where: { slug, status: true },
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      accessMode: true,
    },
  });

  if (!store) {
    return NextResponse.json({ error: "Loja não encontrada." }, { status: 404 });
  }

  const storeProducts = await prisma.product.findMany({
    where: {
      storeId: store.id,
      id: {
        in: parsed.data.items.map((item) => item.productId),
      },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      price: true,
      promotionalPrice: true,
      costPrice: true,
      variants: {
        where: {
          isActive: true,
        },
        select: {
          id: true,
          label: true,
          priceOverride: true,
          promotionalPriceOverride: true,
          discountPercent: true,
          costPriceOverride: true,
        },
      },
    },
  });

  if (storeProducts.length !== parsed.data.items.length) {
    return NextResponse.json(
      { error: "Um ou mais produtos não estão disponíveis." },
      { status: 400 },
    );
  }

  const productMap = new Map(
    storeProducts.map((product) => [
      product.id,
      {
        name: product.name,
        unitPrice: Number(product.promotionalPrice || product.price),
        regularPrice: Number(product.price),
        costPrice: Number(product.costPrice || 0),
        variants: product.variants,
      },
    ]),
  );

  let normalizedItems;

  try {
    normalizedItems = parsed.data.items.map((item) => {
      const product = productMap.get(item.productId);
      const variant = item.productVariantId
        ? product?.variants.find((entry) => entry.id === item.productVariantId)
        : null;

      if (item.productVariantId && !variant) {
        throw new Error("Uma variação selecionada não está mais disponível.");
      }

      if (product?.variants.length && !item.productVariantId) {
        throw new Error("Selecione a variação do produto antes de enviar o pedido.");
      }

      return {
        ...item,
        productName: product?.name || item.productName,
        unitPrice: variant
          ? getVariantUnitPrice(product?.regularPrice ?? item.unitPrice, variant)
          : Number(product?.unitPrice ?? item.unitPrice),
        costPrice: Number(variant?.costPriceOverride ?? product?.costPrice ?? 0),
        productVariantLabel: variant?.label || null,
      };
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Pedido invalido.",
      },
      { status: 400 },
    );
  }

  const subtotal = normalizedItems.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );
  const deliveryAddress = parsed.data.deliveryAddress?.trim() || "Não informado";
  const deliveryDistrict = parsed.data.deliveryDistrict?.trim() || "Não informado";
  const deliveryCity = parsed.data.deliveryCity?.trim() || "Não informado";

  const message = buildWhatsAppMessage({
    storeName: store.name,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    deliveryAddress: parsed.data.deliveryAddress,
    deliveryNumber: parsed.data.deliveryNumber,
    deliveryDistrict: parsed.data.deliveryDistrict,
    deliveryCity: parsed.data.deliveryCity,
    deliveryComplement: parsed.data.deliveryComplement,
    deliveryReference: parsed.data.deliveryReference,
    notes: parsed.data.notes,
    items: normalizedItems.map((item) => ({
      productName: item.productName,
      attributes: [
        ...(item.productVariantLabel ? [item.productVariantLabel] : []),
        ...item.attributes,
      ],
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes,
    })),
  });

  if (store.accessMode === "CATALOG_ONLY") {
    return NextResponse.json({
      orderId: null,
      whatsappLink: createWhatsAppLink(store.whatsappNumber, message),
    });
  }

  let order;

  try {
    order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        deliveryAddress,
        deliveryNumber: parsed.data.deliveryNumber || null,
        deliveryDistrict,
        deliveryCity,
        deliveryComplement: parsed.data.deliveryComplement || null,
        deliveryReference: parsed.data.deliveryReference || null,
        notes: parsed.data.notes || null,
        subtotal,
        status: "PENDING",
        whatsappSentAt: new Date(),
        items: {
          create: normalizedItems.map((item) => ({
            productId: item.productId,
            productVariantId: item.productVariantId || null,
            productNameSnapshot: item.productName,
            productVariantLabelSnapshot: item.productVariantLabel,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPriceSnapshot: item.costPrice || null,
            profitSnapshot: Math.max(0, (item.unitPrice - item.costPrice) * item.quantity),
            attributesSnapshotJson:
              item.attributes.length || item.notes
                ? JSON.stringify([
                    ...item.attributes,
                    ...(item.notes ? [`Obs item: ${item.notes}`] : []),
                  ])
                : null,
          })),
        },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ["P2028", "P2034"].includes(error.code)
    ) {
      return NextResponse.json(
        {
          error:
            "O sistema esta processando muitos pedidos ao mesmo tempo. Tente novamente em alguns segundos.",
        },
        { status: 503 },
      );
    }

    throw error;
  }

  await prisma.auditLog.create({
    data: {
      storeId: store.id,
      action: "CREATE_ORDER",
      entityType: "ORDER",
      entityId: order.id,
    },
  });

  return NextResponse.json({
    orderId: order.id,
    whatsappLink: createWhatsAppLink(store.whatsappNumber, message),
  });
}
