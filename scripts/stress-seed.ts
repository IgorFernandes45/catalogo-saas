import bcrypt from "bcryptjs";
import { AttributeFieldType, PrismaClient, UserRole } from "@prisma/client";

type CategoryTemplate = {
  key: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  useStock: boolean;
  useColor: boolean;
  useSize: boolean;
  useFabric: boolean;
  useDescription: boolean;
  allowCustomAttributes: boolean;
  attributes: Array<{
    name: string;
    fieldType: AttributeFieldType;
    isRequired: boolean;
    options?: string[];
  }>;
};

type StoreTemplate = {
  name: string;
  slug: string;
  description: string;
  whatsappNumber: string;
  email: string;
  phone: string;
  address: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl: string;
  bannerUrl: string;
  adminName: string;
  adminEmail: string;
};

type PreparedProduct = {
  categoryKey: string;
  name: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  sku: string;
  price: number;
  promotionalPrice: number | null;
  imageUrl: string;
  galleryJson: string;
  isActive: boolean;
  isFeatured: boolean;
  trackStock: boolean;
  stockQuantity: number | null;
  color: string | null;
  size: string | null;
  fabric: string | null;
  weight: string | null;
  notes: string | null;
  customValues: Array<{ attributeName: string; valueText: string }>;
};

const prisma = new PrismaClient();
const PRODUCTS_PER_CATEGORY = 50;
const ORDERS_PER_STORE = 75;
const STRESS_PREFIX = "stress-";

class SeedRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next() {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  int(min: number, max: number) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  bool(probability = 0.5) {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]) {
    return items[this.int(0, items.length - 1)]!;
  }

  sample<T>(items: readonly T[], count: number) {
    const pool = [...items];
    const result: T[] = [];

    while (pool.length && result.length < count) {
      const index = this.int(0, pool.length - 1);
      result.push(pool.splice(index, 1)[0]!);
    }

    return result;
  }
}

const storeTemplates: StoreTemplate[] = [
  {
    name: "Stress Moda Urbana",
    slug: "stress-moda-urbana",
    description: "Catalogo de moda casual, treino e streetwear para testar alta carga.",
    whatsappNumber: "5583988880001",
    email: "contato@stressmoda.com",
    phone: "(83) 98888-0001",
    address: "Rua do Teste, 101, Centro, Sousa - PB",
    primaryColor: "#0f172a",
    secondaryColor: "#ea580c",
    accentColor: "#16a34a",
    logoUrl:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=240&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=80",
    adminName: "Ana Moda Stress",
    adminEmail: "stress-loja1@catalogosaas.com",
  },
  {
    name: "Stress Casa Aroma",
    slug: "stress-casa-aroma",
    description: "Perfumes, velas, aromatizadores e kits para validar navegacao de catalogo.",
    whatsappNumber: "5583988880002",
    email: "contato@stressaroma.com",
    phone: "(83) 98888-0002",
    address: "Avenida dos Testes, 202, Centro, Cajazeiras - PB",
    primaryColor: "#1f2937",
    secondaryColor: "#d97706",
    accentColor: "#0891b2",
    logoUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=240&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
    adminName: "Bruna Aroma Stress",
    adminEmail: "stress-loja2@catalogosaas.com",
  },
  {
    name: "Stress Sport Club",
    slug: "stress-sport-club",
    description: "Linha fitness e acessorios com bastante produto para exercitar estoque e pedidos.",
    whatsappNumber: "5583988880003",
    email: "contato@stresssport.com",
    phone: "(83) 98888-0003",
    address: "Praca da Simulacao, 303, Centro, Patos - PB",
    primaryColor: "#111827",
    secondaryColor: "#dc2626",
    accentColor: "#2563eb",
    logoUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80",
    bannerUrl:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    adminName: "Carlos Sport Stress",
    adminEmail: "stress-loja3@catalogosaas.com",
  },
];

