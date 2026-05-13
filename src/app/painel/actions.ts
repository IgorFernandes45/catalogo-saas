"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { requireStoreUser, verifyPassword } from "@/lib/auth";
import {
  createStoreCategory,
  deleteStoreCategory,
  updateStoreCategory,
} from "@/lib/categories";
import type {
  MutationActionResult,
  ProductFormActionResult,
} from "@/lib/product-action-results";
import {
  appendStoreProductVariant,
  createStoreProduct,
  deleteStoreProduct,
  updateStoreProduct,
} from "@/lib/products";
import { prisma } from "@/lib/prisma";
import { applyOrderStockDecreaseBatch, applyStockMovement } from "@/lib/stock";
import {
  categorySchema,
  customerSchema,
  manualSaleSchema,
  productSchema,
  storeSchema,
} from "@/lib/validations";
import {
  parseCheckbox,
  parseCurrency,
  safeJsonParse,
  slugify,
} from "@/lib/utils";
import { parseCategoryVariantGroupsDefinition } from "@/lib/category-variant-groups";
import { parseVariantDefinitions } from "@/lib/variant-definitions";

function profilePayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: slugify(String(formData.get("slug") || formData.get("name") || "")),
    description: String(formData.get("description") ?? "").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim(),
    bannerUrl: String(formData.get("bannerUrl") ?? "").trim(),
    whatsappNumber: String(formData.get("whatsappNumber") ?? "").replace(/\D/g, ""),
    email: String(formData.get("email") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    primaryColor: String(formData.get("primaryColor") ?? "#102542"),
    secondaryColor: String(formData.get("secondaryColor") ?? "#f97316"),
    accentColor: String(formData.get("accentColor") ?? "#22c55e"),
    themeMode: String(formData.get("themeMode") ?? "light"),
    catalogUsesImages: parseCheckbox(formData.get("catalogUsesImages")),
    catalogProfile: String(formData.get("catalogProfile") ?? "CUSTOM"),
    productAttributesJson: String(formData.get("productAttributesJson") ?? "").trim(),
    status: parseCheckbox(formData.get("status")),
  };
}

function parseCategoryAttributes(rawAttributes: string) {
  return rawAttributes
    ? rawAttributes
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, fieldType = "TEXT", required = "nao", options = ""] = line
            .split("|")
            .map((item) => item.trim());

          return {
            name,
            fieldType: fieldType.toUpperCase(),
            isRequired: /sim|true|1/i.test(required),
            options: options
              ? options
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean)
              : [],
          };
        })
    : [];
}

function categoryPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: slugify(String(formData.get("slug") || formData.get("name") || "")),
    description: String(formData.get("description") ?? "").trim(),
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
    isActive: parseCheckbox(formData.get("isActive")),
    useStock: parseCheckbox(formData.get("useStock")),
    useColor: parseCheckbox(formData.get("useColor")),
    useSize: parseCheckbox(formData.get("useSize")),
    useFabric: parseCheckbox(formData.get("useFabric")),
    useDescription: parseCheckbox(formData.get("useDescription")),
    allowCustomAttributes: parseCheckbox(formData.get("allowCustomAttributes")),
    variantGroups: parseCategoryVariantGroupsDefinition(
      String(formData.get("variantGroupsDefinition") ?? "").trim(),
    ),
    attributes: parseCategoryAttributes(
      String(formData.get("attributesDefinition") ?? "").trim(),
    ),
  };
}

