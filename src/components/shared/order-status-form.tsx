"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { updateOrderStatusAction } from "@/app/painel/actions";
import { useNotify } from "@/components/shared/notify-provider";

type OrderStatusFormProps = {
  orderId: string;
  initialStatus: "PENDING" | "SOLD" | "CANCELLED";
  initialPaymentMethod?: string | null;
};

export function OrderStatusForm({
  orderId,
  initialStatus,
  initialPaymentMethod,
}: OrderStatusFormProps) {
  const router = useRouter();
  const notify = useNotify();
  const [status, setStatus] = useState<"" | "SOLD" | "CANCELLED">(
    initialStatus === "PENDING" ? "" : initialStatus,
  );
  const [paymentMethod, setPaymentMethod] = useState(initialPaymentMethod || "PIX");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.set("orderId", orderId);
        formData.set("status", status);
        formData.set("paymentMethod", paymentMethod);

        if (!status) {
          notify({
            tone: "error",
            title: "Selecione um status",
            message: "Escolha se o pedido foi vendido ou cancelado antes de continuar.",
          });
          return;
        }

        if (
          status === "CANCELLED" &&
          !window.confirm(
            initialStatus === "SOLD"
              ? "Cancelar este pedido vai repor o estoque relacionado. Deseja continuar?"
              : "Deseja cancelar este pedido pendente?",
          )
        ) {
          return;
        }

        startTransition(async () => {
          const result = await updateOrderStatusAction(formData);
          notify({
            tone: result.status === "success" ? "success" : "error",
            title:
              result.status === "success"
                ? "Pedido atualizado"
                : "Nao foi possivel atualizar o pedido",
            message: result.message,
          });

          if (result.status === "success") {
            router.refresh();
          }
        });
      }}
      className="flex flex-wrap items-center gap-3"
    >
      <select
        name="status"
        value={status}
        onChange={(event) =>
          setStatus(event.target.value as "" | "SOLD" | "CANCELLED")
        }
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
      >
        <option value="" disabled>
          Selecionar status
        </option>
        <option value="SOLD">VENDIDO</option>
        <option value="CANCELLED">CANCELADO</option>
      </select>
      {status === "SOLD" ? (
        <select
          name="paymentMethod"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm"
        >
          <option value="PIX">Pix</option>
          <option value="CASH">Dinheiro</option>
          <option value="DEBIT_CARD">Cartao debito</option>
          <option value="CREDIT_CARD">Cartao credito</option>
          <option value="BANK_TRANSFER">Transferencia</option>
          <option value="OTHER">Outro</option>
        </select>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isPending ? "Atualizando..." : "Atualizar"}
      </button>
    </form>
  );
}
