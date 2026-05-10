"use client";

import { startTransition, useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type CatalogToolbarProps = {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  search: string;
  category: string;
  sizeFilter?: string;
  sizeOptions?: string[];
  secondaryColor: string;
  totalProducts: number;
  clientMode?: boolean;
  onFiltersChange?: (nextSearch: string, nextCategory: string, nextSize: string) => void;
};

export function CatalogToolbar({
  categories,
  search,
  category,
  sizeFilter = "",
  sizeOptions = [],
  secondaryColor,
  totalProducts,
  clientMode = false,
  onFiltersChange,
}: CatalogToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [draftSearch, setDraftSearch] = useState(search);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [isSizeFilterOpen, setIsSizeFilterOpen] = useState(false);
  const deferredSearch = useDeferredValue(draftSearch);

  const replaceFilters = useCallback((nextSearch: string, nextCategory: string, nextSize = sizeFilter) => {
    const params = new URLSearchParams();
    const normalizedSearch = nextSearch.trim();

    if (normalizedSearch) {
      params.set("search", normalizedSearch);
    }
    if (nextCategory) {
      params.set("category", nextCategory);
    }
    if (nextSize) {
      params.set("size", nextSize);
    }

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

    if (clientMode && onFiltersChange) {
      onFiltersChange(normalizedSearch, nextCategory, nextSize);
      window.history.replaceState(window.history.state, "", nextUrl);
      return;
    }

    router.replace(nextUrl, {
      scroll: false,
    });
  }, [clientMode, onFiltersChange, pathname, router, sizeFilter]);

  useEffect(() => {
    if (clientMode) {
      replaceFilters(deferredSearch, category, sizeFilter);
      return;
    }

    if (deferredSearch === search) {
      return;
    }

    const timeout = window.setTimeout(() => {
      replaceFilters(deferredSearch, category, sizeFilter);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [category, clientMode, deferredSearch, replaceFilters, search, sizeFilter]);

  useEffect(() => {
    if (clientMode) {
      return;
    }

    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    router.prefetch(params.toString() ? `${pathname}?${params.toString()}` : pathname);

    categories.forEach((item) => {
      const categoryParams = new URLSearchParams(params);
      categoryParams.set("category", item.slug);
      router.prefetch(`${pathname}?${categoryParams.toString()}`);
    });
  }, [categories, clientMode, pathname, router, search]);

  const hasFilters = Boolean(draftSearch || category || sizeFilter);
  const activeCategoryName =
    categories.find((item) => item.slug === category)?.name || "";

  return (
    <section
      id="catalog-toolbar"
      className="sticky top-2 z-30 w-full min-w-0 max-w-full overflow-hidden rounded-[26px] border border-white/70 bg-white/92 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur md:top-3 md:rounded-[30px]"
    >
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          type="search"
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
          placeholder="Buscar por nome, categoria ou detalhe"
          className="w-full rounded-full border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-base text-slate-700 sm:text-sm"
        />
      </label>

      <div className="mt-3 w-full min-w-0 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 p-2">
        <button
          type="button"
          onClick={() => setIsCategoryFilterOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm"
          aria-expanded={isCategoryFilterOpen}
        >
          <span>{activeCategoryName ? `Categoria: ${activeCategoryName}` : "Filtrar por categoria"}</span>
          <ChevronDown
            className={cn(
              "size-4 transition",
              isCategoryFilterOpen ? "rotate-180" : "rotate-0",
            )}
          />
        </button>

        {isCategoryFilterOpen ? (
          <div className="mt-2 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setIsCategoryFilterOpen(false);
                setIsSizeFilterOpen(false);
                startTransition(() => replaceFilters(draftSearch, "", ""));
              }}
              className={cn(
                "min-h-10 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-3.5",
                !category
                  ? "text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                  : "bg-white text-slate-700 hover:bg-slate-100",
              )}
              style={!category ? { backgroundColor: secondaryColor } : undefined}
            >
              Todas
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setIsCategoryFilterOpen(false);
                  setIsSizeFilterOpen(false);
                  startTransition(() =>
                    replaceFilters(draftSearch, category === item.slug ? "" : item.slug, ""),
                  );
                }}
                className={cn(
                  "min-h-10 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-3.5",
                  category === item.slug
                    ? "text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                    : "bg-white text-slate-700 hover:bg-slate-100",
                )}
                style={category === item.slug ? { backgroundColor: secondaryColor } : undefined}
              >
                {item.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {sizeOptions.length ? (
        <div className="mt-3 w-full min-w-0 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50 p-2">
          <button
            type="button"
            onClick={() => setIsSizeFilterOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 shadow-sm"
            aria-expanded={isSizeFilterOpen}
          >
            <span>{sizeFilter ? `Tamanho: ${sizeFilter}` : "Filtrar por tamanho"}</span>
            <ChevronDown
              className={cn(
                "size-4 transition",
                isSizeFilterOpen ? "rotate-180" : "rotate-0",
              )}
            />
          </button>

          {isSizeFilterOpen ? (
            <div className="mt-2 grid min-w-0 grid-cols-4 gap-2 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setIsSizeFilterOpen(false);
                  startTransition(() => replaceFilters(draftSearch, category, ""));
                }}
                className={cn(
                  "min-h-10 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-3.5",
                  !sizeFilter
                    ? "text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                    : "bg-white text-slate-700 hover:bg-slate-100",
                )}
                style={!sizeFilter ? { backgroundColor: secondaryColor } : undefined}
              >
                Todos
              </button>
              {sizeOptions.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    setIsSizeFilterOpen(false);
                    startTransition(() =>
                      replaceFilters(draftSearch, category, sizeFilter === size ? "" : size),
                    );
                  }}
                  className={cn(
                    "min-h-10 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-3.5",
                    sizeFilter === size
                      ? "text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                      : "bg-white text-slate-700 hover:bg-slate-100",
                  )}
                  style={sizeFilter === size ? { backgroundColor: secondaryColor } : undefined}
                >
                  {size}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
        <span>{totalProducts} produtos visiveis</span>
        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setDraftSearch("");
              setIsCategoryFilterOpen(false);
              setIsSizeFilterOpen(false);
              startTransition(() => replaceFilters("", "", ""));
              searchInputRef.current?.focus();
            }}
            className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600"
          >
            Limpar
          </button>
        ) : (
          <span className="rounded-full bg-orange-50 px-3 py-1 text-[11px] text-orange-700">
            Promocoes primeiro
          </span>
        )}
      </div>
    </section>
  );
}