function productPayload(formData: FormData) {
  const gallery = String(formData.get("gallery") ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  const variants = parseVariantDefinitions(String(formData.get("variantsDefinition") ?? ""));
  const firstVariant = variants[0];
  const firstVariantPrice = firstVariant?.priceOverride ?? 0;
  const firstVariantPromotionalPrice = firstVariant?.promotionalPriceOverride;
  const firstVariantCostPrice = firstVariant?.costPriceOverride;

  const customValues = safeJsonParse<Array<{ attributeId: string; valueText: string }>>(
    String(formData.get("customValues") ?? "[]"),
    [],
  );

  return {
    categoryId: String(formData.get("categoryId") ?? ""),
    parentProductId: String(formData.get("parentProductId") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    slug: slugify(String(formData.get("slug") || formData.get("name") || "")),
    shortDescription: String(formData.get("shortDescription") ?? "").trim(),
    fullDescription: String(formData.get("fullDescription") ?? "").trim(),
    brandSupplier: String(formData.get("brandSupplier") ?? "").trim(),
    attributesJson: String(formData.get("productAttributesJson") ?? "").trim(),
    sku: String(formData.get("sku") ?? "").trim(),
    barcode: String(formData.get("barcode") ?? "").trim(),
    price: variants.length ? firstVariantPrice : parseCurrency(formData.get("price")),
    promotionalPrice: formData.get("promotionalPrice")
      ? parseCurrency(formData.get("promotionalPrice"))
      : firstVariantPromotionalPrice,
    costPrice: formData.get("costPrice")
      ? parseCurrency(formData.get("costPrice"))
      : firstVariantCostPrice,
    profitMarginPercent: formData.get("profitMarginPercent")
      ? Number(formData.get("profitMarginPercent"))
      : undefined,
    imageUrl: String(formData.get("imageUrl") ?? "").trim(),
    gallery,
    isActive: parseCheckbox(formData.get("isActive")),
    isFeatured: parseCheckbox(formData.get("isFeatured")),
    trackStock: parseCheckbox(formData.get("trackStock")),
    stockQuantity: formData.get("stockQuantity")
      ? Number(formData.get("stockQuantity"))
      : undefined,
    color: String(formData.get("color") ?? "").trim(),
    size: String(formData.get("size") ?? "").trim(),
    fabric: String(formData.get("fabric") ?? "").trim(),
    weight: String(formData.get("weight") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    customValues,
    variants,
  };
}

function getVariantSalePrice(productPrice: number, variant: {
  priceOverride?: unknown;
  promotionalPriceOverride?: unknown;
  discountPercent?: unknown;
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

export async function updateProfileAction(
  formData: FormData,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();
  const parsed = storeSchema.safeParse(profilePayload(formData));

  if (!parsed.success || !user.storeId) {
    return {
      status: "error",
      message: parsed.error?.issues[0]?.message || "Dados invalidos.",
      resetToken: Date.now(),
    };
  }

  const currentStore = await prisma.store.findUnique({
    where: { id: user.storeId! },
    select: { slug: true },
  });

  await prisma.store.update({
    where: { id: user.storeId },
    data: {
      ...parsed.data,
      logoUrl: parsed.data.logoUrl || null,
      bannerUrl: parsed.data.bannerUrl || null,
      productAttributesJson: parsed.data.productAttributesJson || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      storeId: user.storeId,
      action: "UPDATE_STORE_PROFILE",
      entityType: "STORE",
      entityId: user.storeId,
    },
  });

  const storeSlugs = new Set(
    [currentStore?.slug, parsed.data.slug].filter(Boolean) as string[],
  );

  storeSlugs.forEach((slug) => {
    revalidatePath(`/loja/${slug}`);
    revalidatePath(`/loja/${slug}/carrinho`);
  });

  return {
    status: "success",
    message: "Perfil atualizado com sucesso.",
    resetToken: Date.now(),
  };
}

export async function createCategoryAction(
  formData: FormData,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();
  const parsed = categorySchema.safeParse(categoryPayload(formData));

  if (!parsed.success || !user.storeId) {
    return {
      status: "error",
      message: parsed.error?.issues[0]?.message || "Dados invalidos.",
      resetToken: Date.now(),
    };
  }

  const category = await createStoreCategory({
    storeId: user.storeId,
    input: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      storeId: user.storeId,
      action: "CREATE_CATEGORY",
      entityType: "CATEGORY",
      entityId: category.id,
    },
  });

  const store = await prisma.store.findUnique({
    where: { id: user.storeId },
    select: { slug: true },
  });

  if (store) {
    revalidatePath(`/loja/${store.slug}`);
    revalidatePath(`/loja/${store.slug}/carrinho`);
  }
  revalidatePath(`/painel/categorias`);

  return {
    status: "success",
    message: "Categoria criada com sucesso.",
    resetToken: Date.now(),
  };
}

export async function updateCategoryAction(
  categoryId: string,
  formData: FormData,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();
  const parsed = categorySchema.safeParse(categoryPayload(formData));

  if (!parsed.success || !user.storeId || !categoryId) {
    return {
      status: "error",
      message: parsed.error?.issues[0]?.message || "Dados invalidos.",
      resetToken: Date.now(),
    };
  }

  try {
    const category = await updateStoreCategory({
      storeId: user.storeId,
      categoryId,
      input: parsed.data,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        storeId: user.storeId,
        action: "UPDATE_CATEGORY",
        entityType: "CATEGORY",
        entityId: category.id,
      },
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar a categoria.",
      resetToken: Date.now(),
    };
  }

  const store = await prisma.store.findUnique({
    where: { id: user.storeId },
    select: { slug: true },
  });

  if (store) {
    revalidatePath(`/loja/${store.slug}`);
    revalidatePath(`/loja/${store.slug}/carrinho`);
  }
  revalidatePath(`/painel/categorias`);

  return {
    status: "success",
    message: "Categoria atualizada com sucesso.",
    resetToken: Date.now(),
  };
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();

  if (!user.storeId || !categoryId) {
    return {
      status: "error",
      message: "Categoria invalida.",
      resetToken: Date.now(),
    };
  }

  try {
    const deleted = await deleteStoreCategory({
      storeId: user.storeId,
      categoryId,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        storeId: user.storeId,
        action: "DELETE_CATEGORY",
        entityType: "CATEGORY",
        entityId: categoryId,
      },
    });

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      select: { slug: true },
    });

    if (store) {
      revalidatePath(`/loja/${store.slug}`);
      revalidatePath(`/loja/${store.slug}/carrinho`);
    }
    revalidatePath(`/painel/categorias`);

    return {
      status: "success",
      message: `Categoria ${deleted.categoryName} excluida com sucesso.`,
      resetToken: Date.now(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível excluir a categoria.",
      resetToken: Date.now(),
    };
  }
}

export async function createProductAction(
  formData: FormData,
): Promise<ProductFormActionResult> {
  const user = await requireStoreUser();
  const parsed = productSchema.safeParse(productPayload(formData));

  if (!parsed.success || !user.storeId) {
    return {
      status: "error",
      message: parsed.error?.issues[0]?.message || "Dados invalidos.",
      resetToken: Date.now(),
    };
  }

  try {
    const productInput = {
      ...parsed.data,
      shortDescription: parsed.data.shortDescription || "",
      fullDescription: parsed.data.fullDescription || "",
      brandSupplier: parsed.data.brandSupplier || "",
      attributesJson: parsed.data.attributesJson || "",
      sku: parsed.data.sku || "",
      barcode: parsed.data.barcode || "",
      imageUrl: parsed.data.imageUrl || "",
      gallery: parsed.data.gallery,
      costPrice: parsed.data.costPrice,
      profitMarginPercent: parsed.data.profitMarginPercent,
      stockQuantity: parsed.data.stockQuantity || 0,
      color: parsed.data.color || "",
      size: parsed.data.size || "",
      fabric: parsed.data.fabric || "",
      weight: parsed.data.weight || "",
      notes: parsed.data.notes || "",
      customValues: parsed.data.customValues,
      variants: parsed.data.variants,
    };
    const { product } = parsed.data.parentProductId
      ? await appendStoreProductVariant({
          storeId: user.storeId,
          parentProductId: parsed.data.parentProductId,
          input: productInput,
        })
      : await createStoreProduct({
          storeId: user.storeId,
          input: productInput,
        });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        storeId: user.storeId,
        action: "CREATE_PRODUCT",
        entityType: "PRODUCT",
        entityId: product.id,
      },
    });

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      select: { slug: true },
    });

    if (store) {
      revalidatePath(`/loja/${store.slug}`);
      revalidatePath(`/loja/${store.slug}/produto/${product.slug}`);
      revalidatePath(`/loja/${store.slug}/carrinho`);
    }
    revalidatePath(`/painel/produtos`);
    revalidatePath(`/painel/estoque`);
    revalidatePath(`/painel/produtos/${product.id}/editar`);

    return {
      status: "success",
      message: parsed.data.parentProductId
        ? "Variacao adicionada ao produto com sucesso."
        : "Produto criado com sucesso.",
      resetToken: Date.now(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível criar o produto.",
      resetToken: Date.now(),
    };
  }
}

