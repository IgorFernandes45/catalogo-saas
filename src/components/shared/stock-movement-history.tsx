"use client";

import { useState } from "react";

type StockMovementHistoryItem = {
  id: string;
  type: "MANUAL_DECREASE" | "MANUAL_INCREASE" | "ORDER_DECREASE" | "ORDER_RESTORE";
  variantLabelSnapshot?: string | null;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  notes: string | null;
  createdAt: string;
};

type StockMovementHistoryProps = {
  productId: string;
};

function getMovementLabel(movement: StockMovementHistoryItem) {
  if (movement.type === "MANUAL_DECREASE") {
    return `Baixa manual de ${movement.quantity}`;
  }

  if (movement.type === "MANUAL_INCREASE") {
    return `Reposição manual de ${movement.quantity}`;
  }

  if (movement.type === "ORDER_DECREASE") {
    return `Baixa por pedido de ${movement.quantity}`;
  }

  return `Reposição por cancelamento de ${movement.quantity}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StockMovementHistory({ productId }: StockMovementHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movements, setMovements] = useState<StockMovementHistoryItem[] | null>(null);

  async function toggleHistory() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (!nextOpen || movements) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/store/products/${productId}/stock-movements`, {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        movements?: StockMovementHistoryItem[];
      };

      if (!response.ok || !data.movements) {
        setError(data.error || "Não foi possível carregar o histórico.");
        return;
      }

      setMovements(data.movements);
    } catch {
      setError("Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={toggleHistory}
        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
      >
        {isOpen ? "Ocultar histórico" : "Ver histórico recente"}
      </button>

      {isOpen ? (
        <div className="mt-4 grid gap-2">
          {loading ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Carregando histórico...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : movements?.length ? (
            movements.map((movement) => (
              <div
                key={movement.id}
                className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{getMovementLabel(movement)}</p>
                  <span className="text-xs text-slate-500">
                    {formatDateTime(movement.createdAt)}
                  </span>
                </div>
                {movement.variantLabelSnapshot ? (
                  <p className="mt-1 text-xs text-slate-500">{movement.variantLabelSnapshot}</p>
                ) : null}
                <p className="mt-1 text-xs text-slate-500">
                  {movement.quantityBefore} {"->"} {movement.quantityAfter}
                </p>
                {movement.notes ? (
                  <p className="mt-1 text-xs text-slate-500">{movement.notes}</p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Nenhuma movimentação registrada ainda.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
