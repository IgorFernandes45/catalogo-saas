"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { adjustProductStockAction } from "@/app/painel/actions";
import { useNotify } from "@/components/shared/notify-provider";
import { StockMovementHistory } from "@/components/shared/stock-movement-history";

type ProductStockAdjusterProps = {
  productId: string;
  productVariantId?: string;
  label?: string;
  currentStock: number;
};

export function ProductStockAdjuster({
  productId,
  productVariantId,
  label,
  currentStock,
}: ProductStockAdjusterProps) {
  const router = useRouter();
  const notify = useNotify();
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(String(currentStock));
  const [notes, setNotes] = useState("");

  async function submitMovement() {
    const formData = new FormData();
    formData.set("productId", productId);
    if (productVariantId) {
      formData.set("productVariantId", productVariantId);
    }
    formData.set("quantity", quantity);
    formData.set("notes", notes);
    formData.set("movementType", "STOCK_SET");

    startTransition(async () => {
      const result = await adjustProductStockAction(formData);
      notify({
        tone: result.status === "success" ? "success" : "error",
        title:
          result.status === "success"
            ? "Estoque atualizado"
            : "Falha ao mover estoque",
        message: result.message,
      });

      if (result.status === "success") {
        setNotes("");
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {label ? `Movimentar estoque da variacao` : "Movimentar estoque"}
          </p>
          <p className="text-sm text-slate-500">
            {label
              ? `${label}. Informe a quantidade atual desta opcao.`
              : "Informe a quantidade atual deste produto."}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          Atual: {currentStock}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[140px_1fr_auto]">
        <input
          type="number"
          min={0}
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <input
          type="text"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Motivo da movimentacao"
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={submitMovement}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          Salvar estoque
        </button>
      </div>

      <StockMovementHistory productId={productId} />
    </div>
  );
}
