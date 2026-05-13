import { ShieldCheck, Store } from "lucide-react";

import { LoginForm } from "@/app/login/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_28%),linear-gradient(180deg,#fff7ed_0%,#e2e8f0_100%)] px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="flex flex-col justify-between rounded-[36px] bg-slate-950 p-8 text-white shadow-[0_40px_120px_rgba(15,23,42,0.45)] lg:p-12">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-orange-300">
              Acesso seguro
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight lg:text-5xl">
              Entre no painel e mantenha sua operação organizada.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
              Ambiente protegido para acompanhar produtos, clientes, pedidos e relatórios
              com tranquilidade.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {[
              {
                icon: ShieldCheck,
                title: "Gestão central",
                text: "Controle lojas, acompanhe indicadores e mantenha tudo organizado.",
              },
              {
                icon: Store,
                title: "Painel da loja",
                text: "Atualize produtos, visual, estoque e atendimentos em poucos passos.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <item.icon className="size-8 text-orange-300" />
                <h2 className="mt-4 text-xl font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-card flex flex-col justify-center p-8 lg:p-10">
          <div className="max-w-md">
            <p className="text-sm uppercase tracking-[0.35em] text-orange-500">Acesso</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950">Acessar painel</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Informe seus dados para continuar.
            </p>
          </div>

          <LoginForm error={params.error} />
        </section>
      </div>
    </main>
  );
}