const categoryTemplates: CategoryTemplate[] = [
  {
    key: "camisetas",
    name: "Camisetas",
    slug: "camisetas",
    description: "Modelos leves, tecnicos e para uso diario.",
    imageUrl:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80",
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
        options: ["Slim", "Regular", "Oversized"],
      },
      {
        name: "Colecao",
        fieldType: AttributeFieldType.TEXT,
        isRequired: false,
      },
    ],
  },
  {
    key: "perfumes",
    name: "Perfumes",
    slug: "perfumes",
    description: "Fragrancias autorais e presentes premium.",
    imageUrl:
      "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=80",
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
        options: ["30ml", "50ml", "100ml"],
      },
      {
        name: "Familia olfativa",
        fieldType: AttributeFieldType.TEXT,
        isRequired: false,
      },
    ],
  },
  {
    key: "acessorios",
    name: "Acessorios",
    slug: "acessorios",
    description: "Bolsas, garrafas, faixas e itens de apoio.",
    imageUrl:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80",
    useStock: true,
    useColor: true,
    useSize: false,
    useFabric: false,
    useDescription: true,
    allowCustomAttributes: true,
    attributes: [
      {
        name: "Material",
        fieldType: AttributeFieldType.SELECT,
        isRequired: true,
        options: ["Couro sintetico", "Aluminio", "Poliester", "Silicone"],
      },
      {
        name: "Linha",
        fieldType: AttributeFieldType.TEXT,
        isRequired: false,
      },
    ],
  },
  {
    key: "calcados",
    name: "Calcados",
    slug: "calcados",
    description: "Tenis e slides com foco em conforto e giro rapido.",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80",
    useStock: true,
    useColor: true,
    useSize: true,
    useFabric: false,
    useDescription: true,
    allowCustomAttributes: true,
    attributes: [
      {
        name: "Solado",
        fieldType: AttributeFieldType.SELECT,
        isRequired: true,
        options: ["Leve", "Estavel", "Amortecido"],
      },
      {
        name: "Linha",
        fieldType: AttributeFieldType.TEXT,
        isRequired: false,
      },
    ],
  },
];

const colors = ["Preto", "Branco", "Grafite", "Azul", "Verde", "Areia", "Rosa"];
const sizes = ["PP", "P", "M", "G", "GG", "38", "39", "40", "41", "42"];
const fabrics = ["Algodao", "Dry fit", "Poliamida", "Poliester", "Moletom"];
const collections = ["Essencial", "Pulse", "Motion", "Core", "Sprint", "Studio"];
const fragranceFamilies = [
  "Amadeirada",
  "Citrica",
  "Floral",
  "Oriental",
  "Fresca",
];
const accessoryLines = ["Daily", "Urban", "Sport", "Flow", "Prime"];
const productImages = {
  camisetas: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=700&q=80",
  ],
  perfumes: [
    "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=80",
  ],
  acessorios: [
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=700&q=80",
  ],
  calcados: [
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80",
  ],
} as const;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function currency(value: number) {
  return Number(value.toFixed(2));
}

function randomCreatedAt(rng: SeedRandom, maxDaysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - rng.int(0, maxDaysAgo));
  date.setHours(rng.int(8, 21), rng.int(0, 59), rng.int(0, 59), 0);
  return date;
}

