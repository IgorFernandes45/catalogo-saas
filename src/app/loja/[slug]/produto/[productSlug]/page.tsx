import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductImageGallery } from "@/components/catalog/product-image-gallery";
import { ProductPurchasePanel } from "@/components/catalog/product-purchase-panel";
import {
  buildProductImageGallery,
  parseGalleryImages,
  resolveCatalogImage,
} from "@/lib/catalog-images";
import { getStoreProductDetail } from "@/lib/queries";
import { buildProductAttributeList, parseEnabledAttributes } from "@/lib/store-profiles";
import { formatCurrency, getDiscountPercentage, splitOptionValues } from "@/lib/utils";
import { parseVariantAttributesJson } from "@/lib/variant-definitions";

function getVariantPricing(productPrice: number, variant: {
  priceOverride: unknown;
  promotionalPriceOverride: unknown;
  discountPercent: unknown;
}) {
  const regularPrice = Number(variant.priceOverride ?? productPrice);
  const discountPercent = variant.discountPercent ? Number(variant.discountPercent) : null;
  const promotionalPrice = variant.promotionalPriceOverride
    ? Number(variant.promotionalPriceOverride)
    : discountPercent
      ? Number((regularPrice * (1 - discountPercent / 100)).toFixed(2))
      : null;

  return {
    regularPrice,
    promotionalPrice,
    discountPercent,
    unitPrice: promotionalPrice ?? regularPrice,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const store = await getStoreProductDetail(slug, productSlug);

  if (!store) {
    notFound();
  }

  const product = store.products[0];
  const salesEnabled = true;

  if (!product) {
    notFound();
  }

  const colorOptions = splitOptionValues(product.color);
  const sizeOptions = splitOptionValues(product.size);
  const profileAttributes = buildProductAttributeList({
    rawValues: product.attributesJson,
    enabledAttributes: parseEnabledAttributes(store.productAttributesJson, store.catalogProfile),
    brandSupplier: product.brandSupplier,
  });
  const attributes = [
    colorOptions.length
      ? `${colorOptions.length > 1 ? "Cores" : "Cor"} ${colorOptions.join(", ")}`
      : null,
    sizeOptions.length
      ? `${sizeOptions.length > 1 ? "Tamanhos" : "Tam"} ${sizeOptions.join(", ")}`
      : null,
    product.fabric ? `Tecido ${product.fabric}` : null,
    ...profileAttributes.map((item) => `${item.name} ${item.value}`),
    ...product.customValues.map((item) => `${item.attribute.name} ${item.valueText}`),
  ].filter(Boolean) as string[];
  const discountPercentage = getDiscountPercentage(
    Number(product.price),
    product.promotionalPrice ? Number(product.promotionalPrice) : null,
  );
  const gallery = buildProductImageGallery(
    product.imageUrl,
    parseGalleryImages(product.galleryJson),
    {
      width: 1400,
      height: 1700,
      crop: "fill",
    },
  ).slice(0, 8);
  const productHasAnyStock = product.variants.length
    ? product.variants.some((variant) => variant.isActive && variant.stockQuantity > 0)
    : !product.trackStock || (product.stockQuantity ?? 0) > 0;
  const showImages = store.catalogUsesImages;

  return (
    <main className="min-h-screen px-3 py-3 pb-28 sm:px-4 sm:py-7 md:pb-8">
      <div className="mx-auto mb-3 flex max-w-6xl items-center justify-between gap-3 rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-[0_14px_40px_rgba(15,23,42,0.06)] backdrop-blur md:hidden">
        <Link href={`/loja/${slug}`} className="text-sm font-semibold text-slate-700">
          Voltar
        </Link>
        {salesEnabled ? (
          <Link href={`/loja/${slug}/carrinho`} className="text-sm font-semibold text-orange-600">
            Abrir carrinho
          </Link>
        ) : null}
      </div>
      <div className={`mx-auto grid max-w-6xl gap-6 lg:gap-8 ${showImages ? "lg:grid-cols-[0.92fr_1.08fr]" : "lg:grid-cols-1"}`}>
        {showImages ? (
        <section className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(15,23,42,0.1)] sm:rounded-[36px] sm:shadow-[0_30px_90px_rgba(15,23,42,0.1)]">
          <div className="p-3 sm:p-4">
            <ProductImageGallery
              key={product.id}
              images={
                gallery.length
                  ? gallery
                  : [
                      resolveCatalogImage(product.imageUrl, {
                        width: 1400,
                        height: 1700,
                        crop: "fill",
                      }),
                    ]
              }
              productName={product.name}
              frameClassName="min-h-[320px] sm:min-h-[520px]"
              imageSizes="(max-width: 1024px) 100vw, 45vw"
              thumbnailSizes="(max-width: 768px) 20vw, 96px"
              thumbnailClassName="h-24 w-20 sm:h-28 sm:w-24"
              thumbnailsClassName="px-1 pb-1"
              disableThumbnailSelection={!productHasAnyStock}
              preloadFirst
            />
          </div>
        </section>
        ) : null}
        <section className="surface-card border border-white/70 p-6 sm:p-8">
          <Link href={`/loja/${slug}`} className="hidden text-sm font-semibold text-orange-600 md:inline-flex">
            Voltar ao catalogo
          </Link>
          <p className="mt-6 text-sm uppercase tracking-[0.25em] text-slate-500">
            {product.category.name}
          </p>
          <h1 className="display-font mt-3 text-4xl font-semibold text-slate-950 sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            {product.fullDescription || product.shortDescription || "Produto premium da loja."}
          </p>

          {colorOptions.length ? (
            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Cores disponiveis
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <span
                    key={color}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {color}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {sizeOptions.length ? (
            <div className="mt-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Tamanhos
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {sizeOptions.map((size) => (
                  <span
                    key={size}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              Compra rapida
            </span>
            {product.promotionalPrice ? (
              <span className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                Economize {discountPercentage}%
              </span>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold text-slate-700">
            {attributes.map((attribute) => (
              <span key={attribute} className="rounded-full bg-slate-100 px-4 py-2">
                {attribute}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-4xl font-semibold text-slate-950">
                {formatCurrency(Number(product.promotionalPrice || product.price))}
              </p>
              {product.promotionalPrice ? (
                <div className="mt-2 space-y-1">
                  <p className="text-lg text-slate-500 line-through">
                    {formatCurrency(Number(product.price))}
                  </p>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    Economize{" "}
                    {formatCurrency(Number(product.price) - Number(product.promotionalPrice))}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-8">
            <ProductPurchasePanel
              store={{
                name: store.name,
                slug,
                whatsappNumber: store.whatsappNumber,
                accessMode: store.accessMode,
              }}
              showImages={showImages}
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                unitPrice: Number(product.promotionalPrice || product.price),
                imageUrl: showImages
                  ? gallery[0]
                    || resolveCatalogImage(product.imageUrl, {
                      width: 960,
                      height: 1200,
                      crop: "fill",
                    })
                  : "",
                color: product.color,
                size: product.size,
                fabric: product.fabric,
                trackStock: product.trackStock,
                stockQuantity: product.stockQuantity,
                variants: product.variants.map((variant) => {
                  const pricing = getVariantPricing(Number(product.price), variant);

                  return {
                    id: variant.id,
                    label: variant.label,
                    imageUrl: showImages && variant.imageUrl
                      ? resolveCatalogImage(variant.imageUrl, {
                        width: 960,
                        height: 1200,
                        crop: "fill",
                      })
                      : null,
                    ...pricing,
                    sku: variant.sku,
                    barcode: variant.barcode,
                    stockQuantity: variant.stockQuantity,
                    isActive: variant.isActive,
                    attributes: parseVariantAttributesJson(variant.attributesJson),
                  };
                }),
                customAttributes: [
                  ...profileAttributes,
                  ...product.customValues.map((item) => ({
                    name: item.attribute.name,
                    value: item.valueText,
                  })),
                ],
              }}
            />
          </div>

          {product.notes ? (
            <div className="mt-8 rounded-[28px] bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              <p className="font-semibold text-slate-900">Observacoes</p>
              <p className="mt-2">{product.notes}</p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {salesEnabled ? (
              <Link
                href={`/loja/${slug}/carrinho`}
                className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Abrir carrinho
              </Link>
            ) : null}
            <Link
              href={`/loja/${slug}`}
              className="inline-flex rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Voltar ao catalogo
            </Link>
          </div>
        </section>
      </div>

    </main>
  );
}
