import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShoppingBag, Store } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.12),_transparent_22%),linear-gradient(180deg,#fff7ed_0%,#e2e8f0_100%)] px-4 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-10">
        <section className="overflow-hidden rounded-[40px] bg-slate-950 p-8 text-white shadow-[0_40px_120px_rgba(15,23,42,0.45)] lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-orange-300">
                Catálogo comercial premium
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight lg:text-6xl">
                Sua vitrine online pronta para atender clientes com rapidez e elegância.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Organize produtos, apresente ofertas e receba pedidos pelo WhatsApp em uma
                experiência simples para a loja e agradável para o cliente.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
                >
                  Acessar painel
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-orange-300 hover:text-orange-200"
                >
                  Ver demonstração
                  <ShoppingBag className="size-4" />
                </Link>
              </div>
            </div>

            <div className="grid gap-4 rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="rounded-3xl bg-white/8 p-5">
                <p className="text-sm text-slate-300">Gestão centralizada</p>
                <p className="mt-2 text-lg font-semibold">Lojas, produtos e relatórios</p>
                <p className="text-sm text-orange-200">Tudo em um painel claro</p>
              </div>
              <div className="rounded-3xl bg-white/8 p-5">
                <p className="text-sm text-slate-300">Catálogos por perfil</p>
                <p className="mt-2 text-lg font-semibold">Moda, beleza, bebidas e mais</p>
                <p className="text-sm text-emerald-200">Campos adaptados para cada loja</p>
              </div>
              <div className="rounded-3xl bg-white/8 p-5">
                <p className="text-sm text-slate-300">Atendimento direto</p>
                <p className="mt-2 text-lg font-semibold">Compra pelo WhatsApp</p>
                <p className="text-sm text-slate-300">Carrinho, variações e pedido formatado</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Store,
              title: "Multi-tenant real",
              description:
                "Cada loja trabalha no próprio ambiente, com dados separados e acesso seguro.",
            },
            {
              icon: LayoutDashboard,
              title: "Operação simplificada",
              description:
                "Cadastro rápido, catálogo personalizável e rotina diária mais objetiva.",
            },
            {
              icon: ShoppingBag,
              title: "Venda rápida",
              description:
                "O cliente escolhe, monta o pedido e chama a loja pelo WhatsApp em poucos toques.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-[30px] bg-white p-6 shadow-[0_25px_60px_rgba(15,23,42,0.08)]"
            >
              <item.icon className="size-10 text-orange-500" />
              <h2 className="mt-5 text-2xl font-semibold text-slate-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
