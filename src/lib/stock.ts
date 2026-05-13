import { Prisma, type StockMovementType } from "@prisma/client";

type StockTransaction = Prisma.TransactionClient;

type ApplyStockMovementInput = {
  tx: StockTransaction;
  storeId: string;
  productId: string;
  productVariantId?: string | null;
  quantity: number;
  type: StockMovementType;
  userId?: string | null;
  orderId?: string | null;
  notes?: string | null;
};

function isDecrease(type: StockMovementType) {
  return type === "MANUAL_DECREASE" || type === "ORDER_DECREASE";
}

function isStockSet(type: StockMovementType) {
  return type === "STOCK_SET";
}

export async function applyStockMovement({
  tx,
  storeId,
  productId,
  productVariantId,
  quantity,
  type,
  userId,
  orderId,
  notes,
}: ApplyStockMovementInput) {
  const normalizedQuantity = Math.trunc(quantity);

  if (normalizedQuantity < 0 || (!isStockSet(type) && normalizedQuantity <= 0)) {
    throw new Error("Quantidade invalida para movimentacao de estoque.");
  }

  if (productVariantId) {
    const variant = await tx.productVariant.findFirst({
      where: {
        id: productVariantId,
        productId,
        isActive: true,
        product: {
          storeId,
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!variant) {
      throw new Error("Variação não encontrada para este produto.");
    }

    const quantityBefore = variant.stockQuantity;
    const quantityAfter = isStockSet(type)
      ? normalizedQuantity
      : isDecrease(type)
        ? quantityBefore - normalizedQuantity
        : quantityBefore + normalizedQuantity;

    if (quantityAfter < 0) {
      throw new Error(`Estoque insuficiente para ${variant.label}.`);
    }

    await tx.productVariant.update({
      where: { id: variant.id },
      data: {
        stockQuantity: quantityAfter,
      },
    });

    await tx.stockMovement.create({
      data: {
        storeId,
        productId,
        productVariantId: variant.id,
        variantLabelSnapshot: variant.label,
        userId: userId || null,
        orderId: orderId || null,
        type,
        quantity: isStockSet(type)
          ? Math.abs(quantityAfter - quantityBefore)
          : normalizedQuantity,
        quantityBefore,
        quantityAfter,
        notes: notes?.trim() || null,
      },
    });

    return {
      productName: `${variant.product.name} - ${variant.label}`,
      quantityBefore,
      quantityAfter,
    };
  }

  const product = await tx.product.findFirst({
    where: {
      id: productId,
      storeId,
    },
    select: {
      id: true,
      name: true,
      trackStock: true,
      stockQuantity: true,
      _count: {
        select: {
          variants: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado para esta loja.");
  }

  if (!product.trackStock) {
    throw new Error(`O produto ${product.name} não usa controle de estoque.`);
  }

  if (product._count.variants > 0) {
    throw new Error(`O produto ${product.name} usa estoque por variação. Escolha a combinação.`);
  }

  const quantityBefore = product.stockQuantity ?? 0;
  const quantityAfter = isStockSet(type)
    ? normalizedQuantity
    : isDecrease(type)
      ? quantityBefore - normalizedQuantity
      : quantityBefore + normalizedQuantity;

  if (quantityAfter < 0) {
    throw new Error(`Estoque insuficiente para ${product.name}.`);
  }

  await tx.product.update({
    where: { id: product.id },
    data: {
      stockQuantity: quantityAfter,
    },
  });

  await tx.stockMovement.create({
    data: {
      storeId,
      productId: product.id,
      productVariantId: null,
      variantLabelSnapshot: null,
      userId: userId || null,
      orderId: orderId || null,
      type,
      quantity: isStockSet(type)
        ? Math.abs(quantityAfter - quantityBefore)
        : normalizedQuantity,
      quantityBefore,
      quantityAfter,
      notes: notes?.trim() || null,
    },
  });

  return {
    productName: product.name,
    quantityBefore,
    quantityAfter,
  };
}

type ApplyOrderStockDecreaseInput = {
  tx: StockTransaction;
  storeId: string;
  orderId: string;
  items: Array<{
    productId: string;
    productVariantId?: string | null;
    quantity: number;
  }>;
  notesByProductId?: Map<string, string>;
};

export async function applyOrderStockDecreaseBatch({
  tx,
  storeId,
  orderId,
  items,
  notesByProductId,
}: ApplyOrderStockDecreaseInput) {
  const mergedItems = new Map<string, number>();
  const mergedVariantItems = new Map<string, { productId: string; quantity: number }>();

  for (const item of items) {
    const normalizedQuantity = Math.trunc(item.quantity);

    if (normalizedQuantity <= 0) {
      throw new Error("Quantidade invalida para movimentacao de estoque.");
    }

    if (item.productVariantId) {
      const current = mergedVariantItems.get(item.productVariantId);
      mergedVariantItems.set(item.productVariantId, {
        productId: item.productId,
        quantity: (current?.quantity || 0) + normalizedQuantity,
      });
      continue;
    }

    mergedItems.set(
      item.productId,
      (mergedItems.get(item.productId) || 0) + normalizedQuantity,
    );
  }

  const productIds = [...mergedItems.keys()];
  const variantIds = [...mergedVariantItems.keys()];

  if (!productIds.length && !variantIds.length) {
    return [];
  }

  const stockProducts = await tx.product.findMany({
    where: {
      storeId,
      id: {
        in: productIds,
      },
      trackStock: true,
    },
    select: {
      id: true,
      name: true,
    },
  });
  const stockProductIds = new Set(stockProducts.map((product) => product.id));
  const stockVariants = await tx.productVariant.findMany({
    where: {
      id: {
        in: variantIds,
      },
      isActive: true,
      product: {
        storeId,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  const stockVariantMap = new Map(stockVariants.map((variant) => [variant.id, variant]));
  const movementRows: Array<{
    storeId: string;
    productId: string;
    productVariantId?: string | null;
    orderId: string;
    type: "ORDER_DECREASE";
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    variantLabelSnapshot?: string | null;
    notes: string | null;
  }> = [];

  for (const [variantId, item] of mergedVariantItems.entries()) {
    const variant = stockVariantMap.get(variantId);

    if (!variant) {
      throw new Error("Uma variação do pedido não está mais disponível.");
    }

    const updated = await tx.productVariant.updateMany({
      where: {
        id: variantId,
        productId: item.productId,
        isActive: true,
        stockQuantity: {
          gte: item.quantity,
        },
      },
      data: {
        stockQuantity: {
          decrement: item.quantity,
        },
      },
    });

    if (!updated.count) {
      throw new Error(`Estoque insuficiente para ${variant.label}.`);
    }

    const refreshedVariant = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: {
        stockQuantity: true,
      },
    });

    const quantityAfter = refreshedVariant?.stockQuantity ?? 0;
    movementRows.push({
      storeId,
      productId: item.productId,
      productVariantId: variant.id,
      variantLabelSnapshot: variant.label,
      orderId,
      type: "ORDER_DECREASE",
      quantity: item.quantity,
      quantityBefore: quantityAfter + item.quantity,
      quantityAfter,
      notes:
        notesByProductId?.get(item.productId) || `Baixa automática da variação ${variant.label}`,
    });
  }

  for (const [productId, quantity] of mergedItems.entries()) {
    if (!stockProductIds.has(productId)) {
      continue;
    }

    const updated = await tx.product.updateMany({
      where: {
        id: productId,
        storeId,
        trackStock: true,
        stockQuantity: {
          gte: quantity,
        },
      },
      data: {
        stockQuantity: {
          decrement: quantity,
        },
      },
    });

    if (!updated.count) {
      const failedProduct = stockProducts.find((product) => product.id === productId);
      throw new Error(
        `Estoque insuficiente para ${failedProduct?.name || "o produto selecionado"}.`,
      );
    }

    const refreshedProduct = await tx.product.findUnique({
      where: { id: productId },
      select: {
        stockQuantity: true,
      },
    });

    const quantityAfter = refreshedProduct?.stockQuantity ?? 0;
    movementRows.push({
      storeId,
      productId,
      productVariantId: null,
      variantLabelSnapshot: null,
      orderId,
      type: "ORDER_DECREASE",
      quantity,
      quantityBefore: quantityAfter + quantity,
      quantityAfter,
      notes: notesByProductId?.get(productId) || `Baixa automatica do pedido ${orderId}`,
    });
  }

  if (movementRows.length) {
    await tx.stockMovement.createMany({
      data: movementRows,
    });
  }

  return movementRows;
}
