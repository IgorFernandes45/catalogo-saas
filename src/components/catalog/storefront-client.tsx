"use client";

import type { CSSProperties } from "react";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  CheckCircle2,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  X,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";

import { ProductImageGallery } from "@/components/catalog/product-image-gallery";
import { buildCartKey, cartChangeEvent, type CartItem, readCart } from "@/lib/cart";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { resolveCatalogImage } from "@/lib/catalog-images";
import {
  areRequiredSelectionsComplete,
  buildSelectedProductAttributes,
  findMatchingVariant,
  getAvailableProductOptions,
  getProductOptionGroups,
  selectProductOption,
} from "@/lib/product-options";
import {
  cn,
  formatCurrency,
  formatPhoneInput,
  getDiscountPercentage,
  splitOptionValues,
} from "@/lib/utils";
import { buildQuickBuyMessage, createWhatsAppLink } from "@/lib/whatsapp";

type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  imageUrl: string;
  gallery: string[];
  price: number;
  promotionalPrice: number | null;
  trackStock: boolean;
  stockQuantity: number | null;
  categoryId: string;
  categoryName: string;
  color: string | null;
  size: string | null;
  fabric: string | null;
  variants: Array<{
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

type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

type CatalogStore = {
  slug: string;
  name: string;
  description: string;
  whatsappNumber: string;
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  themeMode: string;
  accessMode?: string | null;
  catalogUsesImages: boolean;
};

type StorefrontClientProps = {
  store: CatalogStore;
  categories: CatalogCategory[];
  products: CatalogProduct[];
  cartOnly?: boolean;
  promoCount?: number;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalProducts: number;
    pageSize: number;
    search: string;
    category: string;
    size?: string;
  };
};

type CustomerDraft = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryNumber: string;
  deliveryDistrict: string;
  deliveryCity: string;
  deliveryComplement: string;
  deliveryReference: string;
  notes: string;
};

const emptyCustomerDraft: CustomerDraft = {
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
  deliveryNumber: "",
  deliveryDistrict: "",
  deliveryCity: "",
  deliveryComplement: "",
  deliveryReference: "",
  notes: "",
};

function getCustomerDraftKey(storeSlug: string) {
  return `catalogo-customer:${storeSlug}`;
}

function readCustomerDraft(storeSlug: string): CustomerDraft {
  if (typeof window === "undefined") {
    return emptyCustomerDraft;
  }

  const stored = window.localStorage.getItem(getCustomerDraftKey(storeSlug));

  if (!stored) {
    return emptyCustomerDraft;
  }

  try {
    return {
      ...emptyCustomerDraft,
      ...(JSON.parse(stored) as Partial<CustomerDraft>),
    };
  } catch {
    return emptyCustomerDraft;
  }
}

function getProductAttributes(product: CatalogProduct) {
  return buildSelectedProductAttributes(product);
}

function buildSelectionKey(productId: string, variantId: string | null, attributes: string[]) {
  return variantId
    ? `${productId}::variant:${variantId}`
    : `${productId}::${attributes.join("|")}`;
}

function findPreviewVariant(product: CatalogProduct, selections: Record<string, string>) {
  if (!product.variants.length) {
    return null;
  }

  const selectedEntries = Object.entries(selections).filter(([, value]) => value.trim());

  if (!selectedEntries.length) {
    return null;
  }

  return (
    product.variants.find((variant) =>
      selectedEntries.every(([key, value]) => variant.attributes[key] === value),
    ) || null
  );
}

function getThemeStyle(store: CatalogStore): CSSProperties {
  return {
    "--store-primary": store.primaryColor,
    "--store-secondary": store.secondaryColor,
    "--store-accent": store.accentColor,
  } as CSSProperties;
}

function normalizeCatalogText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isSizeAttributeKey(key: string) {
  const normalized = normalizeCatalogText(key);
  return normalized === "tamanho" || normalized === "numeracao" || normalized === "numero";
}

function getProductSizeOptions(product: CatalogProduct) {
  const options = new Set<string>();

  splitOptionValues(product.size).forEach((size) => options.add(size));

  for (const variant of product.variants) {
    for (const [key, value] of Object.entries(variant.attributes)) {
      if (isSizeAttributeKey(key) && value.trim()) {
        options.add(value.trim());
      }
    }
  }

  return [...options];
}

function productMatchesSize(product: CatalogProduct, size: string) {
  if (!size) {
    return true;
  }

  return getProductSizeOptions(product).some(
    (option) => normalizeCatalogText(option) === normalizeCatalogText(size),
  );
}

function productMatchesSearch(product: CatalogProduct, search: string) {
  const normalizedSearch = normalizeCatalogText(search);

  if (!normalizedSearch) {
    return true;
  }

  const searchableValues = [
    product.name,
    product.shortDescription,
    product.categoryName,
    product.color || "",
    product.size || "",
    product.fabric || "",
    ...getProductAttributes(product),
    ...product.customAttributes.flatMap((attribute) => [attribute.name, attribute.value]),
    ...product.variants.flatMap((variant) => [
      variant.label,
      variant.sku || "",
      variant.barcode || "",
      ...Object.values(variant.attributes),
    ]),
  ];

  return searchableValues.some((value) =>
    normalizeCatalogText(value).includes(normalizedSearch),
  );
}

function getSelectedStock(product: CatalogProduct, selections: Record<string, string> = {}) {
  const matchingVariant = findMatchingVariant(product, selections);

  return matchingVariant?.stockQuantity
    ?? (product.trackStock ? product.stockQuantity ?? 0 : null);
}

