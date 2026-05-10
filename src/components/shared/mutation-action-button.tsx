"use client";

import { useTransition } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { useNotify } from "@/components/shared/notify-provider";
import type { MutationActionResult } from "@/lib/product-action-results";

type MutationActionButtonProps = {
  action: () => Promise<MutationActionResult>;
  confirmMessage: string;
  idleLabel: string;
  pendingLabel: string;
  successTitle?: string;
  errorTitle?: string;
  tone?: "danger" | "neutral";
};

export function MutationActionButton({
  action,
  confirmMessage,
  idleLabel,
  pendingLabel,
  successTitle = "Acao concluida",
  errorTitle = "Nao foi possivel concluir",
  tone = "danger",
}: MutationActionButtonProps) {
  const router = useRouter();
  const notify = useNotify();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) {
          return;
        }

        startTransition(async () => {
          const result = await action();

          notify({
            tone: result.status === "success" ? "success" : "error",
            title: result.status === "success" ? successTitle : errorTitle,
            message: result.message,
          });

          if (result.status === "success") {
            router.refresh();
          }
        });
      }}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
        tone === "danger"
          ? "border-red-200 bg-white text-red-700 hover:bg-red-50"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      {isPending ? pendingLabel : idleLabel}
    </button>
  );
}
