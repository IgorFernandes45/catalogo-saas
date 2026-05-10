import { parseCurrency } from "@/lib/utils";

export type ParsedVariantInput = {
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
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function parseVariantDefinitions(rawValue: string) {
  return rawValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [
        attributesRaw = "",
        skuRaw = "",
        priceRaw = "",
        stockRaw = "0",
        activeRaw = "sim",
        barcodeRaw = "",
        costRaw = "",
        imageRaw = "",
        promotionalPriceRaw = "",
        discountPercentRaw = "",
      ] = line.split("|").map((item) => item.trim());

      const attributes = attributesRaw
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((accumulator, item) => {
          const [key = "", value = ""] = item.split("=").map((part) => part.trim());

          if (key && value) {
            accumulator[key] = value;
          }

          return accumulator;
        }, {});

      const label = Object.entries(attributes)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" | ");

      return {
        label,
        sku: skuRaw || undefined,
        barcode: barcodeRaw || undefined,
        imageUrl: imageRaw || undefined,
        priceOverride: priceRaw ? parseCurrency(priceRaw) : undefined,
        promotionalPriceOverride: promotionalPriceRaw
          ? parseCurrency(promotionalPriceRaw)
          : undefined,
        discountPercent: discountPercentRaw
          ? Number(discountPercentRaw.replace(",", "."))
          : undefined,
        costPriceOverride: costRaw ? parseCurrency(costRaw) : undefined,
        stockQuantity: Number.isFinite(Number(stockRaw)) ? Number(stockRaw) : 0,
        isActive: !["nao", "false", "0"].includes(normalizeText(activeRaw)),
        attributes,
      } satisfies ParsedVariantInput;
    });
}

export function serializeVariantDefinitions(variants: ParsedVariantInput[]) {
  return variants
    .map((variant) => {
      const attributes = Object.entries(variant.attributes)
        .map(([key, value]) => `${key}=${value}`)
        .join("; ");

      return [
        attributes,
        variant.sku || "",
        variant.priceOverride ? String(variant.priceOverride).replace(".", ",") : "",
        String(variant.stockQuantity),
        variant.isActive ? "sim" : "nao",
        variant.barcode || "",
        variant.costPriceOverride ? String(variant.costPriceOverride).replace(".", ",") : "",
        variant.imageUrl || "",
        variant.promotionalPriceOverride
          ? String(variant.promotionalPriceOverride).replace(".", ",")
          : "",
        variant.discountPercent !== undefined
          ? String(variant.discountPercent).replace(".", ",")
          : "",
      ].join(" | ");
    })
    .join("\n");
}

export function parseVariantAttributesJson(attributesJson: string | null | undefined) {
  if (!attributesJson) {
    return {};
  }

  try {
    const parsed = JSON.parse(attributesJson) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
