import Link from "next/link";

import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { ReportFiltersForm } from "@/components/shared/report-filters-form";
import { StatCard } from "@/components/shared/stat-card";
import { requireSalesEnabledStoreUser } from "@/lib/auth";
import {
  getStoreReportFilterOptions,
  getStoreReportSelectedProduct,
  getStoreStockReport,
} from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

function getMovementTypeLabel(type: string) {
  if (type === "MANUAL_DECREASE") {
    return "Remocao manual";
  }

  if (type === "MANUAL_INCREASE") {
    return "Adicao manual";
  }

  if (type === "ORDER_DECREASE") {
    return "Baixa por venda";
  }

  return "Reposicao por cancelamento";
}

function buildStockReportHref(filters: {
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
  productId?: string;
}) {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }
  if (filters.categoryId && filters.categoryId !== "all") {
    params.set("categoryId", filters.categoryId);
  }
  if (filters.productId && filters.productId !== "all") {
    params.set("productId", filters.productId);
  }

  const query = params.toString();
  return query ? `/painel/relatorios/estoque?${query}` : "/painel/relatorios/estoque";
}

export default async function StockReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    productId?: string;
    categoryId?: string;
  }>;
}) {
  const user = await requireSalesEnabledStoreUser();
  const query = await searchParams;
  const [filterOptions, selectedProduct, report] = await Promise.all([
    getStoreReportFilterOptions(user.storeId!),
    getStoreReportSelectedProduct(user.storeId!, query.productId),
    getStoreStockReport(user.storeId!, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      productId: query.productId,
      categoryId: query.categoryId,
    }),
  ]);

  return (
    <div className="grid gap-6">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Relatorios</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              Relatorio de estoque
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Veja entradas, remocoes manuais, baixas por venda e reposicoes por cancelamento.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/painel/relatorios${
                buildStockReportHref(report.filters).replace("/painel/relatorios/estoque", "")
              }`}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Vendas
            </Link>
            <Link
              href={buildStockReportHref(report.filters)}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Estoque
            </Link>
          </div>
        </div>

        <ReportFiltersForm
          pathname="/painel/relatorios/estoque"
          categories={filterOptions.categories}
          initialDateFrom={report.filters.dateFrom}
          initialDateTo={report.filters.dateTo}
          initialCategoryId={report.filters.categoryId}
          initialProductId={report.filters.productId}
          selectedProduct={selectedProduct}
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Baixas por venda" value={report.orderDecreaseUnits} hint={`${report.orderDecreaseCount} movimentacoes`} />
          <StatCard label="Remocoes manuais" value={report.manualDecreaseUnits} hint={`${report.manualDecreaseCount} movimentacoes`} />
          <StatCard label="Adicoes manuais" value={report.manualIncreaseUnits} hint={`${report.manualIncreaseCount} movimentacoes`} />
          <StatCard label="Reposicoes por cancelamento" value={report.orderRestoreUnits} hint={`${report.orderRestoreCount} movimentacoes`} />
        </div>
      </section>

      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
          Movimentacoes recentes
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Historico detalhado do estoque
        </h2>
        <div className="mt-6 grid gap-3">
          {report.movements.length ? (
            report.movements.map((movement) => (
              <article
                key={movement.id}
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{movement.productName}</p>
                    <p className="text-sm text-slate-500">
                      {movement.categoryName} - {formatDateTime(movement.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      movement.type === "MANUAL_DECREASE" || movement.type === "ORDER_DECREASE"
                        ? "bg-red-100 text-red-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {getMovementTypeLabel(movement.type)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  {movement.quantityBefore} {"->"} {movement.quantityAfter} ({movement.quantity} un.)
                </p>
                {movement.notes ? (
                  <p className="mt-1 text-sm text-slate-500">{movement.notes}</p>
                ) : null}
              </article>
            ))
          ) : (
            <EmptyStateCard
              title="Sem movimentacoes neste filtro"
              description="Ajuste as datas, categoria ou produto para localizar as movimentacoes do estoque."
            />
          )}
        </div>
      </section>
    </div>
  );
}
