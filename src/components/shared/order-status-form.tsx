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
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<FormData | null>(null);

  function submitAction(formData: FormData) {
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
  }

  function handleConfirm() {
    if (pendingData) {
      submitAction(pendingData);
    }
    setConfirmMessage(null);
    setPendingData(null);
  }

  function handleDismiss() {
    setConfirmMessage(null);
    setPendingData(null);
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();

          if (!status) {
            notify({
              tone: "error",
              title: "Selecione um status",
              message: "Escolha se o pedido foi vendido ou cancelado antes de continuar.",
            });
            return;
          }

          const formData = new FormData();
          formData.set("orderId", orderId);
          formData.set("status", status);
          formData.set("paymentMethod", paymentMethod);

          if (status === "CANCELLED") {
            const message =
              initialStatus === "SOLD"
                ? "Cancelar este pedido vai repor o estoque relacionado. Deseja continuar?"
                : "Deseja cancelar este pedido pendente?";
            setPendingData(formData);
            setConfirmMessage(message);
            return;
          }

          submitAction(formData);
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

      {confirmMessage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={handleDismiss}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-semibold text-slate-950">Confirmar cancelamento</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{confirmMessage}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                Nao, voltar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Sim, cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
