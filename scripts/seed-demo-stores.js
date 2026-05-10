/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const images = {
  fashion: [
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  ],
  beauty: [
    "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  ],
  drinks: [
    "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1605270012917-bf157c5a9541?auto=format&fit=crop&w=900&q=80",
  ],
  market: [
    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80",
  ],
};

const demoStores = [
  {
    name: "Atelier Serena Moda",
    slug: "atelier-serena-moda",
    email: "serena@catalogosaas.com",
    profile: "FASHION",
    accessMode: "FULL",
    catalogUsesImages: true,
    description: "Moda feminina casual chic com pecas versateis para o dia a dia.",
    colors: ["#111827", "#ea580c", "#16a34a"],
    categories: ["Vestidos", "Calcados", "Blusas"],
    products: [
      {
        name: "Vestido Midi Serena",
        category: "Vestidos",
        description: "Vestido midi em viscose com caimento leve.",
        brand: "Serena",
        image: images.fashion[0],
        variants: [
          { Cor: "Preto", Tamanho: "P", price: 149.9, promotionalPrice: 129.9, stock: 7 },
          { Cor: "Preto", Tamanho: "M", price: 149.9, stock: 0 },
          { Cor: "Terracota", Tamanho: "P", price: 159.9, stock: 4 },
          { Cor: "Terracota", Tamanho: "G", price: 159.9, promotionalPrice: 139.9, stock: 3 },
        ],
      },
      {
        name: "Tenis Urban Serena",
        category: "Calcados",
        description: "Tenis casual confortavel para rotina urbana.",
        brand: "Urban Step",
        image: images.fashion[2],
        variants: [
          { Cor: "Branco", Numeracao: "36", price: 219.9, stock: 5 },
          { Cor: "Branco", Numeracao: "37", price: 219.9, stock: 6 },
          { Cor: "Caramelo", Numeracao: "38", price: 229.9, stock: 2 },
          { Cor: "Caramelo", Numeracao: "39", price: 229.9, stock: 0 },
        ],
      },
      {
        name: "Blusa Linho Essencial",
        category: "Blusas",
        description: "Blusa de linho misto com toque fresco.",
        brand: "Serena",
        image: images.fashion[1],
        simple: { price: 89.9, promotionalPrice: 79.9, stock: 12 },
      },
      {
        name: "Calca Wide Alfaiataria",
        category: "Vestidos",
        description: "Modelagem wide com cintura alta e tecido encorpado.",
        brand: "Serena",
        image: images.fashion[1],
        variants: [
          { Cor: "Off White", Tamanho: "M", price: 189.9, stock: 4 },
          { Cor: "Off White", Tamanho: "G", price: 189.9, stock: 2 },
          { Cor: "Marinho", Tamanho: "M", price: 199.9, stock: 5 },
        ],
      },
      {
        name: "Sandalia Minimal Couro",
        category: "Calcados",
        description: "Sandalia leve com tiras finas e acabamento macio.",
        brand: "Serena",
        image: images.fashion[2],
        variants: [
          { Cor: "Nude", Numeracao: "35", price: 169.9, stock: 3 },
          { Cor: "Nude", Numeracao: "36", price: 169.9, stock: 5 },
          { Cor: "Preta", Numeracao: "37", price: 179.9, stock: 4 },
        ],
      },
      {
        name: "Cropped Canelado Duo",
        category: "Blusas",
        description: "Cropped canelado com elastano e boa sustentacao.",
        brand: "Basic Mood",
        image: images.fashion[0],
        variants: [
          { Cor: "Rosa", Tamanho: "P", price: 59.9, stock: 9 },
          { Cor: "Rosa", Tamanho: "M", price: 59.9, stock: 8 },
          { Cor: "Branco", Tamanho: "P", price: 59.9, stock: 0 },
        ],
      },
    ],
  },
  {
    name: "Lumiere Beauty Lab",
    slug: "lumiere-beauty-lab",
    email: "lumiere@catalogosaas.com",
    profile: "BEAUTY",
    accessMode: "FULL",
    catalogUsesImages: true,
    description: "Maquiagem, skincare e fragrancias selecionadas para todos os estilos.",
    colors: ["#3f1d38", "#db2777", "#f59e0b"],
    categories: ["Maquiagem", "Skin Care", "Perfumes"],
    products: [
      {
        name: "Base Velvet Skin",
        category: "Maquiagem",
        description: "Base liquida com acabamento natural e cobertura media.",
        brand: "Ruby Glow",
        image: images.beauty[0],
        variants: [
          { Tom: "Claro 01", Acabamento: "Matte", price: 54.9, stock: 10 },
          { Tom: "Medio 02", Acabamento: "Matte", price: 54.9, stock: 8 },
          { Tom: "Escuro 03", Acabamento: "Glow", price: 59.9, stock: 4 },
        ],
      },
      {
        name: "Batom Lip Tint Soft",
        category: "Maquiagem",
        description: "Lip tint leve com cor construivel.",
        brand: "Lumiere",
        image: images.beauty[1],
        variants: [
          { Cor: "Vermelho", Acabamento: "Natural", price: 29.9, stock: 14 },
          { Cor: "Rosa", Acabamento: "Natural", price: 29.9, stock: 13 },
          { Cor: "Cereja", Acabamento: "Gloss", price: 34.9, stock: 0 },
        ],
      },
      {
        name: "Serum Vitamina C 30ml",
        category: "Skin Care",
        description: "Serum antioxidante para rotina diurna.",
        brand: "Dermaluz",
        image: images.beauty[0],
        simple: { price: 89.9, promotionalPrice: 74.9, stock: 7 },
      },
      {
        name: "Perfume Aura Floral",
        category: "Perfumes",
        description: "Fragrancia floral ambarada com fixacao prolongada.",
        brand: "Aura",
        image: images.beauty[1],
        variants: [
          { Volume: "50ml", price: 129.9, stock: 5 },
          { Volume: "100ml", price: 199.9, promotionalPrice: 179.9, stock: 3 },
        ],
      },
      {
        name: "Mascara Volume Max",
        category: "Maquiagem",
        description: "Mascara para cilios com efeito volume imediato.",
        brand: "Ruby Glow",
        image: images.beauty[0],
        simple: { price: 39.9, stock: 16 },
      },
      {
        name: "Hidratante Skin Calm",
        category: "Skin Care",
        description: "Hidratante leve para pele mista e sensivel.",
        brand: "Dermaluz",
        image: images.beauty[1],
        variants: [
          { Volume: "60g", price: 64.9, stock: 6 },
          { Volume: "120g", price: 109.9, stock: 4 },
        ],
      },
    ],
  },
  {
    name: "Nobre Adega Express",
    slug: "nobre-adega-express",
    email: "adega@catalogosaas.com",
    profile: "DRINKS",
    accessMode: "FULL",
    catalogUsesImages: true,
    description: "Bebidas geladas, packs e destilados para entrega rapida.",
    colors: ["#111827", "#b45309", "#22c55e"],
    categories: ["Cervejas", "Destilados", "Sem alcool"],
    products: [
      {
        name: "Cerveja Puro Malte Premium",
        category: "Cervejas",
        description: "Cerveja puro malte leve e refrescante.",
        brand: "Nobre",
        image: images.drinks[0],
        variants: [
          { Volume: "350ml", Embalagem: "Lata", price: 4.99, stock: 80 },
          { Volume: "600ml", Embalagem: "Garrafa", price: 9.99, stock: 28 },
          { Volume: "Pack 12", Embalagem: "Lata", price: 54.9, promotionalPrice: 49.9, stock: 10 },
        ],
      },
      {
        name: "Whisky Reserva 8 Anos",
        category: "Destilados",
        description: "Whisky nacional reserva com notas amadeiradas.",
        brand: "Reserva Norte",
        image: images.drinks[1],
        variants: [
          { Volume: "750ml", price: 89.9, stock: 7 },
          { Volume: "1L", price: 119.9, stock: 4 },
        ],
      },
      {
        name: "Energetico Citrus Ice",
        category: "Sem alcool",
        description: "Energetico sabor citrus bem gelado.",
        brand: "Volt",
        image: images.drinks[0],
        variants: [
          { Volume: "250ml", Sabor: "Citrus", price: 7.99, stock: 36 },
          { Volume: "473ml", Sabor: "Citrus", price: 11.99, stock: 20 },
          { Volume: "473ml", Sabor: "Tropical", price: 11.99, stock: 0 },
        ],
      },
      {
        name: "Agua Mineral Caixa 12un",
        category: "Sem alcool",
        description: "Agua mineral sem gas em caixa economica.",
        brand: "Serra Clara",
        image: images.drinks[1],
        simple: { price: 21.9, stock: 18 },
      },
      {
        name: "Gin Botanico Dry",
        category: "Destilados",
        description: "Gin seco com botanicos citricos.",
        brand: "Botanique",
        image: images.drinks[1],
        simple: { price: 99.9, promotionalPrice: 89.9, stock: 5 },
      },
      {
        name: "Refrigerante Cola Familia",
        category: "Sem alcool",
        description: "Refrigerante cola para consumo familiar.",
        brand: "Cola Norte",
        image: images.drinks[0],
        variants: [
          { Volume: "1L", price: 6.99, stock: 24 },
          { Volume: "2L", price: 9.99, stock: 32 },
        ],
      },
    ],
  },
  {
    name: "Mercado Raiz da Terra",
    slug: "mercado-raiz-da-terra",
    email: "mercado@catalogosaas.com",
    profile: "FOOD_MARKET",
    accessMode: "FULL",
    catalogUsesImages: true,
    description: "Mercado de bairro com alimentos, hortifruti e produtos do dia.",
    colors: ["#14532d", "#16a34a", "#f59e0b"],
    categories: ["Hortifruti", "Mercearia", "Congelados"],
    products: [
      {
        name: "Banana Prata Selecionada",
        category: "Hortifruti",
        description: "Banana prata selecionada, venda por kg.",
        brand: "Raiz da Terra",
        image: images.market[1],
        simple: { price: 6.99, stock: 40 },
      },
      {
        name: "Cafe Tradicional 500g",
        category: "Mercearia",
        description: "Cafe torrado e moido com aroma intenso.",
        brand: "Serra Alta",
        image: images.market[0],
        variants: [
          { "Peso/Volume": "250g", price: 9.99, stock: 30 },
          { "Peso/Volume": "500g", price: 18.99, promotionalPrice: 16.99, stock: 22 },
        ],
      },
      {
        name: "Arroz Tipo 1 Premium",
        category: "Mercearia",
        description: "Arroz branco tipo 1 soltinho.",
        brand: "Campo Bom",
        image: images.market[0],
        variants: [
          { "Peso/Volume": "1kg", price: 6.49, stock: 50 },
          { "Peso/Volume": "5kg", price: 29.9, stock: 18 },
        ],
      },
      {
        name: "Polpa de Fruta Natural",
        category: "Congelados",
        description: "Polpa congelada sem conservantes.",
        brand: "Fruta Viva",
        image: images.market[1],
        variants: [
          { Sabor: "Acerola", price: 3.99, stock: 20 },
          { Sabor: "Caju", price: 3.99, stock: 16 },
          { Sabor: "Manga", price: 4.49, stock: 0 },
        ],
      },
      {
        name: "Pao de Queijo Congelado",
        category: "Congelados",
        description: "Pacote congelado pronto para assar.",
        brand: "Minas Forno",
        image: images.market[0],
        variants: [
          { "Peso/Volume": "400g", price: 14.9, stock: 8 },
          { "Peso/Volume": "1kg", price: 31.9, stock: 5 },
        ],
      },
      {
        name: "Tomate Italiano Kg",
        category: "Hortifruti",
        description: "Tomate italiano fresco para molhos e saladas.",
        brand: "Raiz da Terra",
        image: images.market[1],
        simple: { price: 8.99, stock: 35 },
      },
    ],
  },
  {
    name: "Papelaria Linha Clara",
    slug: "papelaria-linha-clara",
    email: "papelaria@catalogosaas.com",
    profile: "CUSTOM",
    accessMode: "CATALOG_ONLY",
    catalogUsesImages: false,
    description: "Materiais de escritorio, escolar e organizacao com consulta rapida.",
    colors: ["#1e293b", "#2563eb", "#f97316"],
    categories: ["Escritorio", "Escolar", "Organizacao"],
    products: [
      {
        name: "Caderno Executivo Pontilhado",
        category: "Escritorio",
        description: "Caderno capa dura para anotacoes e planejamento.",
        brand: "Linha Clara",
        simple: { price: 34.9, stock: 18 },
      },
      {
        name: "Caneta Gel Premium",
        category: "Escolar",
        description: "Caneta gel escrita macia para uso diario.",
        brand: "Grafix",
        variants: [
          { Cor: "Azul", price: 5.99, stock: 35 },
          { Cor: "Preta", price: 5.99, stock: 42 },
          { Cor: "Vermelha", price: 5.99, stock: 0 },
        ],
      },
      {
        name: "Planner Semanal Mesa",
        category: "Organizacao",
        description: "Planner semanal destacavel para mesa.",
        brand: "Linha Clara",
        simple: { price: 24.9, promotionalPrice: 19.9, stock: 12 },
      },
      {
        name: "Marcador Brush Kit",
        category: "Escolar",
        description: "Kit de marcadores brush para lettering.",
        brand: "ColorUp",
        variants: [
          { Modelo: "Kit 6 cores", price: 39.9, stock: 9 },
          { Modelo: "Kit 12 cores", price: 69.9, stock: 6 },
          { Modelo: "Kit pastel", price: 44.9, stock: 4 },
        ],
      },
      {
        name: "Caixa Organizadora A4",
        category: "Organizacao",
        description: "Caixa rigida para documentos tamanho A4.",
        brand: "Office Max",
        variants: [
          { Cor: "Transparente", price: 18.9, stock: 20 },
          { Cor: "Fume", price: 19.9, stock: 11 },
        ],
      },
      {
        name: "Papel Sulfite 500 Folhas",
        category: "Escritorio",
        description: "Resma sulfite A4 75g branca.",
        brand: "PaperOne",
        simple: { price: 27.9, stock: 25 },
      },
    ],
  },
];

function variantAttributes(variant) {
  const attributes = { ...variant };
  delete attributes.price;
  delete attributes.promotionalPrice;
  delete attributes.stock;
  return attributes;
}

function variantLabel(attributes) {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
}

async function upsertStore(spec, passwordHash) {
  let store = await prisma.store.findFirst({
    where: { OR: [{ slug: spec.slug }, { email: spec.email }] },
  });

  const data = {
    name: spec.name,
    slug: spec.slug,
    description: spec.description,
    whatsappNumber: "5583999999999",
    email: spec.email,
    primaryColor: spec.colors[0],
    secondaryColor: spec.colors[1],
    accentColor: spec.colors[2],
    accessMode: spec.accessMode,
    catalogProfile: spec.profile,
    catalogUsesImages: spec.catalogUsesImages,
    status: true,
  };

  store = store
    ? await prisma.store.update({ where: { id: store.id }, data })
    : await prisma.store.create({ data });

  await prisma.user.upsert({
    where: { email: spec.email },
    update: {
      name: `Gestor ${spec.name}`,
      storeId: store.id,
      passwordHash,
      role: "STORE_ADMIN",
      isActive: true,
    },
    create: {
      name: `Gestor ${spec.name}`,
      email: spec.email,
      passwordHash,
      role: "STORE_ADMIN",
      storeId: store.id,
      isActive: true,
    },
  });

  return store;
}

async function resetStoreData(storeId) {
  await prisma.order.deleteMany({ where: { storeId } });
  await prisma.stockMovement.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
}

async function createCatalog(store, spec) {
  const categories = new Map();

  for (const [index, categoryName] of spec.categories.entries()) {
    const category = await prisma.category.create({
      data: {
        storeId: store.id,
        name: categoryName,
        slug: slugify(categoryName),
        sortOrder: index,
        isActive: true,
        useDescription: true,
      },
    });

    categories.set(categoryName, category);
  }

  for (const [index, productSpec] of spec.products.entries()) {
    const variants = productSpec.variants || [];
    const firstVariant = variants[0];
    const simple = productSpec.simple;
    const basePrice = firstVariant?.price ?? simple.price;
    const skuBase = `${spec.slug
      .split("-")
      .map((part) => part[0])
      .join("")
      .toUpperCase()}-${String(index + 1).padStart(3, "0")}`;

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: categories.get(productSpec.category).id,
        name: productSpec.name,
        slug: slugify(productSpec.name),
        shortDescription: productSpec.description,
        fullDescription: productSpec.description,
        brandSupplier: productSpec.brand,
        attributesJson: JSON.stringify({
          brand: productSpec.brand,
          model: productSpec.name.split(" ").slice(0, 2).join(" "),
        }),
        sku: variants.length ? null : skuBase,
        barcode: variants.length ? null : `789${String(index + 1).padStart(10, "0")}`,
        price: basePrice,
        promotionalPrice: firstVariant?.promotionalPrice ?? simple?.promotionalPrice ?? null,
        costPrice: Number((basePrice * 0.58).toFixed(2)),
        imageUrl: spec.catalogUsesImages ? productSpec.image || null : null,
        galleryJson:
          spec.catalogUsesImages && productSpec.image
            ? JSON.stringify([productSpec.image])
            : null,
        isActive: true,
        isFeatured: index < 2,
        trackStock: true,
        stockQuantity: variants.length ? null : simple.stock,
      },
    });

    if (variants.length) {
      await prisma.productVariant.createMany({
        data: variants.map((variant, variantIndex) => {
          const attributes = variantAttributes(variant);
          return {
            productId: product.id,
            label: variantLabel(attributes),
            sku: `${skuBase}-V${String(variantIndex + 1).padStart(2, "0")}`,
            barcode: `789${String(index + 1).padStart(5, "0")}${String(
              variantIndex + 1,
            ).padStart(5, "0")}`,
            imageUrl: spec.catalogUsesImages ? productSpec.image || null : null,
            priceOverride: variant.price,
            promotionalPriceOverride: variant.promotionalPrice || null,
            costPriceOverride: Number((variant.price * 0.58).toFixed(2)),
            stockQuantity: variant.stock,
            isActive: true,
            attributesJson: JSON.stringify(attributes),
          };
        }),
      });
    }
  }
}

