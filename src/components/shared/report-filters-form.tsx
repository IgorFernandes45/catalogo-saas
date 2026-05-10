"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ReportCategory = {
  id: string;
  name: string;
};

type ReportProduct = {
  id: string;
  name: string;
  categoryId: string;
};

type ReportFiltersFormProps = {
  pathname: string;
  categories: ReportCategory[];
  initialDateFrom: string;
  initialDateTo: string;
  initialCategoryId: string;
  initialProductId: string;
  selectedProduct: ReportProduct | null;
};

export function ReportFiltersForm({
  pathname,
  categories,
  initialDateFrom,
  initialDateTo,
  initialCategoryId,
  initialProductId,
  selectedProduct,
}: ReportFiltersFormProps) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [productId, setProductId] = useState(initialProductId);
  const [products, setProducts] = useState<ReportProduct[]>(selectedProduct ? [selectedProduct] : []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        if (search.trim()) {
          params.set("q", search.trim());
        }
        if (categoryId !== "all") {
          params.set("categoryId", categoryId);
        }
        if (productId) {
          params.set("selectedId", productId);
        }

        const response = await fetch(`/api/store/report-products/search?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await response.json()) as { products?: ReportProduct[] };

        if (response.ok && data.products) {
          setProducts(data.products);
        } else if (selectedProduct) {
          setProducts([selectedProduct]);
        } else {
          setProducts([]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (selectedProduct) {
          setProducts([selectedProduct]);
        } else {
          setProducts([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [categoryId, productId, search, selectedProduct]);

  const productOptions = useMemo(() => {
    const merged = selectedProduct
      ? [selectedProduct, ...products.filter((product) => product.id !== selectedProduct.id)]
      : products;

    return merged;
  }, [products, selectedProduct]);

  return (
    <form className="mt-6 grid gap-4 rounded-[28px] bg-slate-50 p-5 md:grid-cols-5">
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Data inicial
        <input
          type="date"
          name="dateFrom"
          defaultValue={initialDateFrom}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Data final
        <input
          type="date"
          name="dateTo"
          defaultValue={initialDateTo}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Categoria
        <select
          name="categoryId"
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setProductId("all");
          }}
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
      <div className="grid gap-2">
        <label className="text-sm font-medium text-slate-700">Produto</label>
        <div className="grid gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar produto"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm"
            />
          </div>
          <select
            name="productId"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          >
            <option value="all">{isLoading ? "Buscando..." : "Todos"}</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Filtrar
        </button>
        <Link
          href={pathname}
          className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
        >
          Limpar
        </Link>
      </div>
    </form>
  );
}
