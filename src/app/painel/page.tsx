import Link from "next/link";

import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { StatCard } from "@/components/shared/stat-card";
import { requireStoreUser, storeHasSales } from "@/lib/auth";
import { getStoreDashboard } from "@/lib/queries";

export default async function StoreDashboardPage() {
  const user = await requireStoreUser();
  const dashboard = await getStoreDashboard(user.storeId!);
  const salesEnabled = storeHasSales(user.store?.accessMode);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Produtos" value={dashboard.productCount} />
        <StatCard label="Categorias" value={dashboard.categoryCount} />
        <StatCard label="Produtos ativos" value={dashboard.activeProducts} />
        {salesEnabled ? (
          <>
            <StatCard label="Vendas" value={dashboard.soldOrders} />
            <StatCard
              label="Faturamento"
              value={new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(dashboard.totalRevenue)}
            />
          </>
        ) : (
          <StatCard label="Modo" value="Catalogo" />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-card p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Atalhos</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Gestao rapida do catalogo
          </h2>
          <div className="mt-6 grid gap-3">
            {[
              { href: "/painel/perfil", label: "Editar identidade visual e dados da loja" },
              { href: "/painel/categorias", label: "Criar categorias e atributos dinamicos" },
              { href: "/painel/produtos", label: "Cadastrar produtos" },
              { href: "/painel/estoque", label: "Produtos cadastrados e estoque" },
              ...(salesEnabled
                ? [
                    { href: "/painel/pedidos", label: "Organizar fila de pedidos e registrar venda manual" },
                    { href: "/painel/relatorios", label: "Abrir relatorio de vendas" },
                    { href: "/painel/relatorios/estoque", label: "Abrir relatorio de estoque" },
                  ]
                : []),
              { href: `/loja/${user.store?.slug}`, label: "Abrir catalogo publico da loja" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-orange-300 hover:text-orange-600"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="surface-card p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
            Estoque baixo
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Produtos que merecem atencao
          </h2>
          <div className="mt-6 grid gap-3">
            {dashboard.lowStockProducts.length ? (
              dashboard.lowStockProducts.map((product) => (
                <article
                  key={product.id}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{product.name}</p>
                      <p className="text-sm text-slate-500">
                        {product.variants.length
                          ? product.variants
                              .map((variant) => `${variant.label} (${variant.stockQuantity})`)
                              .join(" • ")
                          : product.sku || product.slug}
                      </p>
                    </div>
                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                      {product.variants.length
                        ? `${product.variants.length} variacao(oes) baixa(s)`
                        : `${product.stockQuantity ?? 0} unidades`}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyStateCard
                title="Tudo em ordem no estoque"
                description="Nenhum produto da sua loja esta com alerta de estoque baixo no momento."
                actionHref="/painel/estoque?trackStock=1"
                actionLabel="Revisar estoque"
              />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
