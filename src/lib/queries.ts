import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";

export type ReportFilters = {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
  categoryId?: string;
};
export type StoreCatalogFilters = {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

function parseReportDateStart(input?: string) {
  if (!input) {
    return undefined;
  }

  const parsed = new Date(`${input}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseReportDateEnd(input?: string) {
  if (!input) {
    return undefined;
  }

  const parsed = new Date(`${input}T23:59:59.999`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function getStoreDashboard(storeId: string) {
  const [
    productCount,
    categoryCount,
    activeProducts,
    soldOrders,
    pendingOrders,
    lowStockProducts,
    totalRevenue,
    storeInfo,
    agentInfo,
  ] =
    await Promise.all([
      prisma.product.count({ where: { storeId } }),
      prisma.category.count({ where: { storeId } }),
      prisma.product.count({ where: { storeId, isActive: true } }),
      prisma.order.count({
        where: { storeId, status: "SOLD" },
      }),
      prisma.order.count({
        where: { storeId, status: "PENDING" },
      }),
      prisma.product.findMany({
        where: {
          storeId,
          trackStock: true,
          OR: [
            {
              stockQuantity: { lte: 5 },
            },
            {
              variants: {
                some: {
                  isActive: true,
                  stockQuantity: { lte: 5 },
                },
              },
            },
          ],
        },
        orderBy: [{ stockQuantity: "asc" }, { name: "asc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          sku: true,
          slug: true,
          stockQuantity: true,
          variants: {
            where: {
              isActive: true,
              stockQuantity: { lte: 5 },
            },
            orderBy: [{ stockQuantity: "asc" }, { createdAt: "asc" }],
            take: 3,
            select: {
              id: true,
              label: true,
              stockQuantity: true,
            },
          },
        },
      }),
      prisma.order.aggregate({
        where: {
          storeId,
          status: "SOLD",
        },
        _sum: {
          subtotal: true,
        },
      }),
      prisma.store.findUnique({
        where: { id: storeId },
        select: { logoUrl: true, whatsappNumber: true },
      }),
      prisma.agentConfig.findUnique({
        where: { storeId },
        select: { isEnabled: true, evolutionInstance: true, connectionStatus: true },
      }),
    ]);

  const onboarding = {
    hasLogo: !!storeInfo?.logoUrl,
    hasCategory: categoryCount > 0,
    hasProduct: productCount > 0,
    agentEnabled: !!agentInfo?.isEnabled,
    whatsappConfigured: !!agentInfo?.evolutionInstance,
  };
  const onboardingDone = Object.values(onboarding).every(Boolean);

  return {
    productCount,
    categoryCount,
    activeProducts,
    soldOrders,
    pendingOrders,
    lowStockProducts,
    totalRevenue: Number(totalRevenue._sum.subtotal || 0),
    onboarding,
    onboardingDone,
  };
}

export async function getAdminDashboard() {
  const [totalStores, activeStores, totalProducts, totalCategories, soldOrders, recentStores] =
    await Promise.all([
      prisma.store.count(),
      prisma.store.count({ where: { status: true } }),
      prisma.product.count(),
      prisma.category.count(),
      prisma.order.count({ where: { status: "SOLD" } }),
      prisma.store.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    totalStores,
    activeStores,
    totalProducts,
    totalCategories,
    soldOrders,
    recentStores,
  };
}

export async function getStoreCatalog(slug: string, filters: StoreCatalogFilters = {}) {
  const currentPage = filters.page && filters.page > 0 ? Math.trunc(filters.page) : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(Math.trunc(filters.pageSize), 30) : 24;
  const search = filters.search?.trim() || "";
  const category = filters.category?.trim() || "";
  const getCachedCatalog = unstable_cache(
    async () => {
      const store = await prisma.store.findFirst({
        where: { slug, status: true },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          whatsappNumber: true,
          logoUrl: true,
          bannerUrl: true,
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          themeMode: true,
          accessMode: true,
          catalogUsesImages: true,
          catalogProfile: true,
          productAttributesJson: true,
          categories: {
            where: { isActive: true },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            },
          },
        },
      });

      if (!store) {
        return null;
      }

      const catalogUsesImages = store.catalogUsesImages;
      const activeCategoryId = category
        ? (store.categories.find((item) => item.slug === category)?.id ?? null)
        : null;

      const productWhere = {
        storeId: store.id,
        isActive: true,
        ...(activeCategoryId
          ? {
              categoryId: activeCategoryId,
            }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  shortDescription: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  category: {
                    name: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
                {
                  customValues: {
                    some: {
                      valueText: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      };

      const [totalProducts, promoCount, products] = await Promise.all([
        prisma.product.count({
          where: productWhere,
        }),
        prisma.product.count({
          where: {
            storeId: store.id,
            isActive: true,
            promotionalPrice: {
              not: null,
            },
          },
        }),
        prisma.product.findMany({
          where: productWhere,
          select: {
            id: true,
            name: true,
            slug: true,
            shortDescription: true,
            brandSupplier: true,
            attributesJson: true,
            imageUrl: catalogUsesImages,
            galleryJson: catalogUsesImages,
            price: true,
            promotionalPrice: true,
            trackStock: true,
            stockQuantity: true,
            categoryId: true,
            color: true,
            size: true,
            fabric: true,
            variants: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
                label: true,
                imageUrl: catalogUsesImages,
                priceOverride: true,
                promotionalPriceOverride: true,
                discountPercent: true,
                sku: true,
                barcode: true,
                stockQuantity: true,
                isActive: true,
                attributesJson: true,
              },
              orderBy: { createdAt: "asc" },
            },
            category: {
              select: {
                name: true,
              },
            },
            customValues: {
              take: 2,
              select: {
                valueText: true,
                attribute: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return {
        ...store,
        promoCount,
        products: products.map((product) => ({
          ...product,
          price: Number(product.price),
          promotionalPrice: product.promotionalPrice
            ? Number(product.promotionalPrice)
            : null,
        })),
        totalProducts,
        currentPage,
        pageSize,
        totalPages: Math.max(1, Math.ceil(totalProducts / pageSize)),
        activeSearch: search,
        activeCategorySlug: category,
      };
    },
    [`public-catalog:${slug}:${search || "all"}:${category || "all"}:${currentPage}:${pageSize}`],
    { revalidate: 30 },
  );

  return getCachedCatalog();
}

export async function getPublicStoreShell(slug: string) {
  const getCachedStoreShell = unstable_cache(
    async () =>
      prisma.store.findFirst({
        where: { slug, status: true },
        select: {
          slug: true,
          name: true,
          description: true,
          whatsappNumber: true,
          logoUrl: true,
          bannerUrl: true,
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          themeMode: true,
          accessMode: true,
          catalogUsesImages: true,
        },
      }),
    [`public-store-shell:${slug}`],
    { revalidate: 60 },
  );

  return getCachedStoreShell();
}

export async function getStoreProductDetail(slug: string, productSlug: string) {
  const getCachedProductDetail = unstable_cache(
    async () => {
      const store = await prisma.store.findFirst({
        where: { slug, status: true },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          whatsappNumber: true,
          logoUrl: true,
          bannerUrl: true,
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          themeMode: true,
          accessMode: true,
          catalogUsesImages: true,
          catalogProfile: true,
          productAttributesJson: true,
        },
      });

      if (!store) {
        return null;
      }

      const catalogUsesImages = store.catalogUsesImages;
      const product = await prisma.product.findFirst({
        where: { storeId: store.id, slug: productSlug, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          fullDescription: true,
          brandSupplier: true,
          attributesJson: true,
          imageUrl: catalogUsesImages,
          galleryJson: catalogUsesImages,
          price: true,
          promotionalPrice: true,
          trackStock: true,
          stockQuantity: true,
          notes: true,
          color: true,
          size: true,
          fabric: true,
          variants: {
            where: {
              isActive: true,
            },
            select: {
              id: true,
              label: true,
              imageUrl: catalogUsesImages,
              priceOverride: true,
              promotionalPriceOverride: true,
              discountPercent: true,
              sku: true,
              barcode: true,
              stockQuantity: true,
              isActive: true,
              attributesJson: true,
            },
            orderBy: { createdAt: "asc" },
          },
          category: {
            select: {
              name: true,
            },
          },
          customValues: {
            take: 4,
            select: {
              valueText: true,
              attribute: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      return {
        ...store,
        products: product
          ? [
              {
                ...product,
                price: Number(product.price),
                promotionalPrice: product.promotionalPrice
                  ? Number(product.promotionalPrice)
                  : null,
              },
            ]
          : [],
      };
    },
    [`public-product:${slug}:${productSlug}`],
    { revalidate: 30 },
  );

  return getCachedProductDetail();
}

export async function getStoreReportFilterOptions(storeId: string) {
  const categories = await prisma.category.findMany({
    where: { storeId, isActive: true },
    select: {
      id: true,
      name: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return {
    categories,
  };
}

export async function getStoreReportSelectedProduct(
  storeId: string,
  productId?: string,
) {
  if (!productId || productId === "all") {
    return null;
  }

  return prisma.product.findFirst({
    where: {
      id: productId,
      storeId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      categoryId: true,
    },
  });
}

export async function getStoreSalesReport(storeId: string, filters: ReportFilters) {
  const dateFrom = parseReportDateStart(filters.dateFrom);
  const dateTo = parseReportDateEnd(filters.dateTo);
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        storeId,
        status: "SOLD" as const,
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {}),
              },
            }
          : {}),
      },
      ...(filters.productId && filters.productId !== "all"
        ? { productId: filters.productId }
        : {}),
      ...(filters.categoryId && filters.categoryId !== "all"
        ? {
            product: {
              is: {
                categoryId: filters.categoryId,
              },
            },
          }
        : {}),
    },
    select: {
      orderId: true,
      productId: true,
      productVariantId: true,
      productNameSnapshot: true,
      productVariantLabelSnapshot: true,
      quantity: true,
      unitPrice: true,
      costPriceSnapshot: true,
      profitSnapshot: true,
      id: true,
      order: {
        select: {
          createdAt: true,
          paymentMethod: true,
        },
      },
    },
    orderBy: {
      order: {
        createdAt: "desc",
      },
    },
  });

  const orderMap = new Map<string, { createdAt: Date; revenue: number; itemsSold: number }>();
  const productMap = new Map<
    string,
    { productName: string; quantity: number; revenue: number; profit: number }
  >();
  const variationMap = new Map<
    string,
    { productName: string; variationName: string; quantity: number; revenue: number; profit: number }
  >();
  const dailyMap = new Map<string, { label: string; revenue: number; orders: number }>();
  const paymentMap = new Map<string, { label: string; revenue: number; orders: Set<string> }>();

  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let totalItemsSold = 0;

  items.forEach((item) => {
    const revenue = item.quantity * Number(item.unitPrice);
    const cost = item.costPriceSnapshot ? item.quantity * Number(item.costPriceSnapshot) : 0;
    const profit = item.profitSnapshot !== null && item.profitSnapshot !== undefined
      ? Number(item.profitSnapshot)
      : Math.max(0, revenue - cost);
    totalRevenue += revenue;
    totalCost += cost;
    totalProfit += profit;
    totalItemsSold += item.quantity;

    const orderCurrent = orderMap.get(item.orderId) || {
      createdAt: item.order.createdAt,
      revenue: 0,
      itemsSold: 0,
    };
    orderCurrent.revenue += revenue;
    orderCurrent.itemsSold += item.quantity;
    orderMap.set(item.orderId, orderCurrent);

    const productKey = item.productId || item.productNameSnapshot;
    const productCurrent = productMap.get(productKey) || {
      productName: item.productNameSnapshot,
      quantity: 0,
      revenue: 0,
      profit: 0,
    };
    productCurrent.quantity += item.quantity;
    productCurrent.revenue += revenue;
    productCurrent.profit += profit;
    productMap.set(productKey, productCurrent);

    if (item.productVariantId || item.productVariantLabelSnapshot) {
      const variationKey = item.productVariantId || `${item.productNameSnapshot}:${item.productVariantLabelSnapshot}`;
      const variationCurrent = variationMap.get(variationKey) || {
        productName: item.productNameSnapshot,
        variationName: item.productVariantLabelSnapshot || "Variacao",
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      variationCurrent.quantity += item.quantity;
      variationCurrent.revenue += revenue;
      variationCurrent.profit += profit;
      variationMap.set(variationKey, variationCurrent);
    }

    const paymentKey = item.order.paymentMethod || "OTHER";
    const paymentCurrent = paymentMap.get(paymentKey) || {
      label: paymentKey,
      revenue: 0,
      orders: new Set<string>(),
    };
    paymentCurrent.revenue += revenue;
    paymentCurrent.orders.add(item.orderId);
    paymentMap.set(paymentKey, paymentCurrent);
  });

  const averageTicket = orderMap.size ? totalRevenue / orderMap.size : 0;

  const topProducts = [...productMap.values()]
    .sort((left, right) => right.revenue - left.revenue || right.quantity - left.quantity)
    .slice(0, 8);
  const topVariations = [...variationMap.values()]
    .sort((left, right) => right.revenue - left.revenue || right.quantity - left.quantity)
    .slice(0, 8);

  orderMap.forEach((order) => {
    const date = new Date(order.createdAt);
    const key = date.toISOString().slice(0, 10);
    const label = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(date);
    const current = dailyMap.get(key) || { label, revenue: 0, orders: 0 };

    current.revenue += order.revenue;
    current.orders += 1;
    dailyMap.set(key, current);
  });

  const salesByDay = [...dailyMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([, value]) => value)
    .slice(-10);

  return {
    filters: {
      dateFrom: filters.dateFrom || "",
      dateTo: filters.dateTo || "",
      productId: filters.productId || "all",
      categoryId: filters.categoryId || "all",
    },
    totalRevenue,
    totalCost,
    totalProfit,
    profitMarginPercent: totalRevenue ? (totalProfit / totalRevenue) * 100 : 0,
    soldOrdersCount: orderMap.size,
    totalItemsSold,
    averageTicket,
    topProducts,
    topVariations,
    salesByDay,
    paymentBreakdown: [...paymentMap.values()].map((item) => ({
      label: item.label,
      revenue: item.revenue,
      orders: item.orders.size,
    })),
  };
}

export async function getStoreStockReport(storeId: string, filters: ReportFilters) {
  const dateFrom = parseReportDateStart(filters.dateFrom);
  const dateTo = parseReportDateEnd(filters.dateTo);
  const movementWhere = {
    storeId,
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(filters.productId ? { productId: filters.productId } : {}),
    ...(filters.categoryId
      ? {
          product: {
            is: {
              categoryId: filters.categoryId,
            },
          },
        }
      : {}),
  };

  const [movements, manualDecreases, manualIncreases, orderDecreases, orderRestores] =
    await Promise.all([
      prisma.stockMovement.findMany({
        where: movementWhere,
        include: {
          product: {
            select: {
              name: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      }),
      prisma.stockMovement.aggregate({
        where: {
          ...movementWhere,
          type: "MANUAL_DECREASE",
        },
        _count: {
          _all: true,
        },
        _sum: {
          quantity: true,
        },
      }),
      prisma.stockMovement.aggregate({
        where: {
          ...movementWhere,
          type: "MANUAL_INCREASE",
        },
        _count: {
          _all: true,
        },
        _sum: {
          quantity: true,
        },
      }),
      prisma.stockMovement.aggregate({
        where: {
          ...movementWhere,
          type: "ORDER_DECREASE",
        },
        _count: {
          _all: true,
        },
        _sum: {
          quantity: true,
        },
      }),
      prisma.stockMovement.aggregate({
        where: {
          ...movementWhere,
          type: "ORDER_RESTORE",
        },
        _count: {
          _all: true,
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

  return {
    filters: {
      dateFrom: filters.dateFrom || "",
      dateTo: filters.dateTo || "",
      productId: filters.productId || "all",
      categoryId: filters.categoryId || "all",
    },
    movements: movements.map((movement) => ({
      ...movement,
      productName: movement.product.name,
      categoryName: movement.product.category.name,
    })),
    manualDecreaseCount: manualDecreases._count._all,
    manualDecreaseUnits: manualDecreases._sum.quantity || 0,
    manualIncreaseCount: manualIncreases._count._all,
    manualIncreaseUnits: manualIncreases._sum.quantity || 0,
    orderDecreaseCount: orderDecreases._count._all,
    orderDecreaseUnits: orderDecreases._sum.quantity || 0,
    orderRestoreCount: orderRestores._count._all,
    orderRestoreUnits: orderRestores._sum.quantity || 0,
  };
}
