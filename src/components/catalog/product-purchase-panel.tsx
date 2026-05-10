"use client";

import { MessageCircle, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";

import { addItemToCart, buildCartKey } from "@/lib/cart";
import {
  areRequiredSelectionsComplete,
  buildSelectedProductAttributes,
  findMatchingVariant,
  getAvailableProductOptions,
  getDefaultProductSelections,
  getProductOptionGroups,
  selectProductOption,
} from "@/lib/product-options";
import { cn, formatCurrency } from "@/lib/utils";
import { buildQuickBuyMessage, createWhatsAppLink } from "@/lib/whatsapp";

type ProductPurchasePanelProps = {
  store: {
    name: string;
    slug: string;
    whatsappNumber: string;
    accessMode?: string | null;
  };
  product: {
    id: string;
    name: string;
    slug: string;
    unitPrice: number;
    imageUrl: string;
    color?: string | null;
    size?: string | null;
    fabric?: string | null;
    trackStock?: boolean;
    stockQuantity?: number | null;
    variants?: Array<{
      id: string;
      label: string;
      imageUrl?: string | null;
      unitPrice: number;
      regularPrice?: number;
      promotionalPrice?: number | null;
      discountPercent?: number | null;
      sku?: string | null;
      barcode?: string | null;
      stockQuantity: number;
      isActive: boolean;
      attributes: Record<string, string>;
    }>;
    customAttributes: Array<{ name: string; value: string }>;
  };
  className?: string;
  showImages?: boolean;
};

function buildSelectionKey(productId: string, variantId: string | null, attributes: string[]) {
  return variantId
    ? `${productId}::variant:${variantId}`
    : `${productId}::${attributes.join("|")}`;
}

export function ProductPurchasePanel({
  store,
  product,
  className,
  showImages = true,
}: ProductPurchasePanelProps) {
  const optionGroups = useMemo(() => getProductOptionGroups(product), [product]);
  const [selectedChoices, setSelectedChoices] = useState(() =>
    getDefaultProductSelections(optionGroups),
  );
  const [added, setAdded] = useState(false);
  const salesEnabled = true;

  const matchingVariant = findMatchingVariant(product, selectedChoices);
  const previewVariant =
    matchingVariant
    ?? product.variants?.find((variant) =>
      variant.isActive
      && Object.entries(selectedChoices).every(
        ([key, value]) => !value || variant.attributes[key] === value,
      ),
    )
    ?? null;
  const selectedAttributes = buildSelectedProductAttributes(product, selectedChoices);
  const hasVariantOptions = Boolean(product.variants?.length);
  const selectionsComplete = areRequiredSelectionsComplete(optionGroups, selectedChoices);
  const missingVariant = selectionsComplete && hasVariantOptions && !matchingVariant;
  const isReady =
    selectionsComplete
    && (!hasVariantOptions || Boolean(matchingVariant));
  const activeUnitPrice = matchingVariant?.unitPrice ?? previewVariant?.unitPrice ?? product.unitPrice;
  const activeRegularPrice = matchingVariant?.regularPrice ?? activeUnitPrice;
  const activePromotionalPrice = matchingVariant?.promotionalPrice ?? null;
  const activeImageUrl = matchingVariant?.imageUrl || previewVariant?.imageUrl || product.imageUrl;
  const activeStock = missingVariant
    ? 0
    : matchingVariant?.stockQuantity
      ?? (product.trackStock ? product.stockQuantity ?? 0 : null);
  const stockLabel =
    activeStock === null ? "" : activeStock > 0 ? "Com estoque" : "Sem estoque";
  const hasStock = activeStock === null || activeStock > 0;

  return (
    <div className={cn("grid gap-5", className)}>
      {optionGroups.length ? (
        <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          {showImages && activeImageUrl ? (
            <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3 rounded-[22px] bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImageUrl}
                alt={matchingVariant?.label || previewVariant?.label || product.name}
                className="h-24 w-20 rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Foto e preco da selecao
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                  {matchingVariant?.label || previewVariant?.label || product.name}
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-950">
                  {formatCurrency(activeUnitPrice)}
                </p>
              </div>
            </div>
          ) : null}

          {optionGroups.map((group) => (
            <div key={group.key}>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Escolha {group.label.toLowerCase()}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const isActive = selectedChoices[group.key] === option;
                  const availableOptions = getAvailableProductOptions(
                    product,
                    selectedChoices,
                    group.key,
                  );
                  const isDisabled = !isActive && !availableOptions.includes(option);

                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isDisabled}
                      onClick={() =>
                        setSelectedChoices((current) =>
                          selectProductOption(product, current, group.key, option),
                        )
                      }
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold transition",
                        isActive
                          ? "border-slate-950 bg-slate-950 text-white"
                          : isDisabled
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through"
                            : "border-slate-200 bg-white text-slate-700",
                      )}
                      title={isDisabled ? "Sem estoque para a selecao atual" : undefined}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {activeStock !== null && (selectionsComplete || !optionGroups.length) ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                hasStock
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-700",
              )}
            >
              <p className="font-semibold">
                {matchingVariant?.label || "Combinacao selecionada"}
              </p>
              <p className="mt-1 font-semibold">{stockLabel}</p>
            </div>
          ) : null}

          {!selectionsComplete ? (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
              Escolha as opcoes para liberar a compra
            </p>
          ) : null}

        </div>
      ) : null}

      <div className="text-sm text-slate-600">
        <p className="text-2xl font-semibold text-slate-950">
          {formatCurrency(activeUnitPrice)}
        </p>
        {activePromotionalPrice ? (
          <p className="mt-1 text-sm text-slate-500 line-through">
            {formatCurrency(activeRegularPrice)}
          </p>
        ) : null}
        {stockLabel ? (
          <span
            className={cn(
              "mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
              hasStock
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700",
            )}
          >
            {stockLabel}
          </span>
        ) : null}
      </div>

      <div className="hidden flex-wrap gap-3 md:flex">
        {salesEnabled ? (
        <>
          <button
          type="button"
          onClick={() => {
            const message = buildQuickBuyMessage({
              storeName: store.name,
              productName: product.name,
              unitPrice: activeUnitPrice,
              attributes: selectedAttributes,
              productUrl: `${window.location.origin}/loja/${store.slug}/produto/${product.slug}`,
            });

            window.location.assign(createWhatsAppLink(store.whatsappNumber, message));
          }}
          disabled={!isReady || !hasStock}
          className="inline-flex min-w-[190px] items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <MessageCircle className="size-4" />
          Comprar
        </button>
        <button
          type="button"
          onClick={() => {
            addItemToCart(buildCartKey(store.slug), {
              selectionKey: buildSelectionKey(product.id, matchingVariant?.id || null, selectedAttributes),
              productId: product.id,
              productVariantId: matchingVariant?.id,
              productName: product.name,
              slug: product.slug,
              unitPrice: activeUnitPrice,
              imageUrl: activeImageUrl,
              attributes: selectedAttributes,
            });
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1800);
          }}
          disabled={!isReady || !hasStock}
          className="inline-flex min-w-[220px] items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <ShoppingCart className="size-4" />
          {added ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
        </button>
        </>
        ) : (
          <div className="rounded-[24px] bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
            Consulte a loja pelo WhatsApp para confirmar disponibilidade e atendimento.
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:hidden">
        {salesEnabled ? (
        <>
          <button
          type="button"
          onClick={() => {
            const message = buildQuickBuyMessage({
              storeName: store.name,
              productName: product.name,
              unitPrice: activeUnitPrice,
              attributes: selectedAttributes,
              productUrl: `${window.location.origin}/loja/${store.slug}/produto/${product.slug}`,
            });

            window.location.assign(createWhatsAppLink(store.whatsappNumber, message));
          }}
          disabled={!isReady || !hasStock}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <MessageCircle className="size-4" />
          Comprar
        </button>
        <button
          type="button"
          onClick={() => {
            addItemToCart(buildCartKey(store.slug), {
              selectionKey: buildSelectionKey(product.id, matchingVariant?.id || null, selectedAttributes),
              productId: product.id,
              productVariantId: matchingVariant?.id,
              productName: product.name,
              slug: product.slug,
              unitPrice: activeUnitPrice,
              imageUrl: activeImageUrl,
              attributes: selectedAttributes,
            });
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1800);
          }}
          disabled={!isReady || !hasStock}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
        >
          <ShoppingCart className="size-4" />
          {added ? "Adicionado" : "Carrinho"}
        </button>
        </>
        ) : (
          <div className="col-span-2 rounded-[24px] bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
            Consulte a loja pelo WhatsApp.
          </div>
        )}
      </div>
    </div>
  );
}
