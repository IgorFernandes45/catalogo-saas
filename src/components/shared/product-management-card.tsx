"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, ChevronUp, PencilLine } from "lucide-react";

import { MutationActionButton } from "@/components/shared/mutation-action-button";
import { ProductStockAdjuster } from "@/components/shared/product-stock-adjuster";
import { formatCurrency, splitOptionValues } from "@/lib/utils";

type ProductManagementCardProps = {
  product: {
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    shortDescription: string;
    price: number;
    promotionalPrice: number | null;
    sku: string;
    barcode: string;
    costPrice: number | null;
    profitMarginPercent: number | null;
    color: string;
    size: string;
    fabric: string;
    stockQuantity: number;
    isActive: boolean;
    isFeatured: boolean;
    trackStock: boolean;
    variants: Array<{
      id: string;
      label: string;
      sku: string;
      barcode: string;
      imageUrl: string;
      priceOverride: number | null;
      promotionalPriceOverride: number | null;
      discountPercent: number | null;
      costPriceOverride: number | null;
      stockQuantity: number;
      isActive: boolean;
    }>;
  };
  deleteAction: () => Promise<{
    status: "idle" | "success" | "error";
    message: string;
    resetToken: number;
  }>;
};

export function ProductManagementCard({
  product,
  deleteAction,
}: ProductManagementCardProps) {
  const [showStockTools, setShowStockTools] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const colorOptions = splitOptionValues(product.color);
  const sizeOptions = splitOptionValues(product.size);

  return (
    <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-slate-950">{product.name}</p>
          <p className="text-sm text-slate-500">{product.categoryName}</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            /{product.slug}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-950">
            {formatCurrency(Number(product.promotionalPrice || product.price))}
          </p>
          {product.promotionalPrice ? (
            <p className="text-sm text-slate-500 line-through">
              {formatCurrency(Number(product.price))}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">
        {product.shortDescription || "Sem descrição curta"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
        {product.trackStock ? (
          <span className="rounded-full bg-slate-200 px-3 py-1">
            {product.variants.length
              ? `Estoque por variação (${product.variants.length})`
              : `Estoque: ${product.stockQuantity ?? 0}`}
          </span>
        ) : null}
        {product.sku ? (
          <span className="rounded-full bg-slate-200 px-3 py-1">SKU: {product.sku}</span>
        ) : null}
        {product.barcode ? (
          <span className="rounded-full bg-slate-200 px-3 py-1">
            Código: {product.barcode}
          </span>
        ) : null}
        {product.costPrice !== null ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
            Custo: {formatCurrency(product.costPrice)}
          </span>
        ) : null}
        {product.profitMarginPercent !== null ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
            Margem: {product.profitMarginPercent}%
          </span>
        ) : null}
        {colorOptions.length ? (
          <span className="rounded-full bg-slate-200 px-3 py-1">
            {colorOptions.length > 1 ? "Cores" : "Cor"}: {colorOptions.join(", ")}
          </span>
        ) : null}
        {sizeOptions.length ? (
          <span className="rounded-full bg-slate-200 px-3 py-1">
            {sizeOptions.length > 1 ? "Tamanhos" : "Tam"}: {sizeOptions.join(", ")}
          </span>
        ) : null}
        {product.fabric ? (
          <span className="rounded-full bg-slate-200 px-3 py-1">Tecido: {product.fabric}</span>
        ) : null}
        {product.isFeatured ? (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">Destaque</span>
        ) : null}
        {!product.isActive ? (
          <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Inativo</span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={`/painel/produtos/${product.id}/editar`}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <PencilLine className="size-4" />
          Editar produto
        </Link>

        {product.trackStock ? (
          <button
            type="button"
            onClick={() => setShowStockTools((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {showStockTools ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {showStockTools ? "Ocultar estoque" : "Editar estoque"}
          </button>
        ) : null}

        {product.variants.length ? (
          <button
            type="button"
            onClick={() => setShowVariants((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            {showVariants ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {showVariants ? "Ocultar variações" : `Ver variações (${product.variants.length})`}
          </button>
        ) : null}

        <MutationActionButton
          action={deleteAction}
          confirmMessage={`Deseja excluir o produto "${product.name}"? Se ele tiver histórico de vendas ou estoque, o sistema irá apenas desativá-lo para preservar os relatórios.`}
          idleLabel="Excluir produto"
          pendingLabel="Excluindo..."
          successTitle="Produto removido"
          errorTitle="Não foi possível excluir o produto"
        />
      </div>

      {product.trackStock ? (
        showStockTools ? (
          product.variants.length ? (
            <div className="mt-5 grid gap-3">
              {product.variants.map((variant) => (
                <ProductStockAdjuster
                  key={variant.id}
                  productId={product.id}
                  productVariantId={variant.id}
                  label={variant.label}
                  currentStock={variant.stockQuantity}
                />
              ))}
            </div>
          ) : (
            <ProductStockAdjuster
              productId={product.id}
              currentStock={product.stockQuantity ?? 0}
            />
          )
        ) : (
          <div className="mt-4 rounded-[24px] bg-white px-4 py-3 text-sm text-slate-500">
            Abra a área de estoque para ajustar o número atual ou consultar o histórico.
          </div>
        )
      ) : (
        <div className="mt-5 rounded-[24px] bg-white px-4 py-3 text-sm text-slate-500">
          Controle de estoque desativado para este produto.
        </div>
      )}

      {product.variants.length && showVariants ? (
        <div className="mt-4 grid gap-2 text-sm text-slate-600">
          {product.variants.map((variant) => (
            <div key={variant.id} className="rounded-2xl bg-white px-4 py-3">
              <span className="font-semibold text-slate-900">{variant.label}</span>
              <span className="ml-2 text-slate-500">
                Estoque {variant.stockQuantity}
                {variant.sku ? ` - SKU ${variant.sku}` : ""}
                {variant.barcode ? ` - Cod. ${variant.barcode}` : ""}
                {variant.imageUrl ? " - com foto própria" : ""}
                {variant.priceOverride ? ` - ${formatCurrency(variant.priceOverride)}` : ""}
                {variant.promotionalPriceOverride
                  ? ` - Promo ${formatCurrency(variant.promotionalPriceOverride)}`
                  : ""}
                {variant.discountPercent ? ` - ${variant.discountPercent}% off` : ""}
                {variant.costPriceOverride
                  ? ` - Custo ${formatCurrency(variant.costPriceOverride)}`
                  : ""}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}
