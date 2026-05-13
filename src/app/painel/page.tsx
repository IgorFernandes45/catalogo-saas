import Link from "next/link";

import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { StatCard } from "@/components/shared/stat-card";
import { requireStoreUser, storeHasSales } from "@/lib/auth";
import { getStoreDashboard } from "@/lib/queries";

const ONBOARDING_STEPS = [
  {
    key: "hasLogo" as const,
    label: "Logo da loja enviada",
    href: "/painel/perfil",
    action: "Fazer upload",
  },
  {
    key: "hasCategory" as const,
    label: "Primeira categoria criada",
    href: "/painel/categorias",
    action: "Criar categoria",
  },
  {
    key: "hasProduct" as const,
    label: "Primeiro produto cadastrado",
    href: "/painel/produtos",
    action: "Cadastrar produto",
  },
  {
    key: "agentEnabled" as const,
    label: "Agente IA habilitado",
    href: "/painel/agente",
    action: "Ver agente",
  },
  {
    key: "whatsappConfigured" as const,
    label: "WhatsApp configurado pelo admin",
    href: "/painel/agente",
    action: "Ver conexão",
  },
];

export default async function StoreDashboardPage() {
  const user = await requireStoreUser();
  const dashboard = await getStoreDashboard(user.storeId!);
  const salesEnabled = storeHasSales(user.store?.accessMode);

  const completedSteps = Object.values(dashboard.onboarding).filter(Boolean).length;
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div className="grid gap-6">
      {/* Onboarding checklist */}
      {!dashboard.onboardingDone && (
        <section className="surface-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Primeiros passos</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">
                Configure sua loja — {completedSteps}/{totalSteps} concluídos
              </h2>
            </div>
            <span className="shrink-0 text-2xl font-bold text-orange-500">{progressPct}%</span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ONBOARDING_STEPS.map((step) => {
              const done = dashboard.onboarding[step.key];
              return (
                <Link
                  key={step.key}
                  href={done ? "#" : step.href}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                    done
                      ? "pointer-events-none border-green-100 bg-green-50"
                      : "border-slate-200 bg-slate-50 hover:border-orange-200 hover:bg-orange-50"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      done ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {done ? "✓" : "→"}
                  </span>
                  <span className={done ? "text-green-700 line-through" : "text-slate-700"}>
                    {step.label}
                  </span>
                  {!done && (
                    <span className="ml-auto shrink-0 text-xs font-medium text-orange-500">
                      {step.action}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Pending orders alert */}
      {salesEnabled && dashboard.pendingOrders > 0 && (
        <Link
          href="/painel/pedidos"
          className="flex items-center justify-between gap-4 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 transition hover:border-amber-300"
        >
          <div>
            <p className="font-semibold text-amber-800">
              {dashboard.pendingOrders} pedido{dashboard.pendingOrders !== 1 ? "s" : ""} aguardando confirmação
            </p>
            <p className="mt-0.5 text-sm text-amber-700">Clique para ver a fila de pedidos pendentes</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-xl font-bold text-white">
            {dashboard.pendingOrders}
          </span>
        </Link>
      )}

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
          <StatCard label="Modo" value="Catálogo" />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-card p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Atalhos</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Gestão rápida do catálogo
          </h2>
          <div className="mt-6 grid gap-3">
            {[
              { href: "/painel/perfil", label: "Editar identidade visual e dados da loja" },
              { href: "/painel/categorias", label: "Criar categorias e atributos dinâmicos" },
              { href: "/painel/produtos", label: "Cadastrar produtos" },
              { href: "/painel/estoque", label: "Produtos cadastrados e estoque" },
              ...(salesEnabled
                ? [
                    { href: "/painel/pedidos", label: "Organizar fila de pedidos e registrar venda manual" },
                    { href: "/painel/relatorios", label: "Abrir relatório de vendas" },
                    { href: "/painel/relatorios/estoque", label: "Abrir relatório de estoque" },
                  ]
                : []),
              { href: "/painel/agente", label: "Configurar agente IA do WhatsApp" },
              { href: "/painel/agente/conversas", label: "Ver conversas do agente" },
              { href: `/loja/${user.store?.slug}`, label: "Abrir catálogo público da loja", target: "_blank" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target={"target" in item ? item.target : undefined}
                rel={"target" in item ? "noopener noreferrer" : undefined}
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
            Produtos que merecem atenção
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
                        ? `${product.variants.length} variação(ões) baixa(s)`
                        : `${product.stockQuantity ?? 0} unidades`}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyStateCard
                title="Tudo em ordem no estoque"
                description="Nenhum produto da sua loja está com alerta de estoque baixo no momento."
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
