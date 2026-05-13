"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { createCustomerAction } from "@/app/painel/actions";
import { useNotify } from "@/components/shared/notify-provider";

export function CustomerForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const notify = useNotify();
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await createCustomerAction(formData);
          notify({
            tone: result.status === "success" ? "success" : "error",
            title: result.status === "success" ? "Cliente salvo" : "Falha ao salvar",
            message: result.message,
          });

          if (result.status === "success") {
            formRef.current?.reset();
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Nome
          <input
            required
            name="name"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Nome do cliente"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Telefone
          <input
            name="phone"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Opcional"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          E-mail
          <input
            type="email"
            name="email"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Opcional"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          CPF/CNPJ
          <input
            name="document"
            className="rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Opcional"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          Endereco
          <input name="address" className="rounded-2xl border border-slate-200 px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Número
          <input name="number" className="rounded-2xl border border-slate-200 px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Bairro
          <input name="district" className="rounded-2xl border border-slate-200 px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Cidade
          <input name="city" className="rounded-2xl border border-slate-200 px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Complemento
          <input name="complement" className="rounded-2xl border border-slate-200 px-4 py-3" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Referencia
        <input name="reference" className="rounded-2xl border border-slate-200 px-4 py-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Observacoes
        <textarea name="notes" rows={3} className="rounded-2xl border border-slate-200 px-4 py-3" />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isPending ? "Salvando..." : "Cadastrar cliente"}
      </button>
    </form>
  );
}