export async function updateProductAction(
  productId: string,
  formData: FormData,
): Promise<ProductFormActionResult> {
  const user = await requireStoreUser();
  const parsed = productSchema.safeParse(productPayload(formData));

  if (!parsed.success || !user.storeId || !productId) {
    return {
      status: "error",
      message: parsed.error?.issues[0]?.message || "Dados invalidos.",
      resetToken: Date.now(),
    };
  }

  try {
    const { product, previousSlug } = await updateStoreProduct({
      storeId: user.storeId,
      productId,
      input: {
        ...parsed.data,
        shortDescription: parsed.data.shortDescription || "",
        fullDescription: parsed.data.fullDescription || "",
        brandSupplier: parsed.data.brandSupplier || "",
        attributesJson: parsed.data.attributesJson || "",
        sku: parsed.data.sku || "",
        barcode: parsed.data.barcode || "",
        imageUrl: parsed.data.imageUrl || "",
        gallery: parsed.data.gallery,
        costPrice: parsed.data.costPrice,
        profitMarginPercent: parsed.data.profitMarginPercent,
        stockQuantity: parsed.data.stockQuantity || 0,
        color: parsed.data.color || "",
        size: parsed.data.size || "",
        fabric: parsed.data.fabric || "",
        weight: parsed.data.weight || "",
        notes: parsed.data.notes || "",
        customValues: parsed.data.customValues,
        variants: parsed.data.variants,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        storeId: user.storeId,
        action: "UPDATE_PRODUCT",
        entityType: "PRODUCT",
        entityId: product.id,
      },
    });

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      select: { slug: true },
    });

    if (store) {
      revalidatePath(`/loja/${store.slug}`);
      revalidatePath(`/loja/${store.slug}/carrinho`);
      revalidatePath(`/loja/${store.slug}/produto/${previousSlug}`);
      revalidatePath(`/loja/${store.slug}/produto/${product.slug}`);
    }
    revalidatePath(`/painel/produtos`);
    revalidatePath(`/painel/estoque`);
    revalidatePath(`/painel/produtos/${product.id}/editar`);

    return {
      status: "success",
      message: "Produto atualizado com sucesso.",
      resetToken: Date.now(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o produto.",
      resetToken: Date.now(),
    };
  }
}

