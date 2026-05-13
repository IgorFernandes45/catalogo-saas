import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { parseVariantAttributesJson } from "@/lib/variant-definitions";

type ProductTransaction = Prisma.TransactionClient;

export type StoreProductInput = {
  categoryId: string;
  name: string;
  slug: string;
  shortDescription?: string;
  fullDescription?: string;
  brandSupplier?: string;
  attributesJson?: string;
  sku?: string;
  barcode?: string;
  price: number;
  promotionalPrice?: number;
  costPrice?: number;
  profitMarginPercent?: number;
  imageUrl?: string;
  gallery?: string[];
  isActive: boolean;
  isFeatured: boolean;
  trackStock: boolean;
  stockQuantity?: number;
  color?: string;
  size?: string;
  fabric?: string;
  weight?: string;
  notes?: string;
  customValues: Array<{ attributeId: string; valueText: string }>;
  variants: Array<{
    label: string;
    sku?: string;
    barcode?: string;
    imageUrl?: string;
    priceOverride?: number;
    promotionalPriceOverride?: number;
    discountPercent?: number;
    costPriceOverride?: number;
    stockQuantity: number;
    isActive: boolean;
    attributes: Record<string, string>;
  }>;
};

type CreateStoreProductInput = {
  tx?: ProductTransaction;
  storeId: string;
  input: StoreProductInput;
};

type UpdateStoreProductInput = CreateStoreProductInput & {
  productId: string;
};

type AppendStoreProductVariantInput = {
  tx?: ProductTransaction;
  storeId: string;
  parentProductId: string;
  input: StoreProductInput;
};

type DeleteStoreProductInput = {
  tx?: ProductTransaction;
  storeId: string;
  productId: string;
};

function normalizeVariantKey(value: string) {
  return value.trim().toLowerCase();
}

function assertUniqueProductVariants(variants: StoreProductInput["variants"]) {
  const seen = new Set<string>();

  for (const variant of variants) {
    if (!variant.priceOverride || variant.priceOverride <= 0) {
      throw new Error("Toda variação precisa ter preço de venda próprio.");
    }

    const key = Object.entries(variant.attributes)
      .sort(([left], [right]) => normalizeVariantKey(left).localeCompare(normalizeVariantKey(right)))
      .map(([name, value]) => `${normalizeVariantKey(name)}=${normalizeVariantKey(value)}`)
      .join("|");

    if (seen.has(key)) {
      throw new Error("Existem variações repetidas neste produto.");
    }

    seen.add(key);
  }
}

function getProductPriceFromInput(input: StoreProductInput) {
  const firstVariant = input.variants[0];

  if (!firstVariant) {
    return {
      price: input.price,
      promotionalPrice: input.promotionalPrice || null,
      costPrice: input.costPrice ?? null,
    };
  }

  return {
    price: firstVariant.priceOverride || input.price,
    promotionalPrice: firstVariant.promotionalPriceOverride || null,
    costPrice: firstVariant.costPriceOverride ?? input.costPrice ?? null,
  };
}