async function createSales(storeId) {
  const products = await prisma.product.findMany({
    where: { storeId },
    include: { variants: true },
    take: 4,
  });

  for (const [index, product] of products.entries()) {
    const variant = product.variants[0] || null;
    const unitPrice = Number(
      variant?.promotionalPriceOverride ||
        variant?.priceOverride ||
        product.promotionalPrice ||
        product.price,
    );
    const unitCost = Number(variant?.costPriceOverride || product.costPrice || 0);

    await prisma.order.create({
      data: {
        storeId,
        customerName: `Cliente Teste ${index + 1}`,
        customerPhone: "83999999999",
        deliveryAddress: "Venda de teste",
        deliveryDistrict: "Centro",
        deliveryCity: "Cidade teste",
        subtotal: unitPrice * 2,
        paymentMethod: index % 2 ? "PIX" : "CASH",
        status: "SOLD",
        items: {
          create: {
            productId: product.id,
            productVariantId: variant?.id || null,
            productNameSnapshot: product.name,
            productVariantLabelSnapshot: variant?.label || null,
            quantity: 2,
            unitPrice,
            costPriceSnapshot: unitCost,
            profitSnapshot: (unitPrice - unitCost) * 2,
          },
        },
      },
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash("loja123", 10);
  const logins = [];

  for (const spec of demoStores) {
    const store = await upsertStore(spec, passwordHash);
    await resetStoreData(store.id);
    await createCatalog(store, spec);

    if (spec.accessMode === "FULL") {
      await createSales(store.id);
    }

    logins.push({
      loja: spec.name,
      slug: spec.slug,
      email: spec.email,
      senha: "loja123",
      modo: spec.accessMode,
      fotos: spec.catalogUsesImages ? "com fotos" : "sem fotos",
    });
  }

  console.log(JSON.stringify(logins, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