export async function deleteProductAction(
  productId: string,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();

  if (!user.storeId || !productId) {
    return {
      status: "error",
      message: "Produto invalido.",
      resetToken: Date.now(),
    };
  }

  try {
    const result = await deleteStoreProduct({
      storeId: user.storeId,
      productId,
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        storeId: user.storeId,
        action: result.mode === "deleted" ? "DELETE_PRODUCT" : "ARCHIVE_PRODUCT",
        entityType: "PRODUCT",
        entityId: productId,
      },
    });

    const store = await prisma.store.findUnique({
      where: { id: user.storeId },
      select: { slug: true },
    });

    if (store) {
      revalidatePath(`/loja/${store.slug}`);
      revalidatePath(`/loja/${store.slug}/carrinho`);
      revalidatePath(`/loja/${store.slug}/produto/${result.productSlug}`);
    }
    revalidatePath(`/painel/produtos`);
    revalidatePath(`/painel/estoque`);
    revalidatePath(`/painel/produtos/${productId}/editar`);

    return {
      status: "success",
      message:
        result.mode === "deleted"
          ? `Produto ${result.productName} excluido com sucesso.`
          : `Produto ${result.productName} desativado para preservar o historico de vendas e estoque.`,
      resetToken: Date.now(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o produto.",
      resetToken: Date.now(),
    };
  }
}

