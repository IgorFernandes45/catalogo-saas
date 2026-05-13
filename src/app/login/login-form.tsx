"use client";

import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";

import { loginAction } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Entrando..." : "Continuar"}
      {!pending ? <ArrowRight className="size-4" /> : null}
    </button>
  );
}

export function LoginForm({ error }: { error?: string }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form action={loginAction} className="mt-8 grid gap-5">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          E-mail
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950"
            placeholder="voce@exemplo.com.br"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Senha
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-950"
              placeholder="Sua senha"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 transition hover:text-slate-700"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>
        <SubmitButton />
      </form>
    </>
  );
}
