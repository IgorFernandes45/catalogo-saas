import Link from "next/link";

import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { ExportCsvButton } from "@/components/shared/export-csv-button";
import { ReportFiltersForm } from "@/components/shared/report-filters-form";
import { SalesBarChart } from "@/components/shared/sales-bar-chart";
import { StatCard } from "@/components/shared/stat-card";
import { requireSalesEnabledStoreUser } from "@/lib/auth";
import {
  getStoreReportFilterOptions,
  getStoreReportSelectedProduct,
  getStoreSalesReport,
} from "@/lib/queries";
import { formatCurrency } from "@/lib/utils";

function paymentLabel(value: string) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    PIX: "Pix",
    DEBIT_CARD: "Cartao debito",
    CREDIT_CARD: "Cartao credito",
    BANK_TRANSFER: "Transferencia",
    OTHER: "Outro",
  };

  return labels[value] || value;
}

function buildSalesReportHref(filters: {
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
  return query ? `/painel/relatorios?${query}` : "/painel/relatorios";
}

export default async function SalesReportsPage({
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
    getStoreSalesReport(user.storeId!, {
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
              Relatorio de vendas
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Veja somente faturamento, itens vendidos e desempenho por produto.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildSalesReportHref(report.filters)}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Vendas
            </Link>
            <Link
              href={`/painel/relatorios/estoque${
                buildSalesReportHref(report.filters).replace("/painel/relatorios", "")
              }`}
              className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Estoque
            </Link>
          </div>
        </div>

        <ReportFiltersForm
          pathname="/painel/relatorios"
          categories={filterOptions.categories}
          initialDateFrom={report.filters.dateFrom}
          initialDateTo={report.filters.dateTo}
          initialCategoryId={report.filters.categoryId}
          initialProductId={report.filters.productId}
          selectedProduct={selectedProduct}
        />

        <div className="mt-6 flex justify-end">
          <ExportCsvButton
            filename={`relatorio-vendas-${report.filters.dateFrom ?? "tudo"}.csv`}
            rows={report.topProducts.map((p) => ({
              Produto: p.productName,
              Quantidade: p.quantity,
              Receita: formatCurrency(p.revenue),
              Lucro: formatCurrency(p.profit),
            }))}
          />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Faturamento" value={formatCurrency(report.totalRevenue)} />
          <StatCard label="Lucro bruto" value={formatCurrency(report.totalProfit)} />
          <StatCard label="Custo vendido" value={formatCurrency(report.totalCost)} />
          <StatCard label="Margem real" value={`${report.profitMarginPercent.toFixed(1)}%`} />
          <StatCard label="Vendas" value={report.soldOrdersCount} />
          <StatCard label="Itens vendidos" value={report.totalItemsSold} />
          <StatCard label="Ticket medio" value={formatCurrency(report.averageTicket)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="surface-card p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
            Produtos mais vendidos
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Ranking por receita e quantidade
          </h2>
          <div className="mt-6 grid gap-3">
            {report.topProducts.length ? (
              report.topProducts.map((product, index) => (
                <article
                  key={`${product.productName}-${index}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        #{index + 1} {product.productName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {product.quantity} unidades vendidas - lucro {formatCurrency(product.profit)}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyStateCard
                title="Sem vendas neste filtro"
                description="Ajuste as datas, categoria ou produto para localizar as vendas que voce quer analisar."
              />
            )}
          </div>
        </div>

        <div className="surface-card p-6">
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
            Evolucao das vendas
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Dias com faturamento
          </h2>
          {report.salesByDay.length ? (
            <SalesBarChart data={report.salesByDay} />
          ) : null}
          <div className="mt-6 grid gap-3">
            {report.salesByDay.length ? (
              report.salesByDay.map((day) => (
                <article
                  key={`${day.label}-${day.orders}`}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{day.label}</p>
                      <p className="text-sm text-slate-500">{day.orders} vendas</p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                      {formatCurrency(day.revenue)}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <EmptyStateCard
                title="Sem serie diaria"
                description="Quando houver vendas no intervalo filtrado, esta area vai mostrar o faturamento dia a dia."
              />
            )}
          </div>
        </div>
      </section>

      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
          Variacoes mais vendidas
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Ranking por cor, tamanho, sabor ou volume
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {report.topVariations.length ? (
            report.topVariations.map((variation, index) => (
              <article
                key={`${variation.productName}-${variation.variationName}-${index}`}
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <p className="font-semibold text-slate-950">
                  #{index + 1} {variation.productName}
                </p>
                <p className="mt-1 text-sm text-slate-500">{variation.variationName}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-slate-200 px-3 py-1">
                    {variation.quantity} unidade{variation.quantity === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    {formatCurrency(variation.revenue)}
                  </span>
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                    Lucro {formatCurrency(variation.profit)}
                  </span>
                </div>
              </article>
            ))
          ) : (
            <EmptyStateCard
              title="Sem vendas por variacao"
              description="Quando vender produtos com variacoes, o ranking aparece aqui."
            />
          )}
        </div>
      </section>

      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
          Pagamentos
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Vendas por forma de pagamento
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {report.paymentBreakdown.length ? (
            report.paymentBreakdown.map((payment) => (
              <article
                key={payment.label}
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <p className="font-semibold text-slate-950">
                  {paymentLabel(payment.label)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {payment.orders} venda{payment.orders === 1 ? "" : "s"}
                </p>
                <p className="mt-3 text-lg font-semibold text-slate-950">
                  {formatCurrency(payment.revenue)}
                </p>
              </article>
            ))
          ) : (
            <EmptyStateCard
              title="Sem pagamentos no filtro"
              description="Quando as vendas tiverem forma de pagamento, este resumo aparece aqui."
            />
          )}
        </div>
      </section>
    </div>
  );
}
