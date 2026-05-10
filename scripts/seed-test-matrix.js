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

const photoPool = [
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1605270012917-bf157c5a9541?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1585386959984-a41552231658?auto=format&fit=crop&w=900&q=80",
];

const matrixStores = [
  {
    name: "Matriz Moda Foto Vendas",
    slug: "matriz-moda-foto-vendas",
    email: "matriz.moda@catalogosaas.com",
    profile: "FASHION",
    accessMode: "FULL",
    catalogUsesImages: true,
    description: "Loja teste com vendas, fotos, produtos simples e variacoes por cor e tamanho.",
    colors: ["#111827", "#ea580c", "#22c55e"],
    categories: [
      { name: "Roupas", image: photoPool[0], flags: { useColor: true, useSize: true, useFabric: true } },
      { name: "Calcados", image: photoPool[2], flags: { useColor: true, useSize: true } },
      { name: "Categoria Inativa Teste", active: false },
    ],
    products: [
      {
        name: "Vestido Prisma Completo",
        category: "Roupas",
        description: "Produto com cor, tamanho, estoque e foto propria por variacao.",
        brand: "Prisma",
        variants: [
          { Cor: "Vermelho", Tamanho: "P", price: 139.9, promotionalPrice: 119.9, stock: 6, image: photoPool[0] },
          { Cor: "Vermelho", Tamanho: "M", price: 139.9, stock: 0, image: photoPool[1] },
          { Cor: "Azul", Tamanho: "P", price: 149.9, stock: 4, image: photoPool[2] },
          { Cor: "Azul", Tamanho: "G", price: 159.9, stock: 2, image: photoPool[3] },
        ],
      },
      {
        name: "Blusa Simples Algodao",
        category: "Roupas",
        description: "Produto simples com foto, estoque direto e preco promocional.",
        brand: "Basic Fit",
        image: photoPool[1],
        simple: { price: 69.9, promotionalPrice: 59.9, stock: 18 },
      },
      {
        name: "Tenis Grade Numeracao",
        category: "Calcados",
        description: "Produto variavel com numeracao e foto diferente por opcao.",
        brand: "Urban Test",
        variants: [
          { Cor: "Branco", Numeracao: "36", price: 219.9, stock: 5, image: photoPool[2] },
          { Cor: "Branco", Numeracao: "37", price: 219.9, stock: 0, image: photoPool[3] },
          { Cor: "Preto", Numeracao: "38", price: 229.9, stock: 7, image: photoPool[4] },
        ],
      },
    ],
  },
  {
    name: "Matriz Beauty Foto Catalogo",
    slug: "matriz-beauty-foto-catalogo",
    email: "matriz.beauty@catalogosaas.com",
    profile: "BEAUTY",
    accessMode: "CATALOG_ONLY",
    catalogUsesImages: true,
    description: "Loja teste somente catalogo com fotos, tons, acabamentos e volumes.",
    colors: ["#3f1d38", "#db2777", "#f59e0b"],
    categories: [
      { name: "Bases", image: photoPool[3], flags: { allowCustomAttributes: true } },
      { name: "Perfumes", image: photoPool[4] },
    ],
    products: [
      {
        name: "Base Tons Foto Propria",
        category: "Bases",
        description: "Cada tom troca foto, preco e estoque.",
        brand: "Glow Test",
        variants: [
          { Tom: "Claro 01", Acabamento: "Matte", price: 49.9, stock: 10, image: photoPool[3] },
          { Tom: "Medio 02", Acabamento: "Glow", price: 54.9, stock: 8, image: photoPool[4] },
          { Tom: "Escuro 03", Acabamento: "Natural", price: 59.9, stock: 0, image: photoPool[11] },
        ],
      },
      {
        name: "Perfume Volume Duplo",
        category: "Perfumes",
        description: "Varia apenas por volume com foto propria.",
        brand: "Aura Test",
        variants: [
          { Volume: "50ml", price: 129.9, stock: 5, image: photoPool[4] },
          { Volume: "100ml", price: 199.9, promotionalPrice: 179.9, stock: 3, image: photoPool[11] },
        ],
      },
    ],
  },
  {
    name: "Matriz Bebidas Sem Foto Vendas",
    slug: "matriz-bebidas-sem-foto-vendas",
    email: "matriz.bebidas@catalogosaas.com",
    profile: "DRINKS",
    accessMode: "FULL",
    catalogUsesImages: false,
    description: "Loja teste com vendas, mas catalogo sem fotos.",
    colors: ["#111827", "#b45309", "#22c55e"],
    categories: [
      { name: "Cervejas", flags: { useStock: true } },
      { name: "Sem Alcool", flags: { useStock: true } },
    ],
    products: [
      {
        name: "Cerveja Volume Sem Foto",
        category: "Cervejas",
        description: "Varia por volume e embalagem, sem area de imagem no catalogo.",
        brand: "Teste Puro Malte",
        variants: [
          { Volume: "350ml", Embalagem: "Lata", price: 4.99, stock: 90 },
          { Volume: "600ml", Embalagem: "Garrafa", price: 9.99, stock: 32 },
          { Volume: "Pack 12", Embalagem: "Lata", price: 54.9, promotionalPrice: 49.9, stock: 0 },
        ],
      },
      {
        name: "Agua Caixa Produto Simples",
        category: "Sem Alcool",
        description: "Produto simples sem foto e com estoque direto.",
        brand: "Agua Teste",
        simple: { price: 21.9, stock: 25 },
      },
    ],
  },
  {
    name: "Matriz Mercado Sem Foto Catalogo",
    slug: "matriz-mercado-sem-foto-catalogo",
    email: "matriz.mercado@catalogosaas.com",
    profile: "FOOD_MARKET",
    accessMode: "CATALOG_ONLY",
    catalogUsesImages: false,
    description: "Loja teste somente catalogo e sem fotos.",
    colors: ["#14532d", "#16a34a", "#f59e0b"],
    categories: [
      { name: "Mercearia", flags: { useStock: true } },
      { name: "Congelados", flags: { useStock: true } },
    ],
    products: [
      {
        name: "Cafe Peso Sem Foto",
        category: "Mercearia",
        description: "Produto com variacao por peso sem foto.",
        brand: "Serra Teste",
        variants: [
          { "Peso/Volume": "250g", price: 9.99, stock: 30 },
          { "Peso/Volume": "500g", price: 18.99, promotionalPrice: 16.99, stock: 0 },
        ],
      },
      {
        name: "Banana Produto Simples Sem Foto",
        category: "Mercearia",
        description: "Produto simples em catalogo sem fotos.",
        brand: "Raiz Teste",
        simple: { price: 6.99, stock: 40 },
      },
      {
        name: "Polpa Sabor Sem Foto",
        category: "Congelados",
        description: "Produto com sabor e estoque por variacao.",
        brand: "Fruta Teste",
        variants: [
          { Sabor: "Acerola", price: 3.99, stock: 20 },
          { Sabor: "Caju", price: 3.99, stock: 14 },
        ],
      },
    ],
  },
  {
    name: "Matriz Tech Foto Vendas",
    slug: "matriz-tech-foto-vendas",
    email: "matriz.tech@catalogosaas.com",
    profile: "ELECTRONICS",
    accessMode: "FULL",
    catalogUsesImages: true,
    description: "Loja teste de eletronicos com fotos por cor, capacidade e voltagem.",
    colors: ["#0f172a", "#2563eb", "#06b6d4"],
    categories: [
      { name: "Celulares", image: photoPool[9], flags: { useColor: true } },
      { name: "Acessorios", image: photoPool[10], flags: { useColor: true } },
    ],
    products: [
      {
        name: "Smartphone Matrix Pro",
        category: "Celulares",
        description: "Varia por cor e capacidade, cada variacao com foto e preco.",
        brand: "Matrix",
        variants: [
          { Cor: "Preto", Capacidade: "128GB", price: 1899.9, stock: 5, image: photoPool[9] },
          { Cor: "Preto", Capacidade: "256GB", price: 2199.9, stock: 2, image: photoPool[10] },
          { Cor: "Azul", Capacidade: "128GB", price: 1949.9, stock: 0, image: photoPool[11] },
        ],
      },
      {
        name: "Carregador Turbo Bivolt",
        category: "Acessorios",
        description: "Produto com variacao por potencia e voltagem.",
        brand: "ChargeX",
        variants: [
          { Voltagem: "Bivolt", Capacidade: "20W", price: 79.9, stock: 20, image: photoPool[10] },
          { Voltagem: "Bivolt", Capacidade: "45W", price: 129.9, promotionalPrice: 109.9, stock: 8, image: photoPool[9] },
        ],
      },
      {
        name: "Cabo USB-C Simples",
        category: "Acessorios",
        description: "Produto simples com foto e codigo proprio.",
        brand: "ChargeX",
        image: photoPool[10],
        simple: { price: 34.9, stock: 35 },
      },
    ],
  },
  {
    name: "Matriz Custom Foto Catalogo",
    slug: "matriz-custom-foto-catalogo",
    email: "matriz.custom@catalogosaas.com",
    profile: "CUSTOM",
    accessMode: "CATALOG_ONLY",
    catalogUsesImages: true,
    description: "Loja teste customizada para materiais, modelos e atributos extras.",
    colors: ["#1e293b", "#7c3aed", "#f97316"],
    categories: [
      { name: "Decoracao", image: photoPool[7], flags: { allowCustomAttributes: true } },
      { name: "Presentes", image: photoPool[8], flags: { allowCustomAttributes: true } },
    ],
    products: [
      {
        name: "Luminaria Modelo Foto",
        category: "Decoracao",
        description: "Produto customizado com modelo e material por variacao.",
        brand: "Casa Matrix",
        variants: [
          { Modelo: "Mesa", Material: "Madeira", price: 149.9, stock: 6, image: photoPool[7] },
          { Modelo: "Chao", Material: "Metal", price: 249.9, stock: 3, image: photoPool[8] },
          { Modelo: "Pendente", Material: "Fibra", price: 199.9, stock: 0, image: photoPool[0] },
        ],
      },
      {
        name: "Kit Presente Simples",
        category: "Presentes",
        description: "Produto simples com foto para testar catalogo sem vendas.",
        brand: "Gift Test",
        image: photoPool[8],
        simple: { price: 89.9, promotionalPrice: 74.9, stock: 12 },
      },
    ],
  },
];

