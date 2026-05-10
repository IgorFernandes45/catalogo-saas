import Link from "next/link";

import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { requireSalesEnabledStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

function paymentLabel(value: string | null) {
  const labels: Record<string, string> = {
    CASH: "Dinheiro",
    PIX: "Pix",
    DEBIT_CARD: "Cartao debito",
    CREDIT_CARD: "Cartao credito",
    BANK_TRANSFER: "Transferencia",
    OTHER: "Outro",
  };

  return value ? labels[value] || value : "Nao informado";
}

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const user = await requireSalesEnabledStoreUser();
  const query = await searchParams;
  const status = query.status === "CANCELLED" ? "CANCELLED" : "SOLD";
  const search = String(query.search ?? "").trim();
  const orders = await prisma.order.findMany({
    where: {
      storeId: user.storeId!,
      status,
      ...(search
        ? {
            OR: [
              { customerName: { contains: search, mode: "insensitive" as const } },
              { customerPhone: { contains: search, mode: "insensitive" as const } },
              {
                items: {
                  some: {
                    productNameSnapshot: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      items: {
        select: {
          id: true,
          productNameSnapshot: true,
          productVariantLabelSnapshot: true,
          quantity: true,
          unitPrice: true,
          profitSnapshot: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <section className="surface-card p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
            Historico
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Historico de vendas
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Consulte vendas finalizadas e cancelamentos fora da fila de pedidos pendentes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/painel/vendas?status=SOLD"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              status === "SOLD" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Vendidos
          </Link>
          <Link
            href="/painel/vendas?status=CANCELLED"
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              status === "CANCELLED" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            Cancelados
          </Link>
        </div>
      </div>

      <form className="mt-6">
        <input
          name="search"
          defaultValue={search}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Buscar por cliente, telefone ou produto"
        />
        <input type="hidden" name="status" value={status} />
      </form>

      <div className="mt-6 grid gap-4">
        {orders.map((order) => {
          const profit = order.items.reduce(
            (total, item) => total + Number(item.profitSnapshot || 0),
            0,
          );

          return (
            <article key={order.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-950">
                    {order.customerName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDateTime(order.createdAt)} - {paymentLabel(order.paymentMethod)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-950">
                    {formatCurrency(Number(order.subtotal))}
                  </p>
                  <p className="text-xs text-emerald-700">
                    Lucro {formatCurrency(profit)}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {item.quantity}x {item.productNameSnapshot}
                    </span>
                    {item.productVariantLabelSnapshot ? (
                      <span className="ml-2 text-slate-500">
                        {item.productVariantLabelSnapshot}
                      </span>
                    ) : null}
                    <span className="ml-2">{formatCurrency(Number(item.unitPrice))}</span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
        {!orders.length ? (
          <EmptyStateCard
            title="Sem historico neste filtro"
            description="Finalize pedidos ou registre vendas manuais para aparecerem aqui."
          />
        ) : null}
      </div>
    </section>
  );
}