function customerPayload(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    document: String(formData.get("document") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    number: String(formData.get("number") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    complement: String(formData.get("complement") ?? "").trim(),
    reference: String(formData.get("reference") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

export async function createCustomerAction(
  formData: FormData,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();
  const parsed = customerSchema.safeParse(customerPayload(formData));

  if (!parsed.success || !user.storeId) {
    return {
      status: "error",
      message: parsed.error?.issues[0]?.message || "Dados invalidos.",
      resetToken: Date.now(),
    };
  }

  const customer = await prisma.customer.create({
    data: {
      storeId: user.storeId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      document: parsed.data.document || null,
      address: parsed.data.address || null,
      number: parsed.data.number || null,
      district: parsed.data.district || null,
      city: parsed.data.city || null,
      complement: parsed.data.complement || null,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      storeId: user.storeId,
      action: "CREATE_CUSTOMER",
      entityType: "CUSTOMER",
      entityId: customer.id,
    },
  });

  revalidatePath("/painel/clientes");

  return {
    status: "success",
    message: `Cliente ${customer.name} cadastrado com sucesso.`,
    resetToken: Date.now(),
  };
}

export async function adjustProductStockAction(
  formData: FormData,
): Promise<ProductFormActionResult> {
  const user = await requireStoreUser();
  const productId = String(formData.get("productId") ?? "");
  const productVariantId = String(formData.get("productVariantId") ?? "").trim();
  const movementType = String(formData.get("movementType") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim();

  if (
    !user.storeId ||
    !productId ||
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    !["MANUAL_DECREASE", "MANUAL_INCREASE", "STOCK_SET"].includes(movementType)
  ) {
    return {
      status: "error",
      message: "Movimentacao de estoque invalida.",
      resetToken: Date.now(),
    };
  }

  try {
    const movement = await prisma.$transaction(async (tx) =>
      applyStockMovement({
        tx,
        storeId: user.storeId!,
        productId,
        productVariantId: productVariantId || null,
        quantity,
        type: movementType as "MANUAL_DECREASE" | "MANUAL_INCREASE" | "STOCK_SET",
        userId: user.id,
        notes:
          notes ||
          (movementType === "STOCK_SET"
            ? "Ajuste direto de estoque"
            : movementType === "MANUAL_DECREASE"
            ? "Baixa manual de estoque"
            : "Reposicao manual de estoque"),
      }),
    );

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        storeId: user.storeId,
        action: movementType,
        entityType: "PRODUCT",
        entityId: productId,
      },
    });

    return {
      status: "success",
      message: `Estoque de ${movement.productName} atualizado para ${movement.quantityAfter} unidades.`,
      resetToken: Date.now(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Não foi possível mover o estoque.",
      resetToken: Date.now(),
    };
  }
}

export async function updateOrderStatusAction(
  formData: FormData,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  const paymentMethod = String(formData.get("paymentMethod") ?? "PIX");
  const storeId = user.storeId;

  if (user.store?.accessMode === "CATALOG_ONLY") {
    return {
      status: "error",
      message: "Esta loja está em modo somente catálogo.",
      resetToken: Date.now(),
    };
  }

  if (!storeId || !orderId || !["SOLD", "CANCELLED"].includes(status)) {
    return {
      status: "error",
      message: "Atualizacao invalida.",
      resetToken: Date.now(),
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: { id: orderId, storeId },
          include: {
            items: {
              select: {
                productId: true,
                productVariantId: true,
                quantity: true,
              },
            },
          },
        });

        if (!order) {
          throw new Error("Pedido não encontrado para esta loja.");
        }

        if (order.status !== "PENDING") {
          throw new Error("Este pedido ja foi finalizado e saiu da fila.");
        }

        const nextStatus = status as "SOLD" | "CANCELLED";

        if (nextStatus === "SOLD") {
          await applyOrderStockDecreaseBatch({
            tx,
            storeId,
            orderId: order.id,
            items: order.items.flatMap((item) =>
              item.productId
                ? [
                    {
                      productId: item.productId,
                      productVariantId: item.productVariantId,
                      quantity: item.quantity,
                    },
                  ]
                : [],
            ),
          });
        }

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: nextStatus,
            paymentMethod:
              nextStatus === "SOLD" &&
              ["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "OTHER"].includes(paymentMethod)
                ? (paymentMethod as "CASH" | "PIX" | "DEBIT_CARD" | "CREDIT_CARD" | "BANK_TRANSFER" | "OTHER")
                : order.paymentMethod,
          },
        });
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Não foi possível atualizar o pedido.",
      resetToken: Date.now(),
    };
  }

  await prisma.auditLog.create({
    data: {
        userId: user.id,
        storeId,
        action: "UPDATE_ORDER_STATUS",
      entityType: "ORDER",
      entityId: orderId,
    },
  });

  return {
    status: "success",
    message: "Status atualizado com sucesso.",
    resetToken: Date.now(),
  };
}

