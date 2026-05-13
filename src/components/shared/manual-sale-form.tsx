"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ScanBarcode, Search } from "lucide-react";

import { createManualSaleAction } from "@/app/painel/actions";
import { useNotify } from "@/components/shared/notify-provider";
import { formatCurrency } from "@/lib/utils";

type ManualSaleProduct = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  promotionalPrice: number | null;
  trackStock: boolean;
  stockQuantity: number | null;
  variants: Array<{
    id: string;
    label: string;
    stockQuantity: number;
    priceOverride: number | null;
    barcode: string | null;
    isActive: boolean;
  }>;
};

export type ManualSaleCategory = {
  id: string;
  name: string;
};

export type ManualSaleCustomer = {
  id: string;
  name: string;
  phone: string | null;
};

type ManualSaleFormProps = {
  categories: ManualSaleCategory[];
  customers: ManualSaleCustomer[];
};

export function ManualSaleForm({ categories, customers }: ManualSaleFormProps) {
  const router = useRouter();
  const notify = useNotify();
  const [isPending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [products, setProducts] = useState<ManualSaleProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [productVariantId, setProductVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const params = new URLSearchParams();

        if (search.trim()) {
          params.set("q", search.trim());
        }

        if (categoryId !== "all") {
          params.set("categoryId", categoryId);
        }

        const response = await fetch(`/api/store/products/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await response.json()) as {
          error?: string;
          products?: ManualSaleProduct[];
        };

        if (!response.ok || !data.products) {
          setSearchError(data.error || "Não foi possível buscar os produtos.");
          setProducts([]);
          return;
        }

        setProducts(data.products);
        const normalizedSearch = search.trim().toLowerCase();

        if (normalizedSearch) {
          const exactProduct = data.products.find(
            (product) => product.barcode?.toLowerCase() === normalizedSearch,
          );
          const exactVariantProduct = data.products.find((product) =>
            product.variants.some(
              (variant) => variant.barcode?.toLowerCase() === normalizedSearch,
            ),
          );
          const exactVariant = exactVariantProduct?.variants.find(
            (variant) => variant.barcode?.toLowerCase() === normalizedSearch,
          );

          if (exactProduct) {
            setProductId(exactProduct.id);
            setProductVariantId("");
          } else if (exactVariantProduct && exactVariant) {
            setProductId(exactVariantProduct.id);
            setProductVariantId(exactVariant.id);
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setSearchError("Não foi possível buscar os produtos.");
        setProducts([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [categoryId, search]);

  const selectedProduct =
    products.find((product) => product.id === productId) || null;
  const selectedVariant =
    selectedProduct?.variants.find((variant) => variant.id === productVariantId) || null;
  const selectedProductId = selectedProduct ? productId : "";
  const selectedVariantId =
    selectedProduct && selectedVariant ? productVariantId : "";

  return (
    <div>
      <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
        {isSearching
          ? "Buscando produtos..."
          : `${products.length} produto${products.length === 1 ? "" : "s"} carregado${products.length === 1 ? "" : "s"}`}
      </p>

      <form
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();

          const formData = new FormData();
          formData.set("productId", productId);
          formData.set("productVariantId", productVariantId);
          formData.set("quantity", quantity);
          formData.set("paymentMethod", paymentMethod);
          formData.set("customerId", customerId);
          if (customerId) {
            const selected = customers.find((c) => c.id === customerId);
            if (selected) formData.set("customerName", selected.name);
          }
          formData.set("notes", notes);

          startTransition(async () => {
            const result = await createManualSaleAction(formData);

            notify({
              tone: result.status === "success" ? "success" : "error",
              title:
                result.status === "success"
                  ? "Venda registrada"
                  : "Não foi possível registrar a venda",
              message: result.message,
            });

            if (result.status === "success") {
              setProductId("");
              setProductVariantId("");
              setQuantity("1");
              setCustomerId("");
              setNotes("");
              router.refresh();
            }
          });
        }}
      >
        <div className="grid gap-4 rounded-[28px] bg-slate-50 p-5 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Nome do produto
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Digite ou leia código de barras"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm"
                autoComplete="off"
              />
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <ScanBarcode className="size-3.5" />
              O leitor preenche este campo e seleciona o item quando o código for exato.
            </span>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Categoria
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="all">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700 xl:col-span-2">
            Produto
            <select
              value={selectedProductId}
              onChange={(event) => {
                setProductId(event.target.value);
                setProductVariantId("");
              }}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="">
                {isSearching ? "Buscando..." : "Selecione um produto"}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.categoryName}
                </option>
              ))}
            </select>
          </label>
        </div>

        {searchError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {searchError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {selectedProduct?.variants.length ? (
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Variação
              <select
                value={selectedVariantId}
                onChange={(event) => setProductVariantId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <option value="">Selecione a variação</option>
                {selectedProduct.variants
                  .filter((variant) => variant.isActive)
                  .map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.label}
                      {variant.barcode ? ` - Cod. ${variant.barcode}` : ""}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Quantidade
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Pagamento
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="PIX">Pix</option>
              <option value="CASH">Dinheiro</option>
              <option value="DEBIT_CARD">Cartão débito</option>
              <option value="CREDIT_CARD">Cartão crédito</option>
              <option value="BANK_TRANSFER">Transferência</option>
              <option value="OTHER">Outro</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cliente
            <select
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
            >
              <option value="">Nenhum (avulso)</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}{customer.phone ? ` — ${customer.phone}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-medium text-slate-700 xl:col-span-2">
            Observacoes
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Opcional"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
            />
          </label>
        </div>

        <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid gap-1">
            <p className="text-sm font-semibold text-slate-950">
              {selectedProduct ? selectedProduct.name : "Selecione um produto para vender"}
            </p>
            <p className="text-sm text-slate-500">
              {selectedProduct
                ? `${selectedProduct.categoryName}${selectedProduct.sku ? ` - SKU ${selectedProduct.sku}` : ""}`
                + `${selectedProduct.barcode ? ` - Cod. ${selectedProduct.barcode}` : ""}`
                : "Use a busca para encontrar o item sem carregar a lista inteira no painel."}
            </p>
            {selectedProduct ? (
              <p className="text-sm text-slate-600">
                Preço aplicado:{" "}
                <span className="font-semibold text-slate-950">
                  {formatCurrency(
                    selectedVariant?.priceOverride
                    ?? selectedProduct.promotionalPrice
                    ?? selectedProduct.price,
                  )}
                </span>
                {selectedProduct.trackStock ? (
                  <span className="ml-2 text-slate-500">
                    Estoque atual:{" "}
                    {selectedVariant
                      ? selectedVariant.stockQuantity
                      : selectedProduct.stockQuantity ?? 0}
                  </span>
                ) : (
                  <span className="ml-2 text-slate-500">Sem controle de estoque</span>
                )}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={
              isPending
              || !selectedProduct
              || isSearching
              || Boolean(selectedProduct?.variants.length && !selectedVariant)
            }
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? "Registrando..." : "Registrar venda"}
          </button>
        </div>
      </form>
    </div>
  );
}