export async function createStoreProduct({
  tx,
  storeId,
  input,
}: CreateStoreProductInput) {
  const db = tx ?? prisma;

  const category = await db.category.findFirst({
    where: {
      id: input.categoryId,
      storeId,
    },
    include: { attributes: true },
  });

  if (!category) {
    throw new Error("Categoria não encontrada para esta loja.");
  }

  assertUniqueProductVariants(input.variants);
  const pricing = getProductPriceFromInput(input);
  const firstVariantWithImage = input.variants.find((variant) => variant.imageUrl?.trim());

  const product = await db.product.create({
    data: {
      storeId,
      categoryId: category.id,
      name: input.name,
      slug: input.slug,
      shortDescription: input.shortDescription?.trim() || null,
      fullDescription: input.fullDescription?.trim() || null,
      brandSupplier: input.brandSupplier?.trim() || null,
      attributesJson: input.attributesJson?.trim() || null,
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
      price: pricing.price,
      promotionalPrice: pricing.promotionalPrice,
      costPrice: pricing.costPrice,
      profitMarginPercent: input.profitMarginPercent ?? null,
      imageUrl: input.imageUrl?.trim() || firstVariantWithImage?.imageUrl?.trim() || null,
      galleryJson: input.gallery?.length ? JSON.stringify(input.gallery) : null,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      trackStock: input.variants.length ? true : input.trackStock,
      stockQuantity:
        input.variants.length || !input.trackStock ? null : input.stockQuantity || 0,
      color: category.useColor ? input.color?.trim() || null : null,
      size: category.useSize ? input.size?.trim() || null : null,
      fabric: category.useFabric ? input.fabric?.trim() || null : null,
      weight: input.weight?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  const allowedAttributeIds = new Set(category.attributes.map((attribute) => attribute.id));
  const values = input.customValues.filter(
    (item) => allowedAttributeIds.has(item.attributeId) && item.valueText.trim(),
  );

  if (values.length) {
    await db.productCustomAttributeValue.createMany({
      data: values.map((item) => ({
        productId: product.id,
        attributeId: item.attributeId,
        valueText: item.valueText,
      })),
    });
  }

  if (input.variants.length) {
    await db.productVariant.createMany({
      data: input.variants.map((variant) => ({
        productId: product.id,
        label: variant.label,
        sku: variant.sku?.trim() || null,
        barcode: variant.barcode?.trim() || null,
        imageUrl: variant.imageUrl?.trim() || null,
        priceOverride: variant.priceOverride || null,
        promotionalPriceOverride: variant.promotionalPriceOverride || null,
        discountPercent: variant.discountPercent ?? null,
        costPriceOverride: variant.costPriceOverride ?? null,
        stockQuantity: variant.stockQuantity,
        isActive: variant.isActive,
        attributesJson: JSON.stringify(variant.attributes),
      })),
    });
  }

  return { product, category };
}

export async function appendStoreProductVariant({
  tx,
  storeId,
  parentProductId,
  input,
}: AppendStoreProductVariantInput) {
  const db = tx ?? prisma;
  const nextVariant = input.variants[0];

  if (!nextVariant) {
    throw new Error("Informe os dados da variação antes de salvar.");
  }

  const product = await db.product.findFirst({
    where: {
      id: parentProductId,
      storeId,
    },
    include: {
      variants: {
        select: {
          attributesJson: true,
          barcode: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("Produto base não encontrado para esta loja.");
  }

  assertUniqueProductVariants([
    ...product.variants.map((variant) => ({
      ...nextVariant,
      attributes: parseVariantAttributesJson(variant.attributesJson),
    })),
    nextVariant,
  ]);

  if (
    nextVariant.barcode?.trim()
    && product.variants.some((variant) => variant.barcode === nextVariant.barcode?.trim())
  ) {
    throw new Error("Já existe uma variação com este código de barras.");
  }

  await db.product.update({
    where: { id: product.id },
    data: {
      price: product.price || nextVariant.priceOverride || 0,
      promotionalPrice: product.promotionalPrice || nextVariant.promotionalPriceOverride || null,
      costPrice: product.costPrice || nextVariant.costPriceOverride || null,
      imageUrl: product.imageUrl || nextVariant.imageUrl?.trim() || null,
      trackStock: true,
      stockQuantity: null,
      updatedAt: new Date(),
    },
  });

  await db.productVariant.create({
    data: {
      productId: product.id,
      label: nextVariant.label,
      sku: nextVariant.sku?.trim() || null,
      barcode: nextVariant.barcode?.trim() || null,
      imageUrl: nextVariant.imageUrl?.trim() || null,
      priceOverride: nextVariant.priceOverride || null,
      promotionalPriceOverride: nextVariant.promotionalPriceOverride || null,
      discountPercent: nextVariant.discountPercent ?? null,
      costPriceOverride: nextVariant.costPriceOverride ?? null,
      stockQuantity: nextVariant.stockQuantity,
      isActive: nextVariant.isActive,
      attributesJson: JSON.stringify(nextVariant.attributes),
    },
  });

  return { product };
}

export async function updateStoreProduct({
  tx,
  storeId,
  productId,
  input,
}: UpdateStoreProductInput) {
  const db = tx ?? prisma;

  const [category, existingProduct] = await Promise.all([
    db.category.findFirst({
      where: {
        id: input.categoryId,
        storeId,
      },
      include: { attributes: true },
    }),
    db.product.findFirst({
      where: {
        id: productId,
        storeId,
      },
      select: {
        id: true,
        slug: true,
      },
    }),
  ]);

  if (!category) {
    throw new Error("Categoria não encontrada para esta loja.");
  }

  if (!existingProduct) {
    throw new Error("Produto não encontrado para esta loja.");
  }

  assertUniqueProductVariants(input.variants);
  const pricing = getProductPriceFromInput(input);
  const firstVariantWithImage = input.variants.find((variant) => variant.imageUrl?.trim());

  const product = await db.product.update({
    where: { id: existingProduct.id },
    data: {
      categoryId: category.id,
      name: input.name,
      slug: input.slug,
      shortDescription: input.shortDescription?.trim() || null,
      fullDescription: input.fullDescription?.trim() || null,
      brandSupplier: input.brandSupplier?.trim() || null,
      attributesJson: input.attributesJson?.trim() || null,
      sku: input.sku?.trim() || null,
      barcode: input.barcode?.trim() || null,
      price: pricing.price,
      promotionalPrice: pricing.promotionalPrice,
      costPrice: pricing.costPrice,
      profitMarginPercent: input.profitMarginPercent ?? null,
      imageUrl: input.imageUrl?.trim() || firstVariantWithImage?.imageUrl?.trim() || null,
      galleryJson: input.gallery?.length ? JSON.stringify(input.gallery) : null,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      trackStock: input.variants.length ? true : input.trackStock,
      stockQuantity:
        input.variants.length || !input.trackStock ? null : input.stockQuantity || 0,
      color: category.useColor ? input.color?.trim() || null : null,
      size: category.useSize ? input.size?.trim() || null : null,
      fabric: category.useFabric ? input.fabric?.trim() || null : null,
      weight: input.weight?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });

  await db.productCustomAttributeValue.deleteMany({
    where: {
      productId: product.id,
    },
  });

  const allowedAttributeIds = new Set(category.attributes.map((attribute) => attribute.id));
  const values = input.customValues.filter(
    (item) => allowedAttributeIds.has(item.attributeId) && item.valueText.trim(),
  );

  if (values.length) {
    await db.productCustomAttributeValue.createMany({
      data: values.map((item) => ({
        productId: product.id,
        attributeId: item.attributeId,
        valueText: item.valueText,
      })),
    });
  }

  await db.productVariant.deleteMany({
    where: {
      productId: product.id,
    },
  });

  if (input.variants.length) {
    await db.productVariant.createMany({
      data: input.variants.map((variant) => ({
        productId: product.id,
        label: variant.label,
        sku: variant.sku?.trim() || null,
        barcode: variant.barcode?.trim() || null,
        imageUrl: variant.imageUrl?.trim() || null,
        priceOverride: variant.priceOverride || null,
        promotionalPriceOverride: variant.promotionalPriceOverride || null,
        discountPercent: variant.discountPercent ?? null,
        costPriceOverride: variant.costPriceOverride ?? null,
        stockQuantity: variant.stockQuantity,
        isActive: variant.isActive,
        attributesJson: JSON.stringify(variant.attributes),
      })),
    });
  }

  return {
    product,
    previousSlug: existingProduct.slug,
    category,
  };
}

export async function deleteStoreProduct({
  tx,
  storeId,
  productId,
}: DeleteStoreProductInput) {
  const db = tx ?? prisma;

  const product = await db.product.findFirst({
    where: {
      id: productId,
      storeId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      _count: {
        select: {
          orderItems: true,
          stockMovements: true,
          variants: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error("Produto não encontrado para esta loja.");
  }

  if (product._count.orderItems > 0 || product._count.stockMovements > 0) {
    await db.product.update({
      where: { id: product.id },
      data: {
        isActive: false,
      },
    });

    return {
      productName: product.name,
      productSlug: product.slug,
      mode: "archived" as const,
    };
  }

  await db.product.delete({
    where: { id: product.id },
  });

  return {
    productName: product.name,
    productSlug: product.slug,
    mode: "deleted" as const,
  };
}
