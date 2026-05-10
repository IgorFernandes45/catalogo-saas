import { z } from "zod";

import { isCatalogImageUrlAllowed } from "@/lib/catalog-images";

const hexColor = /^#([0-9a-fA-F]{6})$/;
const catalogImageUrl = (message: string) =>
  z
    .string()
    .url(message)
    .or(z.literal(""))
    .optional()
    .refine(
      (value) => isCatalogImageUrlAllowed(value),
      "Use uma imagem enviada pelo sistema/Cloudinary. URLs externas nao permitidas podem quebrar o catalogo.",
    );

export const loginSchema = z.object({
  email: z.email("Informe um e-mail valido."),
  password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres."),
});

export const storeSchema = z.object({
  name: z.string().min(2, "Nome da loja obrigatorio."),
  slug: z
    .string()
    .min(2, "Slug obrigatorio.")
    .regex(/^[a-z0-9-]+$/, "Use apenas letras minusculas, numeros e hifen."),
  description: z.string().optional(),
  logoUrl: catalogImageUrl("Logo invalida."),
  bannerUrl: catalogImageUrl("Banner invalido."),
  whatsappNumber: z.string().min(10, "WhatsApp obrigatorio."),
  email: z.email("E-mail invalido.").or(z.literal("")).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  primaryColor: z.string().regex(hexColor, "Cor principal invalida."),
  secondaryColor: z.string().regex(hexColor, "Cor secundaria invalida."),
  accentColor: z.string().regex(hexColor, "Cor de destaque invalida."),
  themeMode: z.enum(["light", "dark"]).default("light"),
  accessMode: z.enum(["FULL", "CATALOG_ONLY"]).optional(),
  catalogUsesImages: z.boolean().default(true),
  catalogProfile: z
    .enum(["FASHION", "BEAUTY", "DRINKS", "FOOD_MARKET", "ELECTRONICS", "CUSTOM"])
    .default("CUSTOM"),
  productAttributesJson: z.string().optional(),
  status: z.boolean().default(true),
});

export const categoryAttributeSchema = z.object({
  name: z.string().min(2, "Nome do atributo obrigatorio."),
  fieldType: z.enum(["TEXT", "NUMBER", "SELECT", "MULTISELECT"]),
  isRequired: z.boolean().default(false),
  options: z.array(z.string()).default([]),
});

export const categoryVariantGroupSchema = z.object({
  name: z.string().min(1, "Informe o nome do grupo de variacao."),
  options: z.array(z.string().min(1)).default([]),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Nome da categoria obrigatorio."),
  slug: z
    .string()
    .min(2, "Slug obrigatorio.")
    .regex(/^[a-z0-9-]+$/, "Slug invalido."),
  description: z.string().optional(),
  imageUrl: catalogImageUrl("Imagem invalida."),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  useStock: z.boolean().default(false),
  useColor: z.boolean().default(false),
  useSize: z.boolean().default(false),
  useFabric: z.boolean().default(false),
  useDescription: z.boolean().default(true),
  allowCustomAttributes: z.boolean().default(false),
  attributes: z.array(categoryAttributeSchema).default([]),
  variantGroups: z.array(categoryVariantGroupSchema).default([]),
});

export const productCustomValueSchema = z.object({
  attributeId: z.string().min(1),
  valueText: z.string().min(1),
});

export const productVariantSchema = z.object({
  label: z.string().min(1, "Informe um rotulo para a variacao."),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  imageUrl: catalogImageUrl("Imagem da variacao invalida."),
  priceOverride: z.number().positive().optional(),
  promotionalPriceOverride: z.number().nonnegative().optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  costPriceOverride: z.number().nonnegative().optional(),
  stockQuantity: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
  attributes: z.record(z.string(), z.string().min(1)).refine(
    (attributes) => Object.keys(attributes).length > 0,
    "Informe pelo menos um atributo na variacao.",
  ),
});

export const productSchema = z.object({
  parentProductId: z.string().optional(),
  categoryId: z.string().min(1, "Categoria obrigatoria."),
  name: z.string().min(2, "Nome do produto obrigatorio."),
  slug: z
    .string()
    .min(2, "Slug obrigatorio.")
    .regex(/^[a-z0-9-]+$/, "Slug invalido."),
  shortDescription: z.string().optional(),
  fullDescription: z.string().optional(),
  brandSupplier: z.string().optional(),
  attributesJson: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
    price: z.number().nonnegative("Preco deve ser zero ou maior."),
  promotionalPrice: z.number().nonnegative().optional(),
  costPrice: z.number().nonnegative().optional(),
  profitMarginPercent: z.number().nonnegative().optional(),
  imageUrl: catalogImageUrl("Imagem invalida."),
  gallery: z
    .array(
      z
        .string()
        .url("URL de galeria invalida.")
        .refine(
          (value) => isCatalogImageUrlAllowed(value),
          "Use imagens enviadas pelo sistema/Cloudinary na galeria.",
        ),
    )
    .default([]),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  trackStock: z.boolean().default(false),
  stockQuantity: z.number().int().nonnegative().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  fabric: z.string().optional(),
  weight: z.string().optional(),
  notes: z.string().optional(),
  customValues: z.array(productCustomValueSchema).default([]),
  variants: z.array(productVariantSchema).default([]),
}).superRefine((product, context) => {
  if (!product.variants.length && product.price <= 0) {
    context.addIssue({
      code: "custom",
      path: ["price"],
      message: "Preco deve ser maior que zero.",
  });
  }

  for (const [index, variant] of product.variants.entries()) {
    if (!variant.priceOverride || variant.priceOverride <= 0) {
      context.addIssue({
        code: "custom",
        path: ["variants", index, "priceOverride"],
        message: "Informe o preco de venda da variacao.",
      });
    }
  }
  });

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  productVariantId: z.string().optional(),
  productName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
  notes: z.string().optional(),
  attributes: z.array(z.string()).default([]),
});

export const orderSchema = z.object({
  customerName: z.string().min(2, "Nome obrigatorio."),
  customerPhone: z.string().min(10, "Telefone obrigatorio."),
  deliveryAddress: z.string().optional().default(""),
  deliveryNumber: z.string().optional(),
  deliveryDistrict: z.string().optional().default(""),
  deliveryCity: z.string().optional().default(""),
  deliveryComplement: z.string().optional(),
  deliveryReference: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Adicione pelo menos um item."),
});

export const manualSaleSchema = z.object({
  productId: z.string().min(1, "Selecione um produto."),
  productVariantId: z.string().optional(),
  quantity: z.number().int().positive("Informe uma quantidade valida."),
  paymentMethod: z.enum(["CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "BANK_TRANSFER", "OTHER"]).optional(),
  customerName: z.string().optional(),
  notes: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(2, "Nome do cliente obrigatorio."),
  phone: z.string().optional(),
  email: z.email("E-mail invalido.").or(z.literal("")).optional(),
  document: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  complement: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