export function StorefrontClient({
  store,
  categories,
  products,
  cartOnly = false,
  promoCount = 0,
  pagination,
}: StorefrontClientProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(cartOnly);
  const [lastAddedName, setLastAddedName] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(emptyCustomerDraft);
  const [activeSearch, setActiveSearch] = useState(pagination?.search || "");
  const [activeCategory, setActiveCategory] = useState(pagination?.category || "");
  const [activeSize, setActiveSize] = useState(pagination?.size || "");
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [productSheetOffset, setProductSheetOffset] = useState(0);
  const [isProductSheetDragging, setIsProductSheetDragging] = useState(false);
  const productSheetStartYRef = useRef<number | null>(null);
  const productSheetScrollRef = useRef<HTMLDivElement | null>(null);
  const salesEnabled = store.accessMode !== "CATALOG_ONLY";
  const cartKey = buildCartKey(store.slug);
  const [cart, setCart] = useState<CartItem[]>([]);
  const handleCatalogFiltersChange = useCallback(
    (nextSearch: string, nextCategory: string, nextSize: string) => {
      setActiveSearch(nextSearch);
      setActiveCategory(nextCategory);
      setActiveSize(nextSize);
    },
    [],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setCart(readCart(cartKey));
      setCustomerDraft(readCustomerDraft(store.slug));
      setIsHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [cartKey, store.slug]);

  useEffect(() => {
    function syncCart() {
      setCart(readCart(cartKey));
    }

    window.addEventListener("storage", syncCart);
    window.addEventListener(cartChangeEvent, syncCart);

    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener(cartChangeEvent, syncCart);
    };
  }, [cartKey]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(
      getCustomerDraftKey(store.slug),
      JSON.stringify(customerDraft),
    );
  }, [customerDraft, isHydrated, store.slug]);

  useEffect(() => {
    if (!lastAddedName) {
      return;
    }

    const timeout = window.setTimeout(() => setLastAddedName(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [lastAddedName]);

  useEffect(() => {
    if (cartOnly || (!isCartOpen && !selectedProduct)) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [cartOnly, isCartOpen, selectedProduct]);

  const subtotal = cart.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );
  const totalItems = cart.reduce((total, item) => total + item.quantity, 0);
  const themeStyle = getThemeStyle(store);
  const catalogSupportsInstantFilters = Boolean(
    !cartOnly &&
      salesEnabled &&
      pagination &&
      pagination.totalPages <= 1 &&
      products.length === pagination.totalProducts,
  );
  const filteredProducts = catalogSupportsInstantFilters
    ? products.filter((product) => {
        const matchesCategory = !activeCategory
          || categories.find((item) => item.slug === activeCategory)?.id === product.categoryId;
        const matchesSearch = productMatchesSearch(product, activeSearch);
        const matchesSize = productMatchesSize(product, activeSize);

        return matchesCategory && matchesSearch && matchesSize;
      })
    : products;
  const productsInActiveCategory = catalogSupportsInstantFilters
    ? products.filter((product) => (
        !activeCategory
          || categories.find((item) => item.slug === activeCategory)?.id === product.categoryId
      ))
    : products;
  const sizeFilterOptions = catalogSupportsInstantFilters
    ? [...new Set(productsInActiveCategory.flatMap(getProductSizeOptions))].sort((first, second) =>
        first.localeCompare(second, "pt-BR", { numeric: true }),
      )
    : [];
  const totalProductsVisible = catalogSupportsInstantFilters
    ? filteredProducts.length
    : pagination?.totalProducts ?? products.length;

  function buildCatalogHref(page: number) {
    const params = new URLSearchParams();

    if (pagination?.search) {
      params.set("search", pagination.search);
    }
    if (pagination?.category) {
      params.set("category", pagination.category);
    }
    if (pagination?.size) {
      params.set("size", pagination.size);
    }
    if (page > 1) {
      params.set("page", String(page));
    }

    const queryString = params.toString();
    return queryString ? `/loja/${store.slug}?${queryString}` : `/loja/${store.slug}`;
  }

  function addToCart(product: CatalogProduct, selections: Record<string, string> = {}) {
    const attributes = buildSelectedProductAttributes(product, selections);
    const matchingVariant = findMatchingVariant(product, selections);
    const activeStock = getSelectedStock(product, selections);

    if (activeStock !== null && activeStock <= 0) {
      return;
    }

    const activeImageUrl = matchingVariant?.imageUrl || product.imageUrl;
    const selectionKey = buildSelectionKey(product.id, matchingVariant?.id || null, attributes);

    setCart((current) => {
      const existing = current.find((item) => item.selectionKey === selectionKey);

      if (existing) {
        return current.map((item) =>
          item.selectionKey === selectionKey
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...current,
        {
          selectionKey,
          productId: product.id,
          productVariantId: matchingVariant?.id,
          productName: product.name,
          slug: product.slug,
          quantity: 1,
          unitPrice: matchingVariant?.unitPrice || product.promotionalPrice || product.price,
          imageUrl: activeImageUrl,
          attributes,
          notes: "",
        },
      ];
    });

    setLastAddedName(product.name);
    startTransition(() => setIsCartOpen(true));
  }

  function updateQuantity(selectionKey: string, nextQuantity: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.selectionKey === selectionKey ? { ...item, quantity: nextQuantity } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function updateItemNotes(selectionKey: string, notes: string) {
    setCart((current) =>
      current.map((item) =>
        item.selectionKey === selectionKey ? { ...item, notes } : item,
      ),
    );
  }

  function handleQuickBuy(product: CatalogProduct, selections: Record<string, string> = {}) {
    const matchingVariant = findMatchingVariant(product, selections);
    const activeStock = getSelectedStock(product, selections);

    if (activeStock !== null && activeStock <= 0) {
      return;
    }

    const message = buildQuickBuyMessage({
      storeName: store.name,
      productName: product.name,
      unitPrice: matchingVariant?.unitPrice || product.promotionalPrice || product.price,
      attributes: buildSelectedProductAttributes(product, selections),
      productUrl: `${window.location.origin}/loja/${store.slug}/produto/${product.slug}`,
    });

    window.location.assign(createWhatsAppLink(store.whatsappNumber, message));
  }

  function closeProductDetails() {
    setProductSheetOffset(0);
    setIsProductSheetDragging(false);
    productSheetStartYRef.current = null;
    productSheetScrollRef.current = null;
    setSelectedChoices({});
    setSelectedProduct(null);
  }

  function handleProductSheetTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    productSheetStartYRef.current = event.touches[0]?.clientY ?? null;
    setIsProductSheetDragging(true);
  }

  function handleProductSheetTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (productSheetStartYRef.current === null) {
      return;
    }

    const nextOffset = Math.max(0, (event.touches[0]?.clientY ?? 0) - productSheetStartYRef.current);
    setProductSheetOffset(nextOffset);
  }

  function handleProductSheetTouchEnd() {
    const shouldClose = productSheetOffset > 260;
    productSheetStartYRef.current = null;
    setIsProductSheetDragging(false);

    if (shouldClose) {
      closeProductDetails();
      return;
    }

    if (productSheetOffset > 28) {
      productSheetScrollRef.current?.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }

    setProductSheetOffset(0);
  }

  async function handleCheckout() {
    if (!cart.length) {
      setError("Adicione itens ao carrinho antes de enviar o pedido.");
      return;
    }

    if (
      !customerDraft.customerName.trim() ||
      !customerDraft.customerPhone.trim()
    ) {
      setError("Preencha pelo menos nome e telefone para continuar.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...customerDraft,
        items: cart.map((item) => ({
          productId: item.productId,
          productVariantId: item.productVariantId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes?.trim() || "",
          attributes: item.attributes,
        })),
      };

      const response = await fetch(`/api/public/store/${store.slug}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        whatsappLink?: string;
      };

      if (!response.ok || !data.whatsappLink) {
        setError(data.error || "Nao foi possivel enviar o pedido.");
        return;
      }

      window.localStorage.removeItem(cartKey);
      setCart([]);
      sessionStorage.setItem(
        `pedido-confirmado:${store.slug}`,
        JSON.stringify({ whatsappLink: data.whatsappLink, storeName: store.name }),
      );
      window.location.assign(`/loja/${store.slug}/pedido-confirmado`);
    } catch {
      setError("Nao foi possivel enviar o pedido agora. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  const cartPanel = (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,#fffdfb_0%,#ffffff_100%)]">
      <div className="border-b border-slate-200/80 bg-white/90 px-5 py-5 backdrop-blur md:px-6">
        {!cartOnly ? (
          <div className="mb-4 flex justify-center md:hidden">
            <span className="h-1.5 w-14 rounded-full bg-slate-200" />
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-orange-700">
              <ShoppingCart className="size-3.5" />
              Pedido rapido
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Seu carrinho</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Revise os itens e envie tudo direto para o WhatsApp da loja.
              </p>
            </div>
          </div>
          {!cartOnly ? (
            <button
              type="button"
              onClick={() => setIsCartOpen(false)}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:text-slate-950"
              aria-label="Fechar carrinho"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[22px] bg-slate-950 px-4 py-3 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/70">Itens</p>
            <p suppressHydrationWarning className="mt-1 text-lg font-semibold">
              {totalItems}
            </p>
          </div>
          <div className="rounded-[22px] bg-slate-100 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Subtotal</p>
            <p suppressHydrationWarning className="mt-1 text-lg font-semibold text-slate-950">
              {formatCurrency(subtotal)}
            </p>
          </div>
          <div className="rounded-[22px] bg-orange-50 px-4 py-3 text-orange-800">
            <p className="text-[11px] uppercase tracking-[0.18em] text-orange-600">
              Entrega
            </p>
            <p className="mt-1 text-lg font-semibold">Rapida</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-36 pt-5 md:px-6">
        <section className="grid gap-3">
          {cart.length ? (
            cart.map((item) => (
              <article
                key={item.selectionKey}
                className="rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)]"
              >
                <div className="flex gap-3">
                  {store.catalogUsesImages && item.imageUrl ? (
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-[22px] bg-slate-100">
                    <Image
                      src={resolveCatalogImage(item.imageUrl, {
                        width: 180,
                        height: 180,
                        crop: "fill",
                      })}
                      alt={item.productName}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-950">
                          {item.productName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatCurrency(item.unitPrice)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.selectionKey, 0)}
                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:text-red-600"
                        aria-label={`Remover ${item.productName}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {item.attributes.length ? (
                      <p className="mt-2 text-xs leading-6 text-slate-500">
                        {item.attributes.join(" | ")}
                      </p>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.selectionKey, item.quantity - 1)}
                          className="inline-flex size-7 items-center justify-center rounded-full bg-white text-base shadow-sm"
                          aria-label={`Diminuir ${item.productName}`}
                        >
                          -
                        </button>
                        <span className="min-w-4 text-center font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.selectionKey, item.quantity + 1)}
                          className="inline-flex size-7 items-center justify-center rounded-full bg-white text-base shadow-sm"
                          aria-label={`Aumentar ${item.productName}`}
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm font-semibold text-slate-950">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </p>
                    </div>

                    <label className="mt-3 grid gap-2 text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
                      Observacao deste item
                      <textarea
                        rows={2}
                        value={item.notes || ""}
                        onChange={(event) =>
                          updateItemNotes(item.selectionKey, event.target.value)
                        }
                        className="rounded-[20px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal normal-case text-slate-700"
                        placeholder="Ex.: sem cebola, embalar presente"
                      />
                    </label>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <ShoppingBag className="size-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">
                Seu carrinho esta vazio
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Toque em Carrinho nos produtos para montar o pedido e enviar em poucos passos.
              </p>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[32px] border border-slate-200/80 bg-white p-5 shadow-[0_20px_48px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <Truck className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Entrega mais rapida</p>
              <p className="text-sm text-slate-500">
                Nome e telefone sao obrigatorios. Endereco e opcional.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nome
              <input
                required
                name="customerName"
                autoComplete="name"
                value={customerDraft.customerName}
                onChange={(event) =>
                  setCustomerDraft((current) => ({
                    ...current,
                    customerName: event.target.value,
                  }))
                }
                className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="Seu nome"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Telefone
              <input
                required
                name="customerPhone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={customerDraft.customerPhone}
                onChange={(event) =>
                  setCustomerDraft((current) => ({
                    ...current,
                    customerPhone: formatPhoneInput(event.target.value),
                  }))
                }
                className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="(83) 99999-9999"
                maxLength={16}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Endereco
                <input
                  name="deliveryAddress"
                  autoComplete="street-address"
                  value={customerDraft.deliveryAddress}
                  onChange={(event) =>
                    setCustomerDraft((current) => ({
                      ...current,
                      deliveryAddress: event.target.value,
                    }))
                  }
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="Rua, avenida, loteamento"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Numero
                <input
                  name="deliveryNumber"
                  inputMode="numeric"
                  value={customerDraft.deliveryNumber}
                  onChange={(event) =>
                    setCustomerDraft((current) => ({
                      ...current,
                      deliveryNumber: event.target.value,
                    }))
                  }
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="120"
                />
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Bairro
                <input
                  name="deliveryDistrict"
                  autoComplete="address-level3"
                  value={customerDraft.deliveryDistrict}
                  onChange={(event) =>
                    setCustomerDraft((current) => ({
                      ...current,
                      deliveryDistrict: event.target.value,
                    }))
                  }
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="Centro"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Cidade
                <input
                  name="deliveryCity"
                  autoComplete="address-level2"
                  value={customerDraft.deliveryCity}
                  onChange={(event) =>
                    setCustomerDraft((current) => ({
                      ...current,
                      deliveryCity: event.target.value,
                    }))
                  }
                  className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                  placeholder="Uirauna"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Complemento
              <input
                name="deliveryComplement"
                value={customerDraft.deliveryComplement}
                onChange={(event) =>
                  setCustomerDraft((current) => ({
                    ...current,
                    deliveryComplement: event.target.value,
                  }))
                }
                className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="Apartamento, bloco, ponto de apoio"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Referencia
              <input
                name="deliveryReference"
                value={customerDraft.deliveryReference}
                onChange={(event) =>
                  setCustomerDraft((current) => ({
                    ...current,
                    deliveryReference: event.target.value,
                  }))
                }
                className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="Casa azul, perto da praca"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Observacoes do pedido
              <textarea
                name="notes"
                rows={3}
                value={customerDraft.notes}
                onChange={(event) =>
                  setCustomerDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3"
                placeholder="Ex.: entregar a tarde"
              />
            </label>
          </div>
        </section>
      </div>

      <div className="border-t border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur md:px-6">
        <div className="rounded-[28px] bg-slate-950 px-5 py-4 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">Subtotal</p>
              <p suppressHydrationWarning className="mt-1 text-2xl font-semibold">
                {formatCurrency(subtotal)}
              </p>
            </div>
            <div suppressHydrationWarning className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90">
              {totalItems} {totalItems === 1 ? "item" : "itens"}
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-[22px] border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting || !cart.length}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: store.secondaryColor }}
          >
            <MessageCircle className="size-4" />
            {submitting ? "Enviando pedido..." : "Enviar pedido no WhatsApp"}
          </button>
        </div>
      </div>
    </div>
  );

  const selectedProductAttributes = selectedProduct
    ? buildSelectedProductAttributes(selectedProduct, selectedChoices)
    : [];
  const selectedOptionGroups = selectedProduct
    ? getProductOptionGroups(selectedProduct)
    : [];
  const selectedMatchingVariant = selectedProduct
    ? findMatchingVariant(selectedProduct, selectedChoices)
    : null;
  const selectedPreviewVariant = selectedProduct
    ? selectedMatchingVariant || findPreviewVariant(selectedProduct, selectedChoices)
    : null;
  const selectedSelectionsComplete = areRequiredSelectionsComplete(
    selectedOptionGroups,
    selectedChoices,
  );
  const selectedMissingVariant = Boolean(
    selectedProduct
      && selectedSelectionsComplete
      && selectedProduct.variants.length
      && !selectedMatchingVariant,
  );
  const isSelectedProductReady = selectedProduct
    ? selectedSelectionsComplete
      && (!selectedProduct.variants.length || Boolean(selectedMatchingVariant))
    : true;
  const selectedRegularPrice = selectedProduct
    ? selectedPreviewVariant?.regularPrice ?? selectedProduct.price
    : 0;
  const selectedPromotionalPrice = selectedProduct
    ? selectedPreviewVariant?.promotionalPrice ?? selectedProduct.promotionalPrice
    : null;
  const selectedProductDiscount = selectedProduct
    ? getDiscountPercentage(selectedRegularPrice, selectedPromotionalPrice)
    : 0;
  const selectedProductPrice = selectedProduct
    ? selectedPreviewVariant?.unitPrice || selectedPromotionalPrice || selectedRegularPrice
    : 0;
  const selectedActiveStock = selectedProduct
    ? selectedMissingVariant
      ? 0
      : selectedMatchingVariant?.stockQuantity
        ?? (selectedProduct.trackStock ? selectedProduct.stockQuantity ?? 0 : null)
    : null;
  const selectedHasStock = selectedActiveStock === null || selectedActiveStock > 0;
  const selectedStockLabel =
    selectedActiveStock === null ? "" : selectedActiveStock > 0 ? "Com estoque" : "Sem estoque";
  const selectedProductImages = selectedProduct
    ? !store.catalogUsesImages
      ? []
      : selectedPreviewVariant?.imageUrl
      ? [selectedPreviewVariant.imageUrl]
      : selectedProduct.gallery.length
        ? selectedProduct.gallery
        : [selectedProduct.imageUrl]
    : [];

  return (
    <div className="grid w-full min-w-0 max-w-full gap-4 overflow-x-clip pb-28 md:gap-6 md:pb-10" style={themeStyle}>
      {!cartOnly ? (
        <>
          <section className="relative w-full min-w-0 max-w-full overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-[0_28px_72px_rgba(15,23,42,0.24)] md:rounded-[34px] md:shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url('${store.bannerUrl}')` }}
            />
            <div
              className="absolute inset-0 opacity-95"
              style={{
                background:
                  "linear-gradient(180deg, rgba(15,23,42,0.22), rgba(15,23,42,0.92))",
              }}
            />
            <div
              className="absolute -left-12 top-12 size-40 rounded-full blur-3xl"
              style={{ backgroundColor: `${store.accentColor}66` }}
            />
            <div
              className="absolute -right-12 bottom-10 size-44 rounded-full blur-3xl"
              style={{ backgroundColor: `${store.secondaryColor}55` }}
            />

            <div className="relative grid min-w-0 gap-5 p-4 sm:p-7 lg:grid-cols-[1.25fr_0.75fr] lg:p-9">
              <div className="min-w-0 space-y-4 sm:space-y-5">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.24em]">
                  <Sparkles className="size-3.5 text-orange-200" />
                  Catalogo premium
                </div>

                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[22px] border border-white/12 bg-white/10 shadow-lg sm:size-20 sm:rounded-[24px]">
                    <Image
                      src={store.logoUrl}
                      alt={store.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] uppercase tracking-[0.18em] text-orange-200 sm:text-xs sm:tracking-[0.28em]">
                      Atendimento pelo WhatsApp
                    </p>
                    <h1 className="display-font mt-2 break-words text-3xl font-semibold leading-none text-white sm:text-5xl">
                      {store.name}
                    </h1>
                  </div>
                </div>

                <p className="max-w-2xl text-sm leading-6 text-slate-200 sm:text-lg sm:leading-8">
                  {store.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur sm:px-4 sm:text-sm">
                    {totalProductsVisible} produtos
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur sm:px-4 sm:text-sm">
                    {categories.length || 1} categorias
                  </span>
                  <span className="rounded-full border border-white/12 bg-white/10 px-3 py-2 text-xs text-white/90 backdrop-blur sm:px-4 sm:text-sm">
                    {promoCount} ofertas
                  </span>
                </div>

                <div className={`grid min-w-0 gap-2 sm:hidden ${salesEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
                  <a
                    href="#catalog-toolbar"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-950"
                  >
                    Buscar
                    <ArrowDown className="size-4" />
                  </a>
                  {salesEnabled ? (
                    <Link
                      href={`/loja/${store.slug}/carrinho`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur"
                    >
                      <ShoppingCart className="size-4" />
                      Carrinho
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="hidden rounded-[30px] border border-white/12 bg-white/10 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur lg:block">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-orange-200">
                      {salesEnabled ? "Fluxo rapido" : "Modo catalogo"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      {salesEnabled ? "Comprar em poucos toques" : "Vitrine para apresentacao"}
                    </h2>
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
                    <Store className="size-5 text-white" />
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <div className="rounded-[24px] bg-white/10 p-4">
                    <p className="text-sm font-semibold text-white">
                      {salesEnabled ? "1. Comprar agora" : "1. Veja os produtos"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-200">
                      {salesEnabled
                        ? "Vai direto para o WhatsApp com o produto preenchido."
                        : "Navegue pelas categorias e detalhes sem carrinho ou pedidos."}
                    </p>
                  </div>
                  {salesEnabled ? (
                    <>
                      <div className="rounded-[24px] bg-white/10 p-4">
                        <p className="text-sm font-semibold text-white">2. Adicionar ao carrinho</p>
                        <p className="mt-1 text-sm leading-6 text-slate-200">
                          Monte o pedido e abra o carrinho pelo icone flutuante.
                        </p>
                      </div>
                      <div className="rounded-[24px] bg-white/10 p-4">
                        <p className="text-sm font-semibold text-white">3. Enviar pedido</p>
                        <p className="mt-1 text-sm leading-6 text-slate-200">
                          Informe o endereco e finalize tudo no WhatsApp da loja.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[24px] bg-white/10 p-4">
                      <p className="text-sm font-semibold text-white">2. Sem pedidos online</p>
                      <p className="mt-1 text-sm leading-6 text-slate-200">
                        Veja os detalhes e fale com a loja pelo WhatsApp.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <CatalogToolbar
            key={`${pagination?.search || ""}|${pagination?.category || ""}|${catalogSupportsInstantFilters ? "instant" : "server"}`}
            categories={categories}
            search={catalogSupportsInstantFilters ? activeSearch : pagination?.search || ""}
            category={catalogSupportsInstantFilters ? activeCategory : pagination?.category || ""}
            sizeFilter={catalogSupportsInstantFilters ? activeSize : pagination?.size || ""}
            sizeOptions={sizeFilterOptions}
            secondaryColor={store.secondaryColor}
            totalProducts={totalProductsVisible}
            clientMode={catalogSupportsInstantFilters}
            onFiltersChange={handleCatalogFiltersChange}
          />

          {filteredProducts.length ? (
            <section
              id="produtos"
              className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
            >
              {filteredProducts.map((product, index) => {
                const productPrice = product.promotionalPrice || product.price;
                const productAttributes = getProductAttributes(product).slice(0, 2);
                const discountPercentage = getDiscountPercentage(
                  product.price,
                  product.promotionalPrice,
                );
                const productOptionGroups = getProductOptionGroups(product);
                const requiresSelection = productOptionGroups.length > 0;
                const productDetailHref = `/loja/${store.slug}/produto/${product.slug}`;
                const productActiveStock = getSelectedStock(product);
                const productHasStock = productActiveStock === null || productActiveStock > 0;

                return (
                  <article
                    key={product.id}
                    className="group min-w-0 overflow-hidden rounded-[24px] border border-white/70 bg-white/95 p-2 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur transition duration-300 hover:-translate-y-1 sm:rounded-[30px] sm:p-3 sm:shadow-[0_22px_55px_rgba(15,23,42,0.08)]"
                  >
                    <div className="grid min-w-0 gap-3 sm:block">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(product);
                          setSelectedChoices({});
                        }}
                        className="block w-full min-w-0 touch-manipulation text-left sm:hidden"
                      >
                        {store.catalogUsesImages ? (
                          <div className="relative overflow-hidden rounded-[22px]">
                            <div className="relative h-[238px] w-full overflow-hidden bg-slate-100">
                              <Image
                                src={product.imageUrl}
                                alt={product.name}
                                fill
                                sizes="(max-width: 640px) 50vw, 100vw"
                                preload={index < 2}
                                loading={index < 2 ? "eager" : "lazy"}
                                fetchPriority={index < 2 ? "high" : "auto"}
                                decoding="async"
                                className="object-cover transition duration-500"
                              />
                            </div>

                            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-end gap-3 p-2.5">
                              <span
                                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-lg"
                                style={{
                                  backgroundColor: product.promotionalPrice
                                    ? store.accentColor
                                    : "rgba(15,23,42,0.68)",
                                }}
                              >
                                {product.promotionalPrice ? `-${discountPercentage}%` : "Ver"}
                              </span>
                            </div>
                          </div>
                        ) : null}

                        <div className="min-w-0 px-1 pb-1 pt-3">
                          <p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
                            {product.name}
                          </p>
                          <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                            <span className="min-w-0 text-sm font-semibold text-slate-950 min-[380px]:text-base">
                              {formatCurrency(productPrice)}
                            </span>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-600 min-[380px]:px-2.5 min-[380px]:tracking-[0.16em]">
                              {product.promotionalPrice ? `-${discountPercentage}%` : "Detalhes"}
                            </span>
                          </div>
                        </div>
                      </button>

                      {store.catalogUsesImages ? (
                      <div className="hidden sm:block">
                        <Link
                          href={productDetailHref}
                          className="relative block overflow-hidden rounded-[22px] sm:rounded-[24px]"
                        >
                          <div className="relative h-[148px] w-full overflow-hidden bg-slate-100 sm:h-[270px]">
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                              preload={index === 0}
                              loading={index === 0 ? "eager" : "lazy"}
                              fetchPriority={index === 0 ? "high" : "auto"}
                              decoding="async"
                              className="object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                          </div>

                          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-2.5 sm:p-3">
                            <span className="rounded-full bg-slate-950/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur sm:text-[11px] sm:tracking-[0.18em]">
                              {product.categoryName}
                            </span>
                            {product.promotionalPrice ? (
                              <span
                                className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white shadow-lg sm:text-[11px] sm:tracking-[0.18em]"
                                style={{ backgroundColor: store.accentColor }}
                              >
                                -{discountPercentage}%
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      </div>
                      ) : null}
                      <div className="hidden gap-3 px-1 pb-1 pt-1 sm:grid sm:gap-4 sm:pt-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              href={productDetailHref}
                              className="line-clamp-2 text-base font-semibold leading-6 text-slate-950 transition hover:text-orange-600 sm:text-xl sm:leading-7"
                            >
                              {product.name}
                            </Link>
                            <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-600 sm:mt-2 sm:leading-7">
                              {product.shortDescription}
                            </p>
                          </div>
                        </div>

                        {productAttributes.length ? (
                          <div className="flex flex-wrap gap-2">
                            {productAttributes.map((attribute) => (
                              <span
                                key={attribute}
                                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700 sm:text-xs"
                              >
                                {attribute}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-xl font-semibold text-slate-950 sm:text-2xl">
                              {formatCurrency(productPrice)}
                            </p>
                            {product.promotionalPrice ? (
                              <div className="space-y-1">
                                <p className="text-sm text-slate-500 line-through">
                                  {formatCurrency(product.price)}
                                </p>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 sm:text-xs sm:tracking-[0.15em]">
                                  Economize {formatCurrency(product.price - product.promotionalPrice)}
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">Atendimento imediato</p>
                            )}
                          </div>
                        </div>

                        <div className={`grid gap-2 ${salesEnabled ? "grid-cols-2" : "grid-cols-1"}`}>
                          {!salesEnabled ? (
                            <Link
                              href={productDetailHref}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                              style={{ backgroundColor: store.secondaryColor }}
                            >
                              Ver detalhes
                            </Link>
                          ) : requiresSelection ? (
                            <>
                              <Link
                                href={productDetailHref}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                                style={{ backgroundColor: store.secondaryColor }}
                              >
                                <MessageCircle className="size-4" />
                                Escolher
                              </Link>
                              <Link
                                href={productDetailHref}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                              >
                                <ShoppingCart className="size-4" />
                                Ver opcoes
                              </Link>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleQuickBuy(product)}
                                disabled={!productHasStock}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
                                style={{ backgroundColor: store.secondaryColor }}
                              >
                                <MessageCircle className="size-4" />
                                Comprar
                              </button>
                              <button
                                type="button"
                                onClick={() => addToCart(product)}
                                disabled={!productHasStock}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
                              >
                                <ShoppingCart className="size-4" />
                                Carrinho
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="rounded-[32px] border border-dashed border-slate-300 bg-white/90 p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
              <h2 className="mt-4 text-2xl font-semibold text-slate-950">
                Nenhum produto encontrado
              </h2>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500">
                Ajuste a busca ou toque em Limpar para voltar para o catalogo completo da loja.
              </p>
            </section>
          )}

          {pagination && pagination.totalPages > 1 && !catalogSupportsInstantFilters ? (
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/70 bg-white/92 px-4 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <p className="text-sm text-slate-500">
                Pagina {pagination.currentPage} de {pagination.totalPages}
              </p>
              <div className="flex gap-3">
                <Link
                  href={buildCatalogHref(Math.max(1, pagination.currentPage - 1))}
                  aria-disabled={pagination.currentPage <= 1}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    pagination.currentPage <= 1
                      ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  Anterior
                </Link>
                <Link
                  href={buildCatalogHref(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                  aria-disabled={pagination.currentPage >= pagination.totalPages}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    pagination.currentPage >= pagination.totalPages
                      ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  Proxima
                </Link>
              </div>
            </section>
          ) : null}

          <div
            className={cn(
              "pointer-events-none fixed inset-x-4 bottom-24 z-40 transition-all duration-300 md:inset-x-auto md:right-5",
              lastAddedName ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(16,185,129,0.35)]">
              <CheckCircle2 className="size-4" />
              {lastAddedName ? `${lastAddedName} no carrinho` : ""}
            </div>
          </div>

          {isHydrated ? (
            <>
              {selectedProduct ? (
                <div
                  className={cn(
                    "fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/42 transition duration-200 sm:hidden",
                    selectedProduct ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                  )}
                >
                  <button
                    type="button"
                    aria-label="Fechar detalhes do produto"
                    className="absolute inset-0"
                    onClick={closeProductDetails}
                  />
                  <div
                    className="relative z-10 flex h-[100dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.24)] will-change-transform"
                    style={{
                      transform: `translateY(${productSheetOffset}px)`,
                      transitionDuration: isProductSheetDragging ? "0ms" : "180ms",
                    }}
                  >
                    <div
                      className="touch-none select-none border-b border-slate-200/80 bg-white px-5 py-4"
                      onTouchStart={handleProductSheetTouchStart}
                      onTouchMove={handleProductSheetTouchMove}
                      onTouchEnd={handleProductSheetTouchEnd}
                    >
                      <div className="mb-3 flex justify-center">
                        <span className="h-1.5 w-14 rounded-full bg-slate-200" />
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
                            {selectedProduct.categoryName}
                          </p>
                          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                            {selectedProduct.name}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={closeProductDetails}
                          className="rounded-full border border-slate-200 bg-white p-2 text-slate-600"
                          aria-label="Fechar"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </div>

                    <div
                      ref={productSheetScrollRef}
                      className="flex-1 overscroll-contain overflow-y-auto px-5 pb-36 pt-5"
                    >
                      {store.catalogUsesImages && selectedProductImages.length ? (
                        <div className="relative">
                          <ProductImageGallery
                            key={`${selectedProduct.id}-${selectedPreviewVariant?.id || "base"}`}
                            images={selectedProductImages}
                            productName={selectedProduct.name}
                            frameClassName="h-[min(54dvh,420px)]"
                            imageSizes="100vw"
                            thumbnailSizes="72px"
                            thumbnailClassName="h-24 w-[4.5rem]"
                            disableThumbnailSelection={!selectedHasStock}
                            preloadFirst
                          />
                          <div className="pointer-events-none absolute right-3 top-3">
                            <span
                              className="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-lg"
                              style={{
                                backgroundColor: selectedPromotionalPrice
                                  ? store.accentColor
                                  : "rgba(15,23,42,0.68)",
                              }}
                            >
                              {selectedPromotionalPrice
                                ? `-${selectedProductDiscount}%`
                                : "Disponivel"}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-3xl font-semibold text-slate-950">
                              {formatCurrency(selectedProductPrice)}
                            </p>
                            {selectedPromotionalPrice ? (
                              <p className="mt-1 text-sm text-slate-500 line-through">
                                {formatCurrency(selectedRegularPrice)}
                              </p>
                            ) : null}
                          </div>
                          {selectedPromotionalPrice ? (
                            <p className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                              Economize {formatCurrency(selectedRegularPrice - selectedProductPrice)}
                            </p>
                          ) : null}
                        </div>

                        <p className="mt-4 text-sm leading-7 text-slate-600">
                          {selectedProduct.shortDescription || "Produto premium da loja."}
                        </p>

                        {selectedOptionGroups.length ? (
                          <div className="mt-5 grid gap-4">
                            {selectedOptionGroups.map((group) => (
                              <div key={group.key}>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                                  Escolha {group.label.toLowerCase()}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {group.options.map((option) => {
                                    const isActive = selectedChoices[group.key] === option;
                                    const availableOptions = getAvailableProductOptions(
                                      selectedProduct,
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
                                            selectProductOption(
                                              selectedProduct,
                                              current,
                                              group.key,
                                              option,
                                            ),
                                          )
                                        }
                                        className={cn(
                                          "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
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
                          </div>
                        ) : null}

                        {selectedProductAttributes.length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedProductAttributes.map((attribute) => (
                              <span
                                key={attribute}
                                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700"
                              >
                                {attribute}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {!selectedSelectionsComplete ? (
                          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
                            Escolha as opcoes para continuar
                          </p>
                        ) : null}
                        {selectedStockLabel && (selectedSelectionsComplete || !selectedOptionGroups.length) ? (
                          <p
                            className={cn(
                              "mt-3 inline-flex rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]",
                              selectedHasStock
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-rose-50 text-rose-700",
                            )}
                          >
                            {selectedStockLabel}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {salesEnabled ? (
                    <div className="border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur">
                      <div className="grid grid-cols-2 gap-3 pb-[calc(env(safe-area-inset-bottom))]">
                        <button
                          type="button"
                          onClick={() => handleQuickBuy(selectedProduct, selectedChoices)}
                          disabled={!isSelectedProductReady || !selectedHasStock}
                          className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-55"
                          style={{ backgroundColor: store.secondaryColor }}
                        >
                          <MessageCircle className="size-4" />
                          Comprar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(selectedProduct, selectedChoices);
                            closeProductDetails();
                          }}
                          disabled={!isSelectedProductReady || !selectedHasStock}
                          className="inline-flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          <ShoppingCart className="size-4" />
                          Carrinho
                        </button>
                      </div>
                    </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {salesEnabled ? (
              <Link
                href={`/loja/${store.slug}/carrinho`}
                className={cn(
                  "fixed inset-x-3 z-40 inline-flex items-center justify-between gap-4 rounded-full px-4 py-3.5 text-left text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] transition duration-300 hover:scale-[1.01] md:inset-x-auto md:bottom-4 md:right-5 md:w-auto md:min-w-[280px] md:px-5 md:py-4",
                  totalItems ? "animate-[pulse_2.4s_ease-in-out_infinite]" : "",
                )}
                style={{
                  backgroundColor: store.primaryColor,
                  bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
                }}
              >
                <span className="flex items-center gap-3">
                  <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-white/14 md:size-11">
                    <ShoppingCart className="size-5" />
                    <span
                      suppressHydrationWarning
                      className={cn(
                        "absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-slate-950 transition",
                        totalItems ? "opacity-100" : "opacity-0",
                      )}
                    >
                      {totalItems}
                    </span>
                  </span>
                  <span>
                    <span
                      suppressHydrationWarning
                      className="block text-[11px] uppercase tracking-[0.2em] text-white/75"
                    >
                      {totalItems ? `${totalItems} itens` : "Pedido"}
                    </span>
                    <span className="block text-sm font-semibold">Abrir carrinho</span>
                  </span>
                </span>
                <span suppressHydrationWarning className="text-sm font-semibold">
                  {formatCurrency(subtotal)}
                </span>
              </Link>
              ) : null}

              {salesEnabled ? (
              <div
                className={cn(
                  "fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-[2px] transition duration-300 md:items-stretch md:justify-end",
                  isCartOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <button
                  type="button"
                  aria-label="Fechar carrinho"
                  className="absolute inset-0"
                  onClick={() => setIsCartOpen(false)}
                />
                <div
                  className={cn(
                    "relative z-10 h-[92dvh] w-full transform rounded-t-[34px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)] transition duration-300 md:h-full md:max-w-xl md:rounded-none md:rounded-l-[34px]",
                    isCartOpen
                      ? "translate-y-0 md:translate-x-0"
                      : "translate-y-full md:translate-y-0 md:translate-x-full",
                  )}
                >
                  {cartPanel}
                </div>
              </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <section className="mx-auto w-full max-w-4xl overflow-hidden rounded-[36px] border border-white/70 bg-white/95 shadow-[0_26px_80px_rgba(15,23,42,0.08)]">
          {cartPanel}
        </section>
      )}
    </div>
  );
}