function buildPreparedProducts(
  storeSlug: string,
  category: CategoryTemplate,
  rng: SeedRandom,
) {
  const items: PreparedProduct[] = [];

  for (let index = 1; index <= PRODUCTS_PER_CATEGORY; index += 1) {
    const imagePool = productImages[category.key as keyof typeof productImages];
    const priceBase =
      category.key === "perfumes"
        ? rng.int(89, 229)
        : category.key === "calcados"
          ? rng.int(129, 279)
          : category.key === "acessorios"
            ? rng.int(29, 119)
            : rng.int(49, 129);
    const hasPromotion = rng.bool(0.45);
    const price = currency(priceBase + rng.next());
    const promotionalPrice = hasPromotion
      ? currency(price * (0.8 + rng.next() * 0.12))
      : null;
    const color = category.useColor ? rng.pick(colors) : null;
    const size = category.useSize ? rng.pick(sizes) : null;
    const fabric = category.useFabric ? rng.pick(fabrics) : null;
    const stockQuantity = rng.int(2, 40);
    const nameSeed =
      category.key === "camisetas"
        ? `Camiseta ${rng.pick(collections)} ${index}`
        : category.key === "perfumes"
          ? `Perfume ${rng.pick(["Aura", "Prime", "Noir", "Glow", "Nuit"])} ${index}`
          : category.key === "acessorios"
            ? `Acessorio ${rng.pick(["Smart", "Daily", "Club", "Go", "Pulse"])} ${index}`
            : `Tenis ${rng.pick(["Urban", "Sprint", "Flex", "Move", "Boost"])} ${index}`;
    const imageUrl = rng.pick(imagePool);
    const galleryJson = JSON.stringify(rng.sample(imagePool, imagePool.length));
    const slug = slugify(`${storeSlug}-${category.slug}-${index}-${nameSeed}`);
    const customValues =
      category.key === "camisetas"
        ? [
            { attributeName: "Modelagem", valueText: rng.pick(["Slim", "Regular", "Oversized"]) },
            { attributeName: "Colecao", valueText: rng.pick(collections) },
          ]
        : category.key === "perfumes"
          ? [
              { attributeName: "Volume", valueText: rng.pick(["30ml", "50ml", "100ml"]) },
              { attributeName: "Familia olfativa", valueText: rng.pick(fragranceFamilies) },
            ]
          : category.key === "acessorios"
            ? [
                {
                  attributeName: "Material",
                  valueText: rng.pick([
                    "Couro sintetico",
                    "Aluminio",
                    "Poliester",
                    "Silicone",
                  ]),
                },
                { attributeName: "Linha", valueText: rng.pick(accessoryLines) },
              ]
            : [
                {
                  attributeName: "Solado",
                  valueText: rng.pick(["Leve", "Estavel", "Amortecido"]),
                },
                { attributeName: "Linha", valueText: rng.pick(["Run", "Daily", "Urban"]) },
              ];

    items.push({
      categoryKey: category.key,
      name: nameSeed,
      slug,
      shortDescription: `${nameSeed} com proposta premium para teste intenso do sistema.`,
      fullDescription: `${nameSeed} com descricao detalhada, uso continuo, giro de estoque e navegacao no catalogo.`,
      sku: `${storeSlug.slice(-4).toUpperCase()}-${category.slug.slice(0, 3).toUpperCase()}-${index
        .toString()
        .padStart(3, "0")}`,
      price,
      promotionalPrice,
      imageUrl,
      galleryJson,
      isActive: true,
      isFeatured: index <= 8,
      trackStock: true,
      stockQuantity,
      color,
      size,
      fabric,
      weight: category.key === "perfumes" ? `${rng.int(200, 550)}g` : null,
      notes: rng.bool(0.3) ? "Produto de massa para stress test." : null,
      customValues,
    });
  }

  return items;
}

async function cleanupPreviousStressData() {
  const stores = await prisma.store.findMany({
    where: {
      slug: {
        startsWith: STRESS_PREFIX,
      },
    },
    select: {
      id: true,
    },
  });

  if (!stores.length) {
    return;
  }

  const storeIds = stores.map((store) => store.id);

  await prisma.auditLog.deleteMany({
    where: {
      OR: [{ storeId: { in: storeIds } }, { userId: null, entityType: "STRESS_TEST" }],
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { storeId: { in: storeIds } },
        { email: { startsWith: STRESS_PREFIX } },
        { email: { startsWith: "stress-loja" } },
      ],
    },
  });

  await prisma.store.deleteMany({
    where: {
      id: {
        in: storeIds,
      },
    },
  });
}

