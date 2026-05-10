import Link from "next/link";

import { StatCard } from "@/components/shared/stat-card";
import { getAdminDashboard } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total de lojas" value={dashboard.totalStores} />
        <StatCard label="Lojas ativas" value={dashboard.activeStores} />
        <StatCard label="Produtos" value={dashboard.totalProducts} />
        <StatCard label="Categorias" value={dashboard.totalCategories} />
        <StatCard label="Vendas" value={dashboard.soldOrders} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
                Operacao
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Lojas recentes
              </h2>
            </div>
            <Link
              href="/admin/stores/new"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Criar nova loja
            </Link>
          </div>
          <div className="mt-6 grid gap-4">
            {dashboard.recentStores.map((store) => (
              <article
                key={store.id}
                className="rounded-[28px] border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">{store.name}</p>
                    <p className="text-sm text-slate-500">/{store.slug}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${store.status ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {store.status ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Criada em {formatDateTime(store.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
            Checklist do MVP
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            O que ja esta pronto
          </h2>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            {[
              "Autenticacao com sessao em cookie assinado",
              "Separacao entre super admin e usuarios da loja",
              "Cadastro de lojas com identidade visual",
              "Categorias dinamicas com atributos extras",
              "Produtos com estoque, destaque e campos herdados da categoria",
              "Catalogo publico com carrinho e checkout",
              "Pedido salvo no banco e enviado para o WhatsApp",
            ].map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