export async function createManualSaleAction(
  formData: FormData,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();

  if (user.store?.accessMode === "CATALOG_ONLY") {
    return {
      status: "error",
      message: "Esta loja está em modo somente catálogo.",
      resetToken: Date.now(),
    };
  }

  if (!user.storeId) {
    return {
      status: "error",
      message: "Loja não encontrada para este usuário.",
      resetToken: Date.now(),
    };
  }

  const parsed = manualSaleSchema.safeParse({
    productId: String(formData.get("productId") ?? ""),
    productVariantId: String(formData.get("productVariantId") ?? "").trim() || undefined,
    quantity: Number(formData.get("quantity") ?? 0),
    paymentMethod: String(formData.get("paymentMethod") ?? "OTHER") || "OTHER",
    customerId: String(formData.get("customerId") ?? "").trim() || undefined,
    customerName: String(formData.get("customerName") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message || "Venda manual invalida.",
      resetToken: Date.now(),
    };
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findFirst({
          where: {
            id: parsed.data.productId,
            storeId: user.storeId!,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            price: true,
            promotionalPrice: true,
            costPrice: true,
          },
        });
        const variant = parsed.data.productVariantId
          ? await tx.productVariant.findFirst({
              where: {
                id: parsed.data.productVariantId,
                productId: parsed.data.productId,
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
            })
          : null;

        if (!product) {
          throw new Error("Produto não encontrado para esta loja.");
        }

        if (parsed.data.productVariantId && !variant) {
          throw new Error("Variação não encontrada para este produto.");
        }

        if (parsed.data.customerId) {
          const customerExists = await tx.customer.findFirst({
            where: { id: parsed.data.customerId, storeId: user.storeId! },
            select: { id: true },
          });
          if (!customerExists) {
            throw new Error("Cliente não encontrado para esta loja.");
          }
        }

        const unitPrice = variant
          ? getVariantSalePrice(Number(product.price), variant)
          : Number(product.promotionalPrice ?? product.price);
        const unitCost = Number(variant?.costPriceOverride ?? product.costPrice ?? 0);
        const unitProfit = Math.max(0, unitPrice - unitCost);
        const subtotal = unitPrice * parsed.data.quantity;
        const profit = unitProfit * parsed.data.quantity;

        const order = await tx.order.create({
          data: {
            storeId: user.storeId!,
            customerId: parsed.data.customerId || null,
            customerName: parsed.data.customerName || "Venda presencial",
            customerPhone: "Não informado",
            deliveryAddress: "Venda presencial",
            deliveryDistrict: "Balcão",
            deliveryCity: "Loja física",
            notes: parsed.data.notes || "Venda registrada manualmente no painel.",
            subtotal,
            paymentMethod: parsed.data.paymentMethod || "OTHER",
            status: "SOLD",
            items: {
              create: {
                productId: product.id,
                productVariantId: variant?.id || null,
                productNameSnapshot: product.name,
                productVariantLabelSnapshot: variant?.label || null,
                quantity: parsed.data.quantity,
                unitPrice,
                costPriceSnapshot: unitCost || null,
                profitSnapshot: profit,
              },
            },
          },
        });

        await applyOrderStockDecreaseBatch({
          tx,
          storeId: user.storeId!,
          orderId: order.id,
          items: [
            {
              productId: product.id,
              productVariantId: variant?.id || null,
              quantity: parsed.data.quantity,
            },
          ],
        });

        return {
          orderId: order.id,
          productName: variant ? `${product.name} - ${variant.label}` : product.name,
          quantity: parsed.data.quantity,
        };
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        storeId: user.storeId,
        action: "CREATE_MANUAL_SALE",
        entityType: "ORDER",
        entityId: result.orderId,
      },
    });

    return {
      status: "success",
      message: `Venda manual registrada para ${result.productName} (${result.quantity} un.).`,
      resetToken: Date.now(),
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Não foi possível registrar a venda.",
      resetToken: Date.now(),
    };
  }
}

export async function changePasswordAction(
  formData: FormData,
): Promise<MutationActionResult> {
  const user = await requireStoreUser();
  const currentPassword = String(formData.get("currentPassword") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { status: "error", message: "Preencha todos os campos.", resetToken: Date.now() };
  }

  if (newPassword.length < 6) {
    return { status: "error", message: "A nova senha precisa ter pelo menos 6 caracteres.", resetToken: Date.now() };
  }

  if (newPassword !== confirmPassword) {
    return { status: "error", message: "A confirmação de senha não confere.", resetToken: Date.now() };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });

  if (!dbUser) {
    return { status: "error", message: "Usuário não encontrado.", resetToken: Date.now() };
  }

  const valid = await verifyPassword(currentPassword, dbUser.passwordHash);

  if (!valid) {
    return { status: "error", message: "Senha atual incorreta.", resetToken: Date.now() };
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { status: "success", message: "Senha alterada com sucesso.", resetToken: Date.now() };
}

export async function reorderCategoriesAction(
  orderedIds: string[],
): Promise<MutationActionResult> {
  const user = await requireStoreUser();

  if (!user.storeId || !orderedIds.length) {
    return { status: "error", message: "Dados invalidos.", resetToken: Date.now() };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.category.updateMany({
        where: { id, storeId: user.storeId! },
        data: { sortOrder: index },
      }),
    ),
  );

  revalidatePath("/painel/categorias");
  revalidatePath(`/loja/${user.store?.slug}`);

  return { status: "success", message: "Ordem salva.", resetToken: Date.now() };
}
