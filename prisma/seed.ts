import bcrypt from "bcryptjs";
import {
  AttributeFieldType,
  OrderStatus,
  PrismaClient,
  StockMovementType,
  UserRole,
  type Category,
  type CategoryCustomAttribute,
  type Product,
  type ProductCustomAttributeValue,
  type ProductVariant,
  type Store,
  type User,
} from "@prisma/client";

const prisma = new PrismaClient();

type AttributeSeed = {
  name: string;
  fieldType: AttributeFieldType;
  isRequired?: boolean;
  options?: string[];
};

type CategorySeed = {
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  useStock: boolean;
  useColor: boolean;
  useSize: boolean;
  useFabric: boolean;
  useDescription: boolean;
  allowCustomAttributes: boolean;
  attributes: AttributeSeed[];
};

type ProductSeed = {
  categorySlug: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  sku: string;
  price: number;
  promotionalPrice?: number;
  imageUrl: string;
  gallery?: string[];
  isFeatured?: boolean;
  stockQuantity: number;
  color?: string;
  size?: string;
  fabric?: string;
  weight?: string;
  notes?: string;
  customValues?: Record<string, string>;
  variants?: Array<{
    sku?: string;
    priceOverride?: number;
    stockQuantity: number;
    isActive?: boolean;
    attributes: Record<string, string>;
  }>;
};

type OrderSeed = {
  createdAt: Date;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNumber?: string;
  deliveryDistrict: string;
  deliveryCity: string;
  deliveryComplement?: string;
  deliveryReference?: string;
  notes?: string;
  status: OrderStatus;
  items: Array<{
    productSlug: string;
    quantity: number;
    variantAttributes?: Record<string, string>;
  }>;
};

type ManualMovementSeed = {
  createdAt: Date;
  productSlug: string;
  type: "MANUAL_DECREASE" | "MANUAL_INCREASE";
  quantity: number;
  notes: string;
  variantAttributes?: Record<string, string>;
};

type StoreSeed = {
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  bannerUrl: string;
  whatsappNumber: string;
  email: string;
  phone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeMode: string;
  adminName: string;
  adminEmail: string;
  categories: CategorySeed[];
  products: ProductSeed[];
  orders: OrderSeed[];
  manualMovements: ManualMovementSeed[];
};

function daysAgo(days: number, hour = 10, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function plusMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function money(value: unknown) {
  return Number(value || 0);
}

function isDecrease(type: StockMovementType) {
  return type === "MANUAL_DECREASE" || type === "ORDER_DECREASE";
}

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productCustomAttributeValue.deleteMany();
  await prisma.productImportSession.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categoryCustomAttribute.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.store.deleteMany();
}

async function createStockMovement({
  storeId,
  productId,
  productVariantId,
  variantLabelSnapshot,
  userId,
  orderId,
  type,
  quantity,
  notes,
  createdAt,
}: {
  storeId: string;
  productId: string;
  productVariantId?: string | null;
  variantLabelSnapshot?: string | null;
  userId?: string | null;
  orderId?: string | null;
  type: StockMovementType;
  quantity: number;
  notes: string;
  createdAt: Date;
}) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      trackStock: true,
      stockQuantity: true,
    },
  });

  if (!product) {
    throw new Error("Produto nao encontrado para movimentacao.");
  }

  if (!product.trackStock) {
    return;
  }

  if (productVariantId) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: productVariantId },
      select: {
        id: true,
        label: true,
        stockQuantity: true,
      },
    });

    if (!variant) {
      throw new Error("Variacao nao encontrada para movimentacao.");
    }

    const quantityBefore = variant.stockQuantity;
    const quantityAfter = isDecrease(type)
      ? quantityBefore - quantity
      : quantityBefore + quantity;

    if (quantityAfter < 0) {
      throw new Error(`Estoque insuficiente para ${variant.label}.`);
    }

    await prisma.productVariant.update({
      where: { id: productVariantId },
      data: {
        stockQuantity: quantityAfter,
      },
    });

    await prisma.stockMovement.create({
      data: {
        storeId,
        productId,
        productVariantId,
        variantLabelSnapshot: variantLabelSnapshot || variant.label,
        userId: userId || null,
        orderId: orderId || null,
        type,
        quantity,
        quantityBefore,
        quantityAfter,
        notes,
        createdAt,
      },
    });

    return;
  }

  const quantityBefore = product.stockQuantity ?? 0;
  const quantityAfter = isDecrease(type)
    ? quantityBefore - quantity
    : quantityBefore + quantity;

  if (quantityAfter < 0) {
    throw new Error(`Estoque insuficiente para ${product.name}.`);
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      stockQuantity: quantityAfter,
    },
  });

  await prisma.stockMovement.create({
    data: {
      storeId,
      productId,
      userId: userId || null,
      orderId: orderId || null,
      type,
      quantity,
      quantityBefore,
      quantityAfter,
      notes,
      createdAt,
    },
  });
}

