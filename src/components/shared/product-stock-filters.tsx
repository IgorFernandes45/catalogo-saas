"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";

type ProductStockFiltersProps = {
  pathname: string;
  initialSearch: string;
  initialLowStockOnly: boolean;
  initialTrackStockOnly: boolean;
};

export function ProductStockFilters({
  pathname,
  initialSearch,
  initialLowStockOnly,
  initialTrackStockOnly,
}: ProductStockFiltersProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [search, setSearch] = useState(initialSearch);
  const [lowStockOnly, setLowStockOnly] = useState(initialLowStockOnly);
  const [trackStockOnly, setTrackStockOnly] = useState(initialTrackStockOnly);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (deferredSearch === initialSearch) {
      return;
    }

    const timeout = window.setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [deferredSearch, initialSearch]);

  const queueSubmit = () => {
    window.setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 0);
  };

  return (
    <form
      ref={formRef}
      action={pathname}
      className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
      method="get"
    >
      <input
        type="text"
        name="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Pesquisar por nome, SKU, slug ou categoria"
        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
      />
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="trackStock"
          value="1"
          checked={trackStockOnly}
          onChange={(event) => {
            setTrackStockOnly(event.target.checked);
            if (!event.target.checked) {
              setLowStockOnly(false);
            }
            queueSubmit();
          }}
          className="h-4 w-4 rounded border-slate-300 text-slate-900"
        />
        Com estoque
      </label>
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="lowStock"
          value="1"
          checked={lowStockOnly}
          onChange={(event) => {
            const checked = event.target.checked;
            setLowStockOnly(checked);
            if (checked) {
              setTrackStockOnly(true);
            }
            queueSubmit();
          }}
          className="h-4 w-4 rounded border-slate-300 text-slate-900"
        />
        Estoque baixo
      </label>
      <button
        type="button"
        onClick={() => {
          setSearch("");
          setLowStockOnly(false);
          setTrackStockOnly(false);
          queueSubmit();
        }}
        className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
      >
        Limpar
      </button>
    </form>
  );
}