function optionAttributes(variant) {
  const attributes = { ...variant };
  delete attributes.price;
  delete attributes.promotionalPrice;
  delete attributes.stock;
  delete attributes.image;
  return attributes;
}

function optionLabel(attributes) {
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
}

function storePrefix(slug) {
  return slug
    .split("-")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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

async function resetStore(storeId) {
  await prisma.order.deleteMany({ where: { storeId } });
  await prisma.stockMovement.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
}

async function createCategories(storeId, spec) {
  const categories = new Map();

  for (const [index, categorySpec] of spec.categories.entries()) {
    const category = await prisma.category.create({
      data: {
        storeId,
        name: categorySpec.name,
        slug: slugify(categorySpec.name),
        description: `Categoria de teste para ${categorySpec.name}.`,
        imageUrl: spec.catalogUsesImages ? categorySpec.image || null : null,
        sortOrder: index,
        isActive: categorySpec.active !== false,
        useStock: categorySpec.flags?.useStock || false,
        useColor: categorySpec.flags?.useColor || false,
        useSize: categorySpec.flags?.useSize || false,
        useFabric: categorySpec.flags?.useFabric || false,
        useDescription: true,
        allowCustomAttributes: categorySpec.flags?.allowCustomAttributes || false,
        attributes: {
          create: categorySpec.flags?.allowCustomAttributes
            ? [
                {
                  name: "Material teste",
                  fieldType: "TEXT",
                  isRequired: false,
                },
                {
                  name: "Linha teste",
                  fieldType: "SELECT",
                  isRequired: false,
                  optionsJson: JSON.stringify(["Basica", "Premium", "Limitada"]),
                },
              ]
            : [],
        },
      },
      include: { attributes: true },
    });

    categories.set(categorySpec.name, category);
  }

  return categories;
}

async function createProducts(store, spec, categories) {
  const createdProducts = [];

  for (const [index, productSpec] of spec.products.entries()) {
    const category = categories.get(productSpec.category);
    const variants = productSpec.variants || [];
    const firstVariant = variants[0];
    const simple = productSpec.simple;
    const price = firstVariant?.price ?? simple.price;
    const imageUrl = spec.catalogUsesImages
      ? productSpec.image || firstVariant?.image || null
      : null;
    const skuBase = `${storePrefix(spec.slug)}-${String(index + 1).padStart(3, "0")}`;

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
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
        barcode: variants.length ? null : `78999${String(index + 1).padStart(8, "0")}`,
        price,
        promotionalPrice: firstVariant?.promotionalPrice ?? simple?.promotionalPrice ?? null,
        costPrice: Number((price * 0.58).toFixed(2)),
        profitMarginPercent: 42,
        imageUrl,
        galleryJson: spec.catalogUsesImages && imageUrl ? JSON.stringify([imageUrl]) : null,
        isActive: true,
        isFeatured: index === 0,
        trackStock: true,
        stockQuantity: variants.length ? null : simple.stock,
        notes: "Produto criado pela matriz automatica de testes.",
      },
    });

    if (category.attributes.length) {
      await prisma.productCustomAttributeValue.createMany({
        data: category.attributes.slice(0, 2).map((attribute, attributeIndex) => ({
          productId: product.id,
          attributeId: attribute.id,
          valueText: attributeIndex === 0 ? "Teste informativo" : "Premium",
        })),
      });
    }

    if (variants.length) {
      await prisma.productVariant.createMany({
        data: variants.map((variant, variantIndex) => {
          const attributes = optionAttributes(variant);
          const variantImageUrl = spec.catalogUsesImages ? variant.image || imageUrl : null;

          return {
            productId: product.id,
            label: optionLabel(attributes),
            sku: `${skuBase}-V${String(variantIndex + 1).padStart(2, "0")}`,
            barcode: `78988${String(index + 1).padStart(4, "0")}${String(
              variantIndex + 1,
            ).padStart(4, "0")}`,
            imageUrl: variantImageUrl,
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

    createdProducts.push(product);
  }

  return createdProducts;
}

async function createSalesData(store, spec) {
  if (spec.accessMode !== "FULL") {
    return;
  }

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { variants: true },
    take: 3,
  });

  for (const [index, product] of products.entries()) {
    const variant = product.variants.find((item) => item.stockQuantity > 0) || null;
    const unitPrice = Number(
      variant?.promotionalPriceOverride ||
        variant?.priceOverride ||
        product.promotionalPrice ||
        product.price,
    );
    const unitCost = Number(variant?.costPriceOverride || product.costPrice || 0);
    const status = index === 2 ? "PENDING" : "SOLD";

    await prisma.order.create({
      data: {
        storeId: store.id,
        customerName: status === "PENDING" ? "Cliente Pedido Aberto" : `Cliente Venda ${index + 1}`,
        customerPhone: "83999999999",
        deliveryAddress: "Rua de teste",
        deliveryNumber: "100",
        deliveryDistrict: "Centro",
        deliveryCity: "Cidade teste",
        deliveryComplement: "Apto teste",
        deliveryReference: "Perto da praca",
        subtotal: unitPrice * 2,
        paymentMethod: status === "SOLD" ? (index % 2 ? "PIX" : "CASH") : null,
        status,
        whatsappSentAt: new Date(),
        items: {
          create: {
            productId: product.id,
            productVariantId: variant?.id || null,
            productNameSnapshot: product.name,
            productVariantLabelSnapshot: variant?.label || null,
            quantity: 2,
            unitPrice,
            costPriceSnapshot: unitCost,
            profitSnapshot: status === "SOLD" ? (unitPrice - unitCost) * 2 : null,
          },
        },
      },
    });
  }
}

async function main() {
  const passwordHash = await bcrypt.hash("loja123", 10);
  const result = [];

  for (const spec of matrixStores) {
    const store = await upsertStore(spec, passwordHash);
    await resetStore(store.id);
    const categories = await createCategories(store.id, spec);
    await createProducts(store, spec, categories);
    await createSalesData(store, spec);

    const summary = await prisma.store.findUnique({
      where: { id: store.id },
      select: {
        slug: true,
        accessMode: true,
        catalogUsesImages: true,
        _count: {
          select: {
            categories: true,
            products: true,
            orders: true,
          },
        },
        products: {
          select: {
            variants: {
              select: {
                imageUrl: true,
                stockQuantity: true,
              },
            },
          },
        },
      },
    });

    result.push({
      loja: spec.name,
      slug: spec.slug,
      email: spec.email,
      senha: "loja123",
      modo: summary.accessMode,
      fotos: summary.catalogUsesImages ? "com fotos" : "sem fotos",
      categorias: summary._count.categories,
      produtos: summary._count.products,
      pedidos: summary._count.orders,
      variacoes: summary.products.reduce((total, product) => total + product.variants.length, 0),
      variacoesComFoto: summary.products.reduce(
        (total, product) => total + product.variants.filter((variant) => variant.imageUrl).length,
        0,
      ),
      variacoesSemEstoque: summary.products.reduce(
        (total, product) =>
          total + product.variants.filter((variant) => variant.stockQuantity === 0).length,
        0,
      ),
    });
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
