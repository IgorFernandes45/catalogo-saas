"use client";

import { Building2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { ManualSaleForm } from "@/components/shared/manual-sale-form";

type ManualSaleCategory = {
  id: string;
  name: string;
};

type ManualSalePanelProps = {
  categories: ManualSaleCategory[];
};

export function ManualSalePanel({ categories }: ManualSalePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="surface-card p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
            Venda manual
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Registrar venda da loja fisica
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Deixe fechado quando nao estiver usando. Isso ajuda a tela de pedidos a abrir mais leve com muitos produtos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Building2 className="size-4" />
          {isOpen ? "Fechar venda manual" : "Abrir venda manual"}
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {isOpen ? (
        <div className="mt-6">
          <ManualSaleForm categories={categories} />
        </div>
      ) : null}
    </section>
  );
}
