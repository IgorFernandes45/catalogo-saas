"use client";

import { Boxes, Plus } from "lucide-react";
import { useState } from "react";

import { ProductAdminForm } from "@/components/shared/product-admin-form";
type CategoryOption = {
  id: string;
  name: string;
};

type ProductOperationsPanelProps = {
  categories: CategoryOption[];
  existingProducts?: Array<{
    id: string;
    name: string;
    categoryId: string;
    price: number;
    imageUrl?: string | null;
  }>;
  storeProfile?: string | null;
  productAttributesJson?: string | null;
  catalogUsesImages?: boolean;
  createAction: (formData: FormData) => Promise<{
    status: "idle" | "success" | "error";
    message: string;
    resetToken: number;
  }>;
};

export function ProductOperationsPanel({
  categories,
  existingProducts = [],
  storeProfile,
  productAttributesJson,
  catalogUsesImages = true,
  createAction,
}: ProductOperationsPanelProps) {
  const [activePanel, setActivePanel] = useState<"overview" | "create">("overview");

  return (
    <div className="mt-8 grid gap-5">
      <div className="grid gap-4 rounded-[28px] bg-slate-50 p-5">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setActivePanel("create")}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="size-4" />
            Novo produto
          </button>
          {activePanel === "create" ? (
            <button
              type="button"
              onClick={() => setActivePanel("overview")}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              <Boxes className="size-4" />
              Recolher
            </button>
          ) : null}
        </div>

        {activePanel === "overview" ? (
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-6 text-sm leading-7 text-slate-600">
            Abra apenas a acao que voce quer usar agora. Assim a tela de produtos fica mais leve
            mesmo quando a loja tiver muitos itens cadastrados.
          </div>
        ) : null}
      </div>

      {activePanel === "create" ? (
        <ProductAdminForm
          categories={categories}
          existingProducts={existingProducts}
          action={createAction}
          storeProfile={storeProfile}
          productAttributesJson={productAttributesJson}
          catalogUsesImages={catalogUsesImages}
        />
      ) : null}
    </div>
  );
}
