"use client";

import { LoaderCircle, ScanBarcode, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { useNotify } from "@/components/shared/notify-provider";
import {
  parseVariantDefinitions,
  serializeVariantDefinitions,
  type ParsedVariantInput,
} from "@/lib/variant-definitions";
import { formatCurrency, parseCurrency } from "@/lib/utils";

type VariantBuilderFieldProps = {
  name: string;
  initialDefinition?: string;
  suggestedTypes?: string[];
  allowImages?: boolean;
};

type VariantDraft = {
  attributes: Record<string, string>;
  sku: string;
  barcode: string;
  imageUrl: string;
  priceOverride: string;
  promotionalPriceOverride: string;
  discountPercent: string;
  costPriceOverride: string;
  stockQuantity: string;
  isActive: boolean;
};

const fallbackVariationTypes = ["Cor", "Tamanho", "Numeração", "Tom", "Volume", "Sabor", "Modelo"];

function decimalInput(value: number | undefined) {
  return value === undefined ? "" : String(value).replace(".", ",");
}

function toNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = parseCurrency(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPercent(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildLabel(attributes: Record<string, string>) {
  return Object.entries(attributes)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
}

function toDraft(variant?: ParsedVariantInput) {
  return {
    attributes: variant?.attributes || {},
    sku: variant?.sku || "",
    barcode: variant?.barcode || "",
    imageUrl: variant?.imageUrl || "",
    priceOverride: decimalInput(variant?.priceOverride),
    promotionalPriceOverride: decimalInput(variant?.promotionalPriceOverride),
    discountPercent: decimalInput(variant?.discountPercent),
    costPriceOverride: decimalInput(variant?.costPriceOverride),
    stockQuantity: String(variant?.stockQuantity ?? 0),
    isActive: variant?.isActive ?? true,
  } satisfies VariantDraft;
}

function serializeDraft(row: VariantDraft) {
  const attributes = Object.fromEntries(
    Object.entries(row.attributes).filter(([, value]) => value.trim()),
  );

  if (!Object.keys(attributes).length) {
    return "";
  }

  return serializeVariantDefinitions([
    {
      label: buildLabel(attributes),
      sku: row.sku.trim() || undefined,
      barcode: row.barcode.trim() || undefined,
      imageUrl: row.imageUrl.trim() || undefined,
      priceOverride: toNumber(row.priceOverride),
      promotionalPriceOverride: toNumber(row.promotionalPriceOverride),
      discountPercent: toPercent(row.discountPercent),
      costPriceOverride: toNumber(row.costPriceOverride),
      stockQuantity: Number(row.stockQuantity || 0),
      isActive: row.isActive,
      attributes,
    },
  ]);
}

function calculateRow(row: VariantDraft) {
  const price = toNumber(row.priceOverride) || 0;
  const cost = toNumber(row.costPriceOverride) || 0;
  const promo = toNumber(row.promotionalPriceOverride);
  const discount = toPercent(row.discountPercent) || 0;
  const finalPrice = promo !== undefined ? promo : price * (1 - discount / 100);
  const profit = finalPrice - cost;
  const margin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;

  return { finalPrice, profit, margin };
}

export function VariantBuilderField({
  name,
  initialDefinition = "",
  suggestedTypes = [],
  allowImages = true,
}: VariantBuilderFieldProps) {
  const notify = useNotify();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const parsedInitialVariant = useMemo(
    () => parseVariantDefinitions(initialDefinition)[0],
    [initialDefinition],
  );
  const availableTypes = useMemo(
    () => [...new Set([...suggestedTypes, ...fallbackVariationTypes])],
    [suggestedTypes],
  );
  const initialTypes = Object.keys(parsedInitialVariant?.attributes || {});
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    initialTypes.length ? initialTypes : availableTypes.slice(0, 2),
  );
  const [customType, setCustomType] = useState("");
  const [row, setRow] = useState<VariantDraft>(() => toDraft(parsedInitialVariant));
  const [uploading, setUploading] = useState(false);
  const serializedValue = useMemo(() => serializeDraft(row), [row]);
  const calculated = calculateRow(row);

  function updateRow(nextPartial: Partial<VariantDraft>) {
    setRow((current) => ({ ...current, ...nextPartial }));
  }

  function toggleType(type: string) {
    setSelectedTypes((current) => {
      if (current.includes(type)) {
        const nextAttributes = { ...row.attributes };
        delete nextAttributes[type];
        updateRow({ attributes: nextAttributes });
        return current.filter((item) => item !== type);
      }

      return [...current, type];
    });
  }

  async function uploadVariantImage(file: File | null) {
    if (!file) {
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("purpose", "product");

      const response = await fetch("/api/store/uploads", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Não foi possível enviar a imagem.");
      }

      updateRow({ imageUrl: payload.url });
      notify({
        tone: "success",
        title: "Imagem enviada",
        message: "Foto da variação salva no Cloudinary.",
      });
    } catch (error) {
      notify({
        tone: "error",
        title: "Falha no upload",
        message:
          error instanceof Error ? error.message : "Não foi possível enviar a imagem.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-5 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <input type="hidden" name={name} value={serializedValue} />

      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-orange-500">
          Variação vendável
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">
          Cadastre uma variação por vez
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Cada variação tem seu próprio código de barras, preço, estoque e foto.
          Para vermelho 32 e vermelho 33, cadastre uma e depois repita para a outra.
        </p>
      </div>

      <section className="grid gap-4 rounded-[24px] bg-white p-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Quais campos identificam esta variação?
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Marque apenas o que esse produto usa. Ex.: Cor + Tamanho, Tom, Volume ou Sabor.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedTypes.includes(type)
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={customType}
            onChange={(event) => setCustomType(event.target.value)}
            className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Outro: Cobertura, Fragrância, Material"
          />
          <button
            type="button"
            onClick={() => {
              const next = customType.trim();
              if (!next) {
                return;
              }
              setSelectedTypes((current) =>
                current.includes(next) ? current : [...current, next],
              );
              setCustomType("");
            }}
            className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
          >
            Adicionar campo
          </button>
        </div>

        {selectedTypes.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedTypes.map((type) => (
              <label key={type} className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
                {type}
                <input
                  value={row.attributes[type] || ""}
                  onChange={(event) =>
                    updateRow({
                      attributes: {
                        ...row.attributes,
                        [type]: event.target.value,
                      },
                    })
                  }
                  className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder={
                    type === "Cor"
                      ? "Vermelho"
                      : type === "Tamanho" || type === "Numeração"
                        ? "32"
                        : "Ex.: 500ml, Morango, Bivolt"
                  }
                />
              </label>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-[24px] bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            Código de barras
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                ref={barcodeRef}
                value={row.barcode}
                onChange={(event) => updateRow({ barcode: event.target.value })}
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
                placeholder="Clique e leia com o leitor"
                autoComplete="off"
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => barcodeRef.current?.focus()}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-semibold text-white"
              >
                <ScanBarcode className="size-4" />
                Ler
              </button>
            </div>
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            SKU interno
            <input
              value={row.sku}
              onChange={(event) => updateRow({ sku: event.target.value })}
              className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Opcional"
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            Estoque
            <input
              type="number"
              min={0}
              value={row.stockQuantity}
              onChange={(event) => updateRow({ stockQuantity: event.target.value })}
              className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
            />
          </label>
          <label className="inline-flex items-center gap-3 self-end rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={row.isActive}
              onChange={(event) => updateRow({ isActive: event.target.checked })}
              className="size-4 rounded border-slate-300"
            />
            Ativo no catálogo
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            Preço de custo
            <input
              value={row.costPriceOverride}
              onChange={(event) => updateRow({ costPriceOverride: event.target.value })}
              className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Ex.: 70,00"
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            Preço de venda da variação
            <input
              required
              value={row.priceOverride}
              onChange={(event) => updateRow({ priceOverride: event.target.value })}
              className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Ex.: 129,90"
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            Preço promocional
            <input
              value={row.promotionalPriceOverride}
              onChange={(event) => updateRow({ promotionalPriceOverride: event.target.value })}
              className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Opcional"
            />
          </label>
          <label className="grid min-w-0 gap-2 text-sm font-medium text-slate-700">
            Desconto %
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={row.discountPercent}
              onChange={(event) => updateRow({ discountPercent: event.target.value })}
              className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Ex.: 10"
            />
          </label>
        </div>

        <div className="grid gap-3 rounded-[22px] bg-slate-50 p-4 text-sm sm:grid-cols-3">
          <p>
            <span className="block text-xs uppercase tracking-[0.14em] text-slate-500">
              Preço final
            </span>
            <strong>{formatCurrency(calculated.finalPrice)}</strong>
          </p>
          <p>
            <span className="block text-xs uppercase tracking-[0.14em] text-slate-500">
              Lucro estimado
            </span>
            <strong>{formatCurrency(calculated.profit)}</strong>
          </p>
          <p>
            <span className="block text-xs uppercase tracking-[0.14em] text-slate-500">
              Margem
            </span>
            <strong>{calculated.margin.toFixed(1)}%</strong>
          </p>
        </div>
      </section>

      {allowImages ? (
      <section className="grid gap-3 rounded-[24px] bg-white p-4">
        <input type="hidden" value={row.imageUrl} readOnly />
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Foto específica da variação
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Envie uma foto para esta opção. O catálogo usa a imagem automaticamente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            {uploading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            {uploading ? "Enviando..." : "Enviar foto"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] || null;
                void uploadVariantImage(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
          {row.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.imageUrl}
              alt={buildLabel(row.attributes) || "Foto da variação"}
              className="h-24 w-24 rounded-[20px] object-cover"
            />
          ) : null}
        </div>
      </section>
      ) : (
        <input type="hidden" value={row.imageUrl} readOnly />
      )}
    </div>
  );
}