async function seedStore(storeTemplate: StoreTemplate, index: number) {
  const rng = new SeedRandom(20260423 + index * 997);
  const passwordHash = await bcrypt.hash("loja123", 10);

  const store = await prisma.store.create({
    data: {
      name: storeTemplate.name,
      slug: storeTemplate.slug,
      description: storeTemplate.description,
      whatsappNumber: storeTemplate.whatsappNumber,
      email: storeTemplate.email,
      phone: storeTemplate.phone,
      address: storeTemplate.address,
      primaryColor: storeTemplate.primaryColor,
      secondaryColor: storeTemplate.secondaryColor,
      accentColor: storeTemplate.accentColor,
      logoUrl: storeTemplate.logoUrl,
      bannerUrl: storeTemplate.bannerUrl,
      themeMode: "light",
      status: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: storeTemplate.adminName,
      email: storeTemplate.adminEmail,
      passwordHash,
      role: UserRole.STORE_ADMIN,
      storeId: store.id,
      isActive: true,
    },
  });

  const categories: Array<{
    id: string;
    slug: string;
    attributes: Array<{
      id: string;
      name: string;
    }>;
  }> = [];

  for (const [categoryIndex, categoryTemplate] of categoryTemplates.entries()) {
    const category = await prisma.category.create({
      data: {
        storeId: store.id,
        name: categoryTemplate.name,
        slug: categoryTemplate.slug,
        description: categoryTemplate.description,
        imageUrl: categoryTemplate.imageUrl,
        sortOrder: categoryIndex + 1,
        isActive: true,
        useStock: categoryTemplate.useStock,
        useColor: categoryTemplate.useColor,
        useSize: categoryTemplate.useSize,
        useFabric: categoryTemplate.useFabric,
        useDescription: categoryTemplate.useDescription,
        allowCustomAttributes: categoryTemplate.allowCustomAttributes,
        attributes: {
          create: categoryTemplate.attributes.map((attribute) => ({
            name: attribute.name,
            fieldType: attribute.fieldType,
            isRequired: attribute.isRequired,
            optionsJson: attribute.options?.length ? JSON.stringify(attribute.options) : null,
          })),
        },
      },
      include: {
        attributes: true,
      },
    });

    categories.push(category);
  }

  const preparedProducts = categories.flatMap((category) =>
    buildPreparedProducts(store.slug, categoryTemplates.find((item) => item.key === category.slug)!, rng).map(
      (product) => ({
        ...product,
        categoryId: category.id,
      }),
    ),
  );

  await prisma.product.createMany({
    data: preparedProducts.map((product) => ({
      storeId: store.id,
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      fullDescription: product.fullDescription,
      sku: product.sku,
      price: product.price,
      promotionalPrice: product.promotionalPrice,
      imageUrl: product.imageUrl,
      galleryJson: product.galleryJson,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      trackStock: product.trackStock,
      stockQuantity: product.stockQuantity,
      color: product.color,
      size: product.size,
      fabric: product.fabric,
      weight: product.weight,
      notes: product.notes,
    })),
  });

  const insertedProducts = await prisma.product.findMany({
    where: { storeId: store.id },
    select: {
      id: true,
      slug: true,
      name: true,
      price: true,
      promotionalPrice: true,
      trackStock: true,
      stockQuantity: true,
      color: true,
      size: true,
      fabric: true,
      categoryId: true,
    },
  });

  const productBySlug = new Map(insertedProducts.map((product) => [product.slug, product]));

  const attributeRows = preparedProducts.flatMap((product) => {
    const dbProduct = productBySlug.get(product.slug);
    const category = categories.find((item) => item.id === product.categoryId);

    if (!dbProduct || !category) {
      return [];
    }

    return product.customValues
      .map((customValue) => {
        const attribute = category.attributes.find(
          (item) => item.name === customValue.attributeName,
        );

        if (!attribute) {
          return null;
        }

        return {
          productId: dbProduct.id,
          attributeId: attribute.id,
          valueText: customValue.valueText,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      attributeId: string;
      valueText: string;
    }>;
  });

  if (attributeRows.length) {
    await prisma.productCustomAttributeValue.createMany({
      data: attributeRows,
    });
  }

  const workingProducts = insertedProducts.map((product) => ({
    ...product,
    stockQuantity: product.stockQuantity ?? 0,
    unitPrice: Number(product.promotionalPrice ?? product.price),
  }));
  const stockByProductId = new Map(
    workingProducts.map((product) => [product.id, product.stockQuantity]),
  );
  const stockMovements: Array<{
    storeId: string;
    productId: string;
    orderId: string;
    type: "ORDER_DECREASE";
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
    createdAt: Date;
    notes: string;
  }> = [];

  for (let orderIndex = 1; orderIndex <= ORDERS_PER_STORE; orderIndex += 1) {
    const createdAt = randomCreatedAt(rng, 90);
    const selectedProducts = rng.sample(workingProducts, rng.int(1, 4));
    const items = selectedProducts
      .map((product) => {
        const currentStock = stockByProductId.get(product.id) ?? 0;

        if (product.trackStock && currentStock <= 0) {
          return null;
        }

        const quantity = product.trackStock ? rng.int(1, Math.min(3, currentStock)) : rng.int(1, 3);

        if (quantity <= 0) {
          return null;
        }

        const attributes = [
          product.color ? `Cor: ${product.color}` : null,
          product.size ? `Tam: ${product.size}` : null,
          product.fabric ? `Tecido: ${product.fabric}` : null,
        ].filter(Boolean);

        return {
          productId: product.id,
          productNameSnapshot: product.name,
          quantity,
          unitPrice: product.unitPrice,
          attributesSnapshotJson: attributes.length ? JSON.stringify(attributes) : null,
        };
      })
      .filter(Boolean) as Array<{
      productId: string;
      productNameSnapshot: string;
      quantity: number;
      unitPrice: number;
      attributesSnapshotJson: string | null;
    }>;

    if (!items.length) {
      continue;
    }

    const status = rng.next() < 0.84 ? "SOLD" : "CANCELLED";
    const subtotal = currency(
      items.reduce((total, item) => total + item.quantity * item.unitPrice, 0),
    );

    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        customerName: `Cliente Stress ${orderIndex}`,
        customerPhone: `8399${(100000 + orderIndex).toString().slice(-6)}`,
        deliveryAddress: `Rua de Teste ${orderIndex}`,
        deliveryNumber: `${rng.int(10, 999)}`,
        deliveryDistrict: rng.pick(["Centro", "Bairro Novo", "Liberdade", "Jardim"]),
        deliveryCity: rng.pick(["Sousa", "Cajazeiras", "Patos", "Pombal"]),
        deliveryComplement: rng.bool(0.35) ? "Apartamento de simulacao" : null,
        deliveryReference: rng.bool(0.35) ? "Perto da praca central" : null,
        notes: rng.bool(0.25) ? "Pedido criado pela rotina de stress test." : null,
        subtotal,
        status,
        whatsappSentAt: createdAt,
        createdAt,
        items: {
          create: items,
        },
      },
      select: {
        id: true,
      },
    });

    if (status !== "CANCELLED") {
      for (const item of items) {
        const quantityBefore = stockByProductId.get(item.productId) ?? 0;
        const quantityAfter = Math.max(0, quantityBefore - item.quantity);

        stockByProductId.set(item.productId, quantityAfter);
        stockMovements.push({
          storeId: store.id,
          productId: item.productId,
          orderId: order.id,
          type: "ORDER_DECREASE",
          quantity: item.quantity,
          quantityBefore,
          quantityAfter,
          createdAt,
          notes: `Baixa automatica seed no pedido ${order.id}`,
        });
      }
    }
  }

  if (stockMovements.length) {
    await prisma.stockMovement.createMany({
      data: stockMovements,
    });
  }

  for (const product of workingProducts) {
    const finalStock = stockByProductId.get(product.id) ?? product.stockQuantity;

    if (finalStock !== product.stockQuantity) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          stockQuantity: finalStock,
        },
      });
    }
  }

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        storeId: store.id,
        action: "STRESS_SEED_STORE",
        entityType: "STRESS_TEST",
        entityId: store.id,
      },
      {
        userId: admin.id,
        storeId: store.id,
        action: "STRESS_SEED_PRODUCTS",
        entityType: "STRESS_TEST",
        entityId: String(preparedProducts.length),
      },
    ],
  });

  return {
    storeId: store.id,
    slug: store.slug,
    adminEmail: admin.email,
    products: preparedProducts.length,
    orders: ORDERS_PER_STORE,
  };
}

async function main() {
  console.log("Limpando lojas de stress anteriores...");
  await cleanupPreviousStressData();

  const summaries = [];

  for (const [index, storeTemplate] of storeTemplates.entries()) {
    console.log(`Criando ${storeTemplate.name}...`);
    summaries.push(await seedStore(storeTemplate, index + 1));
  }

  const totals = await prisma.$transaction([
    prisma.store.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.stockMovement.count(),
  ]);

  console.log("\nResumo das lojas de stress:");
  for (const summary of summaries) {
    console.log(
      `- ${summary.slug}: ${summary.products} produtos, ${summary.orders} pedidos, login ${summary.adminEmail} / loja123`,
    );
  }
  console.log(
    `\nTotais atuais do banco -> lojas: ${totals[0]}, produtos: ${totals[1]}, pedidos: ${totals[2]}, movimentos: ${totals[3]}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