async function createOrderScenario({
  store,
  storeUser,
  orderSeed,
  productsBySlug,
}: {
  store: Store;
  storeUser: User;
  orderSeed: OrderSeed;
  productsBySlug: Map<
    string,
    Product & {
      variants: ProductVariant[];
      customValues: Array<
        ProductCustomAttributeValue & {
          attribute: CategoryCustomAttribute;
        }
      >;
    }
  >;
}) {
  const products = orderSeed.items.map((item) => {
    const product = productsBySlug.get(item.productSlug);

    if (!product) {
      throw new Error(`Produto ${item.productSlug} nao encontrado para o pedido.`);
    }

    const variant =
      item.variantAttributes
        ? product.variants.find((entry) => {
            try {
              const attributes = JSON.parse(entry.attributesJson) as Record<string, string>;
              return Object.entries(item.variantAttributes || {}).every(
                ([key, value]) => attributes[key] === value,
              );
            } catch {
              return false;
            }
          }) || null
        : product.variants[0] || null;

    return {
      product,
      variant,
      quantity: item.quantity,
    };
  });

  const subtotal = products.reduce((total, item) => {
    const unitPrice = money(item.variant?.priceOverride ?? item.product.promotionalPrice ?? item.product.price);
    return total + unitPrice * item.quantity;
  }, 0);

  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      customerName: orderSeed.customerName,
      customerPhone: orderSeed.customerPhone,
      deliveryAddress: orderSeed.deliveryAddress,
      deliveryNumber: orderSeed.deliveryNumber || null,
      deliveryDistrict: orderSeed.deliveryDistrict,
      deliveryCity: orderSeed.deliveryCity,
      deliveryComplement: orderSeed.deliveryComplement || null,
      deliveryReference: orderSeed.deliveryReference || null,
      notes: orderSeed.notes || null,
      subtotal,
      status: orderSeed.status,
      whatsappSentAt: plusMinutes(orderSeed.createdAt, 2),
      createdAt: orderSeed.createdAt,
    },
  });

  await prisma.orderItem.createMany({
    data: products.map(({ product, variant, quantity }) => {
      const snapshot = [
        ...(variant?.label ? [variant.label] : []),
        !variant && product.color ? `Cor: ${product.color}` : null,
        !variant && product.size ? `Tam: ${product.size}` : null,
        product.fabric ? `Tecido: ${product.fabric}` : null,
        ...product.customValues.map(
          (customValue) => `${customValue.attribute.name}: ${customValue.valueText}`,
        ),
      ].filter(Boolean);

      return {
        orderId: order.id,
        productId: product.id,
        productVariantId: variant?.id || null,
        productNameSnapshot: product.name,
        productVariantLabelSnapshot: variant?.label || null,
        quantity,
        unitPrice: money(variant?.priceOverride ?? product.promotionalPrice ?? product.price),
        attributesSnapshotJson: snapshot.length ? JSON.stringify(snapshot) : null,
        createdAt: orderSeed.createdAt,
      };
    }),
  });

  if (orderSeed.status === OrderStatus.SOLD) {
    for (const { product, variant, quantity } of products) {
      await createStockMovement({
        storeId: store.id,
        productId: product.id,
        productVariantId: variant?.id || null,
        variantLabelSnapshot: variant?.label || null,
        userId: storeUser.id,
        orderId: order.id,
        type: StockMovementType.ORDER_DECREASE,
        quantity,
        notes: `Baixa automatica do pedido ${order.id}`,
        createdAt: plusMinutes(orderSeed.createdAt, 3),
      });
    }
  }

  return order;
}

async function createDemoStore({
  storeSeed,
  passwordHash,
}: {
  storeSeed: StoreSeed;
  passwordHash: string;
}) {
  const store = await prisma.store.create({
    data: {
      name: storeSeed.name,
      slug: storeSeed.slug,
      description: storeSeed.description,
      logoUrl: storeSeed.logoUrl,
      bannerUrl: storeSeed.bannerUrl,
      whatsappNumber: storeSeed.whatsappNumber,
      email: storeSeed.email,
      phone: storeSeed.phone,
      address: storeSeed.address,
      primaryColor: storeSeed.primaryColor,
      secondaryColor: storeSeed.secondaryColor,
      accentColor: storeSeed.accentColor,
      themeMode: storeSeed.themeMode,
      status: true,
    },
  });

  const categoriesBySlug = new Map<
    string,
    Category & { attributes: CategoryCustomAttribute[] }
  >();

  for (const categorySeed of storeSeed.categories) {
    const category = await prisma.category.create({
      data: {
        storeId: store.id,
        name: categorySeed.name,
        slug: categorySeed.slug,
        description: categorySeed.description,
        imageUrl: categorySeed.imageUrl,
        sortOrder: categorySeed.sortOrder,
        isActive: true,
        useStock: categorySeed.useStock,
        useColor: categorySeed.useColor,
        useSize: categorySeed.useSize,
        useFabric: categorySeed.useFabric,
        useDescription: categorySeed.useDescription,
        allowCustomAttributes: categorySeed.allowCustomAttributes,
        attributes: {
          create: categorySeed.attributes.map((attribute) => ({
            name: attribute.name,
            fieldType: attribute.fieldType,
            isRequired: attribute.isRequired ?? false,
            optionsJson: attribute.options?.length
              ? JSON.stringify(attribute.options)
              : null,
          })),
        },
      },
      include: {
        attributes: true,
      },
    });

    categoriesBySlug.set(category.slug, category);
  }

  const productsBySlug = new Map<
    string,
    Product & {
      variants: ProductVariant[];
      customValues: Array<
        ProductCustomAttributeValue & {
          attribute: CategoryCustomAttribute;
        }
      >;
    }
  >();

  for (const productSeed of storeSeed.products) {
    const category = categoriesBySlug.get(productSeed.categorySlug);

    if (!category) {
      throw new Error(
        `Categoria ${productSeed.categorySlug} nao encontrada para ${productSeed.slug}.`,
      );
    }

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: productSeed.name,
        slug: productSeed.slug,
        shortDescription: productSeed.shortDescription,
        fullDescription: productSeed.fullDescription,
        sku: productSeed.sku,
        price: productSeed.price,
        promotionalPrice: productSeed.promotionalPrice ?? null,
        imageUrl: productSeed.imageUrl,
        galleryJson: productSeed.gallery?.length
          ? JSON.stringify(productSeed.gallery)
          : null,
        isActive: true,
        isFeatured: productSeed.isFeatured ?? false,
        trackStock: true,
        stockQuantity: productSeed.variants?.length ? null : productSeed.stockQuantity,
        color: productSeed.color || null,
        size: productSeed.size || null,
        fabric: productSeed.fabric || null,
        weight: productSeed.weight || null,
        notes: productSeed.notes || null,
        variants: productSeed.variants?.length
          ? {
              create: productSeed.variants.map((variant) => ({
                label: Object.entries(variant.attributes)
                  .map(([key, value]) => `${key}: ${value}`)
                  .join(" | "),
                sku: variant.sku || null,
                priceOverride: variant.priceOverride ?? null,
                stockQuantity: variant.stockQuantity,
                isActive: variant.isActive ?? true,
                attributesJson: JSON.stringify(variant.attributes),
              })),
            }
          : undefined,
      },
    });

    if (productSeed.customValues) {
      await prisma.productCustomAttributeValue.createMany({
        data: Object.entries(productSeed.customValues).map(([attributeName, valueText]) => {
          const attribute = category.attributes.find(
            (item) => item.name === attributeName,
          );

          if (!attribute) {
            throw new Error(
              `Atributo ${attributeName} nao encontrado para ${productSeed.slug}.`,
            );
          }

          return {
            productId: product.id,
            attributeId: attribute.id,
            valueText,
          };
        }),
      });
    }

    const hydratedProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        variants: true,
        customValues: {
          include: {
            attribute: true,
          },
        },
      },
    });

    if (!hydratedProduct) {
      throw new Error(`Nao foi possivel hidratar o produto ${productSeed.slug}.`);
    }

    productsBySlug.set(productSeed.slug, hydratedProduct);
  }

  const storeUser = await prisma.user.create({
    data: {
      name: storeSeed.adminName,
      email: storeSeed.adminEmail,
      passwordHash,
      role: UserRole.STORE_ADMIN,
      storeId: store.id,
      isActive: true,
    },
  });

  for (const orderSeed of storeSeed.orders) {
    await createOrderScenario({
      store,
      storeUser,
      orderSeed,
      productsBySlug,
    });
  }

  for (const movementSeed of storeSeed.manualMovements) {
    const product = productsBySlug.get(movementSeed.productSlug);

    if (!product) {
      throw new Error(
        `Produto ${movementSeed.productSlug} nao encontrado para movimentacao manual.`,
      );
    }

    const variant =
      movementSeed.variantAttributes
        ? product.variants.find((entry) => {
            try {
              const attributes = JSON.parse(entry.attributesJson) as Record<string, string>;
              return Object.entries(movementSeed.variantAttributes || {}).every(
                ([key, value]) => attributes[key] === value,
              );
            } catch {
              return false;
            }
          }) || null
        : product.variants[0] || null;

    await createStockMovement({
      storeId: store.id,
      productId: product.id,
      productVariantId: variant?.id || null,
      variantLabelSnapshot: variant?.label || null,
      userId: storeUser.id,
      type: movementSeed.type,
      quantity: movementSeed.quantity,
      notes: movementSeed.notes,
      createdAt: movementSeed.createdAt,
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: storeUser.id,
      storeId: store.id,
      action: "SEED_CREATE_PRESENTATION_STORE",
      entityType: "STORE",
      entityId: store.id,
    },
  });

  return { store, storeUser };
}

