import { notFound } from "next/navigation";

import { StorefrontClient } from "@/components/catalog/storefront-client";
import {
  buildProductImageGallery,
  parseGalleryImages,
  resolveCatalogImage,
} from "@/lib/catalog-images";
import { getStoreCatalog } from "@/lib/queries";
import { buildProductAttributeList, parseEnabledAttributes } from "@/lib/store-profiles";
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

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; category?: string; page?: string; size?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const page = Number.isInteger(Number(query.page)) && Number(query.page) > 0
    ? Number(query.page)
    : 1;
  const store = await getStoreCatalog(slug, {
    search: query.search,
    category: query.category,
    page,
    pageSize: 24,
  });

  if (!store) {
    notFound();
  }

  return (
    <main className="min-h-dvh w-full max-w-[100dvw] overflow-x-clip px-2 py-2 sm:px-4 sm:py-7">
      <div className="mx-auto w-full min-w-0 max-w-7xl">
        <StorefrontClient
          store={{
            slug: store.slug,
            name: store.name,
            description: store.description || "Catalogo premium com atendimento personalizado.",
            whatsappNumber: store.whatsappNumber,
            logoUrl: resolveCatalogImage(
              store.logoUrl ||
                "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=240&q=80",
              { width: 240, height: 240, crop: "fill" },
            ),
            bannerUrl: resolveCatalogImage(
              store.bannerUrl ||
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
              { width: 1400, height: 720, crop: "fill" },
            ),
            primaryColor: store.primaryColor,
            secondaryColor: store.secondaryColor,
            accentColor: store.accentColor,
            themeMode: store.themeMode,
            accessMode: store.accessMode,
            catalogUsesImages: store.catalogUsesImages,
          }}
          pagination={{
            currentPage: store.currentPage,
            totalPages: store.totalPages,
            totalProducts: store.totalProducts,
            pageSize: store.pageSize,
            search: store.activeSearch,
            category: store.activeCategorySlug,
            size: query.size || "",
          }}
          promoCount={store.promoCount}
          categories={store.categories.map((category) => ({
            id: category.id,
            name: category.name,
            slug: category.slug,
            description: category.description,
          }))}
          products={store.products.map((product) => {
            const gallery = store.catalogUsesImages
              ? buildProductImageGallery(
                product.imageUrl,
                parseGalleryImages(product.galleryJson),
                {
                  width: 960,
                  height: 1200,
                  crop: "fill",
                },
              ).slice(0, 6)
              : [];

            return {
              id: product.id,
              name: product.name,
              slug: product.slug,
              shortDescription: product.shortDescription || "Produto premium da loja.",
              imageUrl: store.catalogUsesImages
                ? gallery[0]
                  || resolveCatalogImage(product.imageUrl, {
                    width: 960,
                    height: 1200,
                    crop: "fill",
                  })
                : "",
              gallery,
              price: Number(product.price),
              promotionalPrice: product.promotionalPrice
                ? Number(product.promotionalPrice)
                : null,
              trackStock: product.trackStock,
              stockQuantity: product.stockQuantity,
              categoryId: product.categoryId,
              categoryName: product.category.name,
              color: product.color,
              size: product.size,
              fabric: product.fabric,
              variants: product.variants.map((variant) => {
                const pricing = getVariantPricing(Number(product.price), variant);

                return {
                  id: variant.id,
                  label: variant.label,
                  imageUrl: store.catalogUsesImages && variant.imageUrl
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
                ...buildProductAttributeList({
                  rawValues: product.attributesJson,
                  enabledAttributes: parseEnabledAttributes(
                    store.productAttributesJson,
                    store.catalogProfile,
                  ),
                  brandSupplier: product.brandSupplier,
                }),
                ...product.customValues.map((item) => ({
                  name: item.attribute.name,
                  value: item.valueText,
                })),
              ],
            };
          })}
        />
      </div>
    </main>
  );
}
