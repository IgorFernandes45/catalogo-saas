"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Lock } from "lucide-react";

import { changePasswordAction } from "@/app/painel/actions";
import { useNotify } from "@/components/shared/notify-provider";

export function ChangePasswordForm() {
  const notify = useNotify();
  const [isPending, startTransition] = useTransition();
  const [resetKey, setResetKey] = useState(0);

  return (
    <form
      key={resetKey}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await changePasswordAction(formData);
          notify({
            tone: result.status === "success" ? "success" : "error",
            title: result.status === "success" ? "Senha alterada" : "Erro ao alterar senha",
            message: result.message,
          });
          if (result.status === "success") {
            setResetKey((k) => k + 1);
          }
        });
      }}
      className="mt-8 grid gap-5 border-t border-slate-100 pt-8"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Lock className="size-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-950">Alterar senha</p>
          <p className="text-xs text-slate-500">Informe a senha atual e defina a nova.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Senha atual
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            placeholder="••••••••"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Nova senha
          <input
            type="password"
            name="newPassword"
            required
            minLength={6}
            autoComplete="new-password"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            placeholder="••••••••"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Confirmar nova senha
          <input
            type="password"
            name="confirmPassword"
            required
            autoComplete="new-password"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            placeholder="••••••••"
          />
        </label>
      </div>

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {isPending ? "Alterando..." : "Alterar senha"}
        </button>
      </div>
    </form>
  );
}