const presentationStores: StoreSeed[] = [
  {
    name: "Casa Aurora Moda",
    slug: "casa-aurora-moda",
    description:
      "Boutique feminina com pecas casuais, alfaiataria leve e curadoria para looks do dia a dia.",
    logoUrl:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=240&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1400&q=80",
    whatsappNumber: "5583988881101",
    email: "contato@casaauroramoda.com",
    phone: "(83) 98888-1101",
    address: "Av. Brasil, 455, Centro, Cajazeiras - PB",
    primaryColor: "#2b1d1a",
    secondaryColor: "#d97706",
    accentColor: "#be123c",
    themeMode: "light",
    adminName: "Fernanda Aurora",
    adminEmail: "roupa@catalogosaas.com",
    categories: [
      {
        name: "Vestidos",
        slug: "vestidos",
        description: "Modelos femininos para rotina, eventos e fim de semana.",
        imageUrl:
          "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=700&q=80",
        sortOrder: 1,
        useStock: true,
        useColor: true,
        useSize: true,
        useFabric: true,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Modelagem",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["Midi", "Chemise", "Envelope"],
          },
          {
            name: "Colecao",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
      {
        name: "Essenciais",
        slug: "essenciais",
        description: "Bases do closet com toque premium e conforto.",
        imageUrl:
          "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80",
        sortOrder: 2,
        useStock: true,
        useColor: true,
        useSize: true,
        useFabric: true,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Modelagem",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["Regular", "Slim", "Oversized"],
          },
          {
            name: "Colecao",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
      {
        name: "Alfaiataria",
        slug: "alfaiataria",
        description: "Pecas para trabalho, reunioes e eventos.",
        imageUrl:
          "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=700&q=80",
        sortOrder: 3,
        useStock: true,
        useColor: true,
        useSize: true,
        useFabric: true,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Corte",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["Reto", "Wide leg", "Estruturado"],
          },
          {
            name: "Colecao",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
    ],
    products: [
      {
        categorySlug: "vestidos",
        name: "Vestido Midi Canelado Areia",
        slug: "vestido-midi-canelado-areia",
        shortDescription: "Vestido ajustado com caimento elegante e toque macio.",
        fullDescription:
          "Modelo midi com tecido canelado premium, alca media e acabamento que valoriza a silhueta.",
        sku: "CAM-VD-001",
        price: 189.9,
        promotionalPrice: 169.9,
        imageUrl:
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
        ],
        isFeatured: true,
        stockQuantity: 12,
        color: "Areia, Preto, Terracota",
        size: "P, M, G",
        fabric: "Malha canelada",
        variants: [
          {
            sku: "CAM-VD-001-AR-P",
            stockQuantity: 3,
            attributes: { Cor: "Areia", Tamanho: "P" },
          },
          {
            sku: "CAM-VD-001-AR-M",
            stockQuantity: 4,
            attributes: { Cor: "Areia", Tamanho: "M" },
          },
          {
            sku: "CAM-VD-001-PT-M",
            stockQuantity: 2,
            attributes: { Cor: "Preto", Tamanho: "M" },
          },
          {
            sku: "CAM-VD-001-TR-G",
            stockQuantity: 3,
            attributes: { Cor: "Terracota", Tamanho: "G" },
          },
        ],
        customValues: {
          Modelagem: "Midi",
          Colecao: "Essenciais 2026",
        },
      },
      {
        categorySlug: "vestidos",
        name: "Vestido Chemise Azul Sereno",
        slug: "vestido-chemise-azul-sereno",
        shortDescription: "Leve, fluido e facil de usar no trabalho ou no passeio.",
        fullDescription:
          "Chemise com botoes frontais, manga dobravel e cintura com amarracao ajustavel.",
        sku: "CAM-VD-002",
        price: 229.9,
        imageUrl:
          "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 9,
        color: "Azul sereno, Branco, Listrado azul",
        size: "P, M, G, GG",
        fabric: "Viscolinho",
        customValues: {
          Modelagem: "Chemise",
          Colecao: "Brisa urbana",
        },
      },
      {
        categorySlug: "essenciais",
        name: "Camisa Oversized Branca",
        slug: "camisa-oversized-branca",
        shortDescription: "Camisa ampla com visual moderno e acabamento refinado.",
        fullDescription:
          "Tecido leve com gola estruturada, punho largo e proposta versatil para looks casuais.",
        sku: "CAM-ES-101",
        price: 159.9,
        imageUrl:
          "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80",
        isFeatured: true,
        stockQuantity: 16,
        color: "Branca, Bege, Azul claro",
        size: "PP, P, M/G",
        fabric: "Tricoline premium",
        customValues: {
          Modelagem: "Oversized",
          Colecao: "Office casual",
        },
      },
      {
        categorySlug: "essenciais",
        name: "Cropped Canelado Preto",
        slug: "cropped-canelado-preto",
        shortDescription: "Peca-chave para compor looks urbanos com conforto.",
        fullDescription:
          "Cropped de malha encorpada, gola reta e comprimento ideal para combinar com saias e calcas de cintura alta.",
        sku: "CAM-ES-102",
        price: 89.9,
        promotionalPrice: 74.9,
        imageUrl:
          "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 18,
        color: "Preto, Off white, Terracota",
        size: "P, M, G",
        fabric: "Malha canelada",
        customValues: {
          Modelagem: "Slim",
          Colecao: "Essenciais 2026",
        },
      },
      {
        categorySlug: "alfaiataria",
        name: "Calca Wide Leg Preta",
        slug: "calca-wide-leg-preta",
        shortDescription: "Caimento reto e sofisticado para looks de trabalho e evento.",
        fullDescription:
          "Calca de alfaiataria com cintura alta, bolso faca e perna ampla com otimo acabamento.",
        sku: "CAM-AL-201",
        price: 239.9,
        promotionalPrice: 209.9,
        imageUrl:
          "https://images.unsplash.com/photo-1475180098004-ca77a66827be?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 10,
        color: "Preta, Cinza chumbo",
        size: "38, 40, 42, 44",
        fabric: "Crepe estruturado",
        customValues: {
          Corte: "Wide leg",
          Colecao: "Linha executiva",
        },
      },
      {
        categorySlug: "alfaiataria",
        name: "Blazer Estruturado Off White",
        slug: "blazer-estruturado-off-white",
        shortDescription: "Blazer elegante com ombro marcado e visual premium.",
        fullDescription:
          "Peca com forro leve, lapela classica e modelagem que levanta qualquer composicao.",
        sku: "CAM-AL-202",
        price: 289.9,
        imageUrl:
          "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
        ],
        isFeatured: true,
        stockQuantity: 7,
        color: "Off white, Preto, Caramelo",
        size: "P, M, G, GG",
        fabric: "Alfaiataria premium",
        variants: [
          {
            sku: "CAM-AL-202-OW-P-ACI",
            stockQuantity: 1,
            attributes: { Cor: "Off white", Tamanho: "P", Corte: "Acinturado" },
          },
          {
            sku: "CAM-AL-202-OW-M-ACI",
            stockQuantity: 2,
            attributes: { Cor: "Off white", Tamanho: "M", Corte: "Acinturado" },
          },
          {
            sku: "CAM-AL-202-PT-G-RET",
            stockQuantity: 1,
            attributes: { Cor: "Preto", Tamanho: "G", Corte: "Reto" },
          },
          {
            sku: "CAM-AL-202-CR-GG-RET",
            stockQuantity: 3,
            attributes: { Cor: "Caramelo", Tamanho: "GG", Corte: "Reto" },
          },
        ],
        customValues: {
          Corte: "Acinturado, Reto",
          Colecao: "Linha executiva",
        },
      },
    ],
    orders: [
      {
        createdAt: daysAgo(18, 15, 20),
        customerName: "Juliana Lopes",
        customerPhone: "(83) 99811-2140",
        deliveryAddress: "Rua Antonio Mendes",
        deliveryNumber: "240",
        deliveryDistrict: "Centro",
        deliveryCity: "Cajazeiras - PB",
        deliveryComplement: "Apto 202",
        notes: "Separar em embalagem para presente.",
        status: OrderStatus.PENDING,
        items: [
          { productSlug: "vestido-midi-canelado-areia", quantity: 2 },
          { productSlug: "cropped-canelado-preto", quantity: 1 },
        ],
      },
      {
        createdAt: daysAgo(11, 11, 10),
        customerName: "Carla Andrade",
        customerPhone: "(83) 99654-3302",
        deliveryAddress: "Rua Jose Goncalves",
        deliveryNumber: "88",
        deliveryDistrict: "Pio X",
        deliveryCity: "Sousa - PB",
        deliveryReference: "Casa com portao preto",
        status: OrderStatus.SOLD,
        items: [
          { productSlug: "calca-wide-leg-preta", quantity: 2 },
          { productSlug: "camisa-oversized-branca", quantity: 1 },
        ],
      },
      {
        createdAt: daysAgo(6, 16, 0),
        customerName: "Renata Queiroz",
        customerPhone: "(83) 99133-4418",
        deliveryAddress: "Av. Joao Pessoa",
        deliveryNumber: "540",
        deliveryDistrict: "Centro",
        deliveryCity: "Patos - PB",
        status: OrderStatus.CANCELLED,
        items: [
          {
            productSlug: "blazer-estruturado-off-white",
            quantity: 1,
            variantAttributes: { Cor: "Off white", Tamanho: "M", Corte: "Acinturado" },
          },
          { productSlug: "vestido-chemise-azul-sereno", quantity: 1 },
        ],
      },
      {
        createdAt: daysAgo(2, 13, 40),
        customerName: "Patricia Nunes",
        customerPhone: "(83) 98774-9921",
        deliveryAddress: "Rua do Comercio",
        deliveryNumber: "41",
        deliveryDistrict: "Centro",
        deliveryCity: "Uirauna - PB",
        notes: "Entregar no horario comercial.",
        status: OrderStatus.SOLD,
        items: [
          {
            productSlug: "blazer-estruturado-off-white",
            quantity: 2,
            variantAttributes: { Cor: "Caramelo", Tamanho: "GG", Corte: "Reto" },
          },
          { productSlug: "vestido-midi-canelado-areia", quantity: 1 },
        ],
      },
    ],
    manualMovements: [
      {
        createdAt: daysAgo(1, 9, 0),
        productSlug: "blazer-estruturado-off-white",
        type: StockMovementType.MANUAL_DECREASE,
        quantity: 1,
        notes: "Reserva para prova no showroom.",
        variantAttributes: { Cor: "Preto", Tamanho: "G", Corte: "Reto" },
      },
      {
        createdAt: daysAgo(3, 17, 10),
        productSlug: "camisa-oversized-branca",
        type: StockMovementType.MANUAL_INCREASE,
        quantity: 3,
        notes: "Reposicao recebida do fornecedor local.",
      },
    ],
  },
  {
    name: "Studio Lumi Makeup",
    slug: "studio-lumi-makeup",
    description:
      "Loja de maquiagem com foco em pele, labios e olhos para uso profissional e dia a dia.",
    logoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1400&q=80",
    whatsappNumber: "5583988882202",
    email: "contato@studiolumi.com",
    phone: "(83) 98888-2202",
    address: "Rua Padre Cicero, 612, Centro, Sousa - PB",
    primaryColor: "#3f1d38",
    secondaryColor: "#db2777",
    accentColor: "#f59e0b",
    themeMode: "light",
    adminName: "Luma Tavares",
    adminEmail: "maquiagem@catalogosaas.com",
    categories: [
      {
        name: "Pele",
        slug: "pele",
        description: "Bases, corretivos e finalizacao com acabamento premium.",
        imageUrl:
          "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=700&q=80",
        sortOrder: 1,
        useStock: true,
        useColor: false,
        useSize: false,
        useFabric: false,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Cobertura",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["Leve", "Media", "Alta"],
          },
          {
            name: "Tom",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
      {
        name: "Labios",
        slug: "labios",
        description: "Batom, lip tint e gloss para venda rapida.",
        imageUrl:
          "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=700&q=80",
        sortOrder: 2,
        useStock: true,
        useColor: true,
        useSize: false,
        useFabric: false,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Acabamento",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["Matte", "Creamy", "Gloss"],
          },
          {
            name: "Tonalidade",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
      {
        name: "Olhos",
        slug: "olhos",
        description: "Paletas, mascara e delineadores para kits completos.",
        imageUrl:
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=80",
        sortOrder: 3,
        useStock: true,
        useColor: false,
        useSize: false,
        useFabric: false,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Efeito",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["Opaco", "Acetinado", "Cintilante"],
          },
          {
            name: "Linha",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
    ],
    products: [
      {
        categorySlug: "pele",
        name: "Base HD Velvet 30ml",
        slug: "base-hd-velvet-30ml",
        shortDescription: "Base de longa duracao com toque aveludado.",
        fullDescription:
          "Formula com cobertura media a alta, acabamento natural e boa resistencia ao calor.",
        sku: "LUM-PE-001",
        price: 79.9,
        promotionalPrice: 69.9,
        imageUrl:
          "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
        isFeatured: true,
        stockQuantity: 14,
        customValues: {
          Cobertura: "Media",
          Tom: "Bege 03",
        },
      },
      {
        categorySlug: "pele",
        name: "Corretivo Soft Blend",
        slug: "corretivo-soft-blend",
        shortDescription: "Corretivo liquido de alta espalhabilidade.",
        fullDescription:
          "Ideal para olheiras e iluminacao do rosto com textura fina e acabamento uniforme.",
        sku: "LUM-PE-002",
        price: 49.9,
        imageUrl:
          "https://images.unsplash.com/photo-1625093742435-6fa192b6fb10?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 18,
        customValues: {
          Cobertura: "Alta",
          Tom: "Light honey",
        },
      },
      {
        categorySlug: "pele",
        name: "Blush Liquido Peach Glow",
        slug: "blush-liquido-peach-glow",
        shortDescription: "Blush liquido com efeito natural e construivel.",
        fullDescription:
          "Secagem rapida, acabamento luminoso e cor pessego versatil para varias tonalidades de pele.",
        sku: "LUM-PE-003",
        price: 44.9,
        imageUrl:
          "https://images.unsplash.com/photo-1619451334792-150fd785ee74?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 15,
        customValues: {
          Cobertura: "Leve",
          Tom: "Peach glow",
        },
      },
      {
        categorySlug: "labios",
        name: "Batom Matte Nude Rose",
        slug: "batom-matte-nude-rose",
        shortDescription: "Nude elegante com textura confortavel e boa fixacao.",
        fullDescription:
          "Batom matte de secagem equilibrada, ideal para kits de maquiagem social e noivas.",
        sku: "LUM-LA-101",
        price: 39.9,
        promotionalPrice: 34.9,
        imageUrl:
          "https://images.unsplash.com/photo-1619451334792-150fd785ee74?auto=format&fit=crop&w=900&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1619451334792-150fd785ee74?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80",
        ],
        isFeatured: true,
        stockQuantity: 11,
        color: "Nude rose, Malva, Terracota",
        variants: [
          {
            sku: "LUM-LA-101-NR",
            stockQuantity: 4,
            attributes: { Cor: "Nude rose" },
          },
          {
            sku: "LUM-LA-101-MA",
            stockQuantity: 3,
            attributes: { Cor: "Malva" },
          },
          {
            sku: "LUM-LA-101-TE",
            stockQuantity: 4,
            attributes: { Cor: "Terracota" },
          },
        ],
        customValues: {
          Acabamento: "Matte",
          Tonalidade: "Nude rose",
        },
      },
      {
        categorySlug: "labios",
        name: "Gloss Crystal Shine",
        slug: "gloss-crystal-shine",
        shortDescription: "Brilho leve com efeito espelhado e sem pegajosidade.",
        fullDescription:
          "Gloss transparente com particulas discretas e acabamento molhado sofisticado.",
        sku: "LUM-LA-102",
        price: 32.9,
        imageUrl:
          "https://images.unsplash.com/photo-1619451334792-150fd785ee74?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 13,
        color: "Crystal",
        customValues: {
          Acabamento: "Gloss",
          Tonalidade: "Transparente",
        },
      },
      {
        categorySlug: "olhos",
        name: "Paleta Sunset Bronze",
        slug: "paleta-sunset-bronze",
        shortDescription: "Paleta com tons quentes para make classica e glow.",
        fullDescription:
          "Seis sombras de alta pigmentacao com variacao entre opacos e cintilantes.",
        sku: "LUM-OL-201",
        price: 89.9,
        imageUrl:
          "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 9,
        customValues: {
          Efeito: "Cintilante",
          Linha: "Sunset bronze",
        },
      },
      {
        categorySlug: "olhos",
        name: "Mascara Volume Max",
        slug: "mascara-volume-max",
        shortDescription: "Mascara para cilios com volume instantaneo.",
        fullDescription:
          "Aplicador em silicone, formula preta intensa e boa resistencia durante o dia.",
        sku: "LUM-OL-202",
        price: 54.9,
        promotionalPrice: 47.9,
        imageUrl:
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 17,
        customValues: {
          Efeito: "Opaco",
          Linha: "Volume max",
        },
      },
    ],
    orders: [
      {
        createdAt: daysAgo(14, 14, 25),
        customerName: "Marina Sales",
        customerPhone: "(83) 99621-8804",
        deliveryAddress: "Rua das Acacias",
        deliveryNumber: "95",
        deliveryDistrict: "Centro",
        deliveryCity: "Sousa - PB",
        status: OrderStatus.SOLD,
        items: [
          { productSlug: "base-hd-velvet-30ml", quantity: 2 },
          { productSlug: "corretivo-soft-blend", quantity: 1 },
          {
            productSlug: "batom-matte-nude-rose",
            quantity: 2,
            variantAttributes: { Cor: "Nude rose" },
          },
        ],
      },
      {
        createdAt: daysAgo(8, 19, 5),
        customerName: "Anna Clara Medeiros",
        customerPhone: "(83) 99941-5520",
        deliveryAddress: "Rua Projetada 4",
        deliveryNumber: "12",
        deliveryDistrict: "Jardim Oasis",
        deliveryCity: "Patos - PB",
        notes: "Entregar ate 18h.",
        status: OrderStatus.PENDING,
        items: [
          { productSlug: "paleta-sunset-bronze", quantity: 1 },
          { productSlug: "mascara-volume-max", quantity: 2 },
          { productSlug: "gloss-crystal-shine", quantity: 1 },
        ],
      },
      {
        createdAt: daysAgo(4, 10, 45),
        customerName: "Bianca Farias",
        customerPhone: "(83) 99127-7742",
        deliveryAddress: "Rua Coronel Joao Leite",
        deliveryNumber: "300",
        deliveryDistrict: "Centro",
        deliveryCity: "Cajazeiras - PB",
        status: OrderStatus.CANCELLED,
        items: [
          { productSlug: "base-hd-velvet-30ml", quantity: 1 },
          { productSlug: "blush-liquido-peach-glow", quantity: 1 },
        ],
      },
      {
        createdAt: daysAgo(1, 15, 50),
        customerName: "Larissa Queiroga",
        customerPhone: "(83) 98716-6633",
        deliveryAddress: "Rua Nova Esperanca",
        deliveryNumber: "45",
        deliveryDistrict: "Belo Horizonte",
        deliveryCity: "Sousa - PB",
        status: OrderStatus.SOLD,
        items: [
          { productSlug: "base-hd-velvet-30ml", quantity: 3 },
          {
            productSlug: "batom-matte-nude-rose",
            quantity: 2,
            variantAttributes: { Cor: "Terracota" },
          },
        ],
      },
    ],
    manualMovements: [
      {
        createdAt: daysAgo(2, 9, 30),
        productSlug: "base-hd-velvet-30ml",
        type: StockMovementType.MANUAL_DECREASE,
        quantity: 2,
        notes: "Separado para producao de conteudo e treinamento.",
      },
      {
        createdAt: daysAgo(5, 17, 10),
        productSlug: "gloss-crystal-shine",
        type: StockMovementType.MANUAL_INCREASE,
        quantity: 4,
        notes: "Reposicao recebida da distribuidora.",
      },
    ],
  },
  {
    name: "Vale Drinks Distribuidora",
    slug: "vale-drinks-distribuidora",
    description:
      "Distribuidora com destilados, cervejas, energeticos e bebidas para festas e revenda.",
    logoUrl:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=240&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=1400&q=80",
    whatsappNumber: "5583988883303",
    email: "contato@valedrinks.com",
    phone: "(83) 98888-3303",
    address: "Rodovia BR 230, 980, Distrito Industrial, Sousa - PB",
    primaryColor: "#0f172a",
    secondaryColor: "#0ea5e9",
    accentColor: "#22c55e",
    themeMode: "light",
    adminName: "Rodrigo Vale",
    adminEmail: "bebidas@catalogosaas.com",
    categories: [
      {
        name: "Destilados",
        slug: "destilados",
        description: "Whisky, gin e vodka para varejo e eventos.",
        imageUrl:
          "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=700&q=80",
        sortOrder: 1,
        useStock: true,
        useColor: false,
        useSize: false,
        useFabric: false,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Volume",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["750ml", "1L"],
          },
          {
            name: "Marca",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
      {
        name: "Cervejas",
        slug: "cervejas",
        description: "Packs gelados e rotulos especiais.",
        imageUrl:
          "https://images.unsplash.com/photo-1516458464372-ee7eae24b460?auto=format&fit=crop&w=700&q=80",
        sortOrder: 2,
        useStock: true,
        useColor: false,
        useSize: false,
        useFabric: false,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Embalagem",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["Long neck", "Lata", "Pack"],
          },
          {
            name: "Marca",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
      {
        name: "Nao alcoolicos",
        slug: "nao-alcoolicos",
        description: "Energeticos, refrigerantes e agua mineral.",
        imageUrl:
          "https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=700&q=80",
        sortOrder: 3,
        useStock: true,
        useColor: false,
        useSize: false,
        useFabric: false,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Volume",
            fieldType: AttributeFieldType.SELECT,
            isRequired: true,
            options: ["350ml", "500ml", "2L", "Pack"],
          },
          {
            name: "Marca",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
      {
        name: "Vinhos",
        slug: "vinhos",
        description: "Rotulos para presente, jantar e adega.",
        imageUrl:
          "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&w=700&q=80",
        sortOrder: 4,
        useStock: true,
        useColor: false,
        useSize: false,
        useFabric: false,
        useDescription: true,
        allowCustomAttributes: true,
        attributes: [
          {
            name: "Safra",
            fieldType: AttributeFieldType.TEXT,
          },
          {
            name: "Pais",
            fieldType: AttributeFieldType.TEXT,
          },
        ],
      },
    ],
    products: [
      {
        categorySlug: "destilados",
        name: "Whisky Black Oak 1L",
        slug: "whisky-black-oak-1l",
        shortDescription: "Whisky premium para presente e festas.",
        fullDescription:
          "Rotulo encorpado com notas amadeiradas e final persistente, ideal para alto ticket.",
        sku: "VD-DT-001",
        price: 159.9,
        promotionalPrice: 149.9,
        imageUrl:
          "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=900&q=80",
        ],
        isFeatured: true,
        stockQuantity: 9,
        customValues: {
          Volume: "1L",
          Marca: "Black Oak",
        },
      },
      {
        categorySlug: "destilados",
        name: "Gin Botanico Serra 750ml",
        slug: "gin-botanico-serra-750ml",
        shortDescription: "Gin aromatico para drinks e revenda.",
        fullDescription:
          "Blend com botanicos citricos, ideal para bares, eventos e kits premium.",
        sku: "VD-DT-002",
        price: 99.9,
        imageUrl:
          "https://images.unsplash.com/photo-1607622750671-6cd9a99af49a?auto=format&fit=crop&w=900&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1607622750671-6cd9a99af49a?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=900&q=80",
          "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80",
        ],
        stockQuantity: 14,
        customValues: {
          Volume: "750ml",
          Marca: "Serra",
        },
      },
      {
        categorySlug: "destilados",
        name: "Vodka Premium Ice 1L",
        slug: "vodka-premium-ice-1l",
        shortDescription: "Vodka para festas com giro rapido.",
        fullDescription:
          "Rotulo de grande saida com boa margem para atacado e varejo.",
        sku: "VD-DT-003",
        price: 79.9,
        promotionalPrice: 72.9,
        imageUrl:
          "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 18,
        customValues: {
          Volume: "1L",
          Marca: "Premium Ice",
        },
      },
      {
        categorySlug: "cervejas",
        name: "Cerveja Pilsen Lager Pack 12",
        slug: "cerveja-pilsen-lager-pack-12",
        shortDescription: "Pack com 12 unidades para churrasco e revenda.",
        fullDescription:
          "Pilsen de alta rotacao, otima para atacado e consumo em eventos.",
        sku: "VD-CV-101",
        price: 54.9,
        imageUrl:
          "https://images.unsplash.com/photo-1516458464372-ee7eae24b460?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 26,
        customValues: {
          Embalagem: "Pack",
          Marca: "Lager",
        },
      },
      {
        categorySlug: "cervejas",
        name: "Cerveja IPA Artesanal Pack 6",
        slug: "cerveja-ipa-artesanal-pack-6",
        shortDescription: "Pack especial para publico premium e bares.",
        fullDescription:
          "IPA aromatica com amargor marcante e excelente giro em noites e eventos.",
        sku: "VD-CV-102",
        price: 49.9,
        imageUrl:
          "https://images.unsplash.com/photo-1527169402691-feff5539e52c?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 12,
        customValues: {
          Embalagem: "Pack",
          Marca: "Hop House",
        },
      },
      {
        categorySlug: "nao-alcoolicos",
        name: "Energetico Turbo Pack 6",
        slug: "energetico-turbo-pack-6",
        shortDescription: "Pack com alta saida para conveniencia e festas.",
        fullDescription:
          "Energetico de venda rapida em pack economico para balcao e delivery.",
        sku: "VD-NA-201",
        price: 42.9,
        imageUrl:
          "https://images.unsplash.com/photo-1624517452488-04869289c4ca?auto=format&fit=crop&w=900&q=80",
        isFeatured: true,
        stockQuantity: 11,
        customValues: {
          Volume: "Pack",
          Marca: "Turbo",
        },
      },
      {
        categorySlug: "nao-alcoolicos",
        name: "Refrigerante Cola 2L Fardo 6",
        slug: "refrigerante-cola-2l-fardo-6",
        shortDescription: "Fardo com 6 garrafas para mercado e eventos.",
        fullDescription:
          "Produto de giro constante para entregas rapidas, festas e reposicao de mercadinhos.",
        sku: "VD-NA-202",
        price: 44.9,
        promotionalPrice: 39.9,
        imageUrl:
          "https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 20,
        customValues: {
          Volume: "2L",
          Marca: "Cola max",
        },
      },
      {
        categorySlug: "vinhos",
        name: "Vinho Tinto Reserva 750ml",
        slug: "vinho-tinto-reserva-750ml",
        shortDescription: "Rotulo versatil para presente e harmonizacao.",
        fullDescription:
          "Vinho tinto com boa relacao custo-beneficio para jantar, presente e adega pessoal.",
        sku: "VD-VH-301",
        price: 69.9,
        imageUrl:
          "https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&w=900&q=80",
        stockQuantity: 15,
        customValues: {
          Safra: "2022",
          Pais: "Chile",
        },
      },
    ],
    orders: [
      {
        createdAt: daysAgo(16, 8, 30),
        customerName: "Mercadinho Central",
        customerPhone: "(83) 99876-1030",
        deliveryAddress: "Rua Padre Rolim",
        deliveryNumber: "1120",
        deliveryDistrict: "Centro",
        deliveryCity: "Cajazeiras - PB",
        notes: "Emitir pedido com separacao por caixas.",
        status: OrderStatus.SOLD,
        items: [
          { productSlug: "cerveja-pilsen-lager-pack-12", quantity: 4 },
          { productSlug: "refrigerante-cola-2l-fardo-6", quantity: 3 },
        ],
      },
      {
        createdAt: daysAgo(9, 12, 20),
        customerName: "Bar do Mirante",
        customerPhone: "(83) 99180-2200",
        deliveryAddress: "Avenida Beira Rio",
        deliveryNumber: "640",
        deliveryDistrict: "Jardim Oasis",
        deliveryCity: "Sousa - PB",
        status: OrderStatus.SOLD,
        items: [
          { productSlug: "whisky-black-oak-1l", quantity: 3 },
          { productSlug: "gin-botanico-serra-750ml", quantity: 2 },
          { productSlug: "energetico-turbo-pack-6", quantity: 2 },
        ],
      },
      {
        createdAt: daysAgo(5, 17, 45),
        customerName: "Felipe Eventos",
        customerPhone: "(83) 99450-6622",
        deliveryAddress: "Rua Projetada 9",
        deliveryNumber: "520",
        deliveryDistrict: "Industrial",
        deliveryCity: "Sousa - PB",
        status: OrderStatus.CANCELLED,
        items: [
          { productSlug: "vodka-premium-ice-1l", quantity: 2 },
          { productSlug: "cerveja-ipa-artesanal-pack-6", quantity: 1 },
        ],
      },
      {
        createdAt: daysAgo(1, 18, 5),
        customerName: "Casa de Festas Luna",
        customerPhone: "(83) 98721-9090",
        deliveryAddress: "Rua Cel. Jose Gomes",
        deliveryNumber: "210",
        deliveryDistrict: "Centro",
        deliveryCity: "Pombal - PB",
        notes: "Entrega gelada e avisar 20 min antes.",
        status: OrderStatus.PENDING,
        items: [
          { productSlug: "whisky-black-oak-1l", quantity: 2 },
          { productSlug: "energetico-turbo-pack-6", quantity: 3 },
          { productSlug: "vinho-tinto-reserva-750ml", quantity: 2 },
        ],
      },
    ],
    manualMovements: [
      {
        createdAt: daysAgo(3, 7, 30),
        productSlug: "whisky-black-oak-1l",
        type: StockMovementType.MANUAL_DECREASE,
        quantity: 1,
        notes: "Garrafa reservada para cliente recorrente.",
      },
      {
        createdAt: daysAgo(2, 9, 15),
        productSlug: "cerveja-pilsen-lager-pack-12",
        type: StockMovementType.MANUAL_INCREASE,
        quantity: 6,
        notes: "Reposicao de fim de semana.",
      },
    ],
  },
];

async function main() {
  await resetDatabase();

  const adminPassword = await bcrypt.hash("admin123", 10);
  const storePassword = await bcrypt.hash("loja123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Administrador Principal",
      email: "admin@catalogosaas.com",
      passwordHash: adminPassword,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: "SEED_CREATE_ADMIN",
      entityType: "USER",
      entityId: admin.id,
    },
  });

  const seededStores: Array<{
    store: Store;
    storeUser: User;
  }> = [];

  for (const storeSeed of presentationStores) {
    const seeded = await createDemoStore({
      storeSeed,
      passwordHash: storePassword,
    });
    seededStores.push(seeded);
  }

  console.log("Seed de apresentacao concluido.");
  console.log("Admin:", "admin@catalogosaas.com", "senha:", "admin123");

  for (const seeded of seededStores) {
    console.log(
      `Loja: ${seeded.store.name} | slug: /loja/${seeded.store.slug} | login: ${seeded.storeUser.email} | senha: loja123`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
