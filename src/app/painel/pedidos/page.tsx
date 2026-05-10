import Link from "next/link";

import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { ManualSalePanel } from "@/components/shared/manual-sale-panel";
import { OrderStatusForm } from "@/components/shared/order-status-form";
import { requireSalesEnabledStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, safeJsonParse } from "@/lib/utils";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    page?: string;
  }>;
}) {
  const query = await searchParams;
  const user = await requireSalesEnabledStoreUser();
  const search = String(query.search ?? "").trim();
  const currentPage =
    Number.isInteger(Number(query.page)) && Number(query.page) > 0
      ? Number(query.page)
      : 1;
  const pageSize = 12;
  const where = {
    storeId: user.storeId!,
    status: "PENDING" as const,
    ...(search
      ? {
          OR: [
            {
              customerName: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              customerPhone: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
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
  };

  const [totalOrders, orders, categories] = await Promise.all([
    prisma.order.count({
      where,
    }),
    prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            quantity: true,
            productNameSnapshot: true,
            unitPrice: true,
            attributesSnapshotJson: true,
          },
        },
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where: {
        storeId: user.storeId!,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));

  function buildOrdersPageHref(page: number) {
    const params = new URLSearchParams();

    if (search) {
      params.set("search", search);
    }
    if (page > 1) {
      params.set("page", String(page));
    }

    const queryString = params.toString();
    return queryString ? `/painel/pedidos?${queryString}` : "/painel/pedidos";
  }

  return (
    <div className="grid gap-6">
      <ManualSalePanel categories={categories} />
      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Pedidos</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Fila de pedidos pendentes
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Aqui ficam apenas os pedidos que ainda precisam ser marcados como vendidos ou cancelados. Depois de finalizar, eles saem da fila.
        </p>

        <form className="mt-6 grid gap-3 rounded-[24px] bg-slate-50 p-4 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Buscar por cliente, telefone ou produto"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Filtrar fila
            </button>
            <Link
              href="/painel/pedidos"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Limpar
            </Link>
          </div>
        </form>

        <p className="mt-4 text-sm text-slate-500">
          Mostrando {orders.length} pedido{orders.length === 1 ? "" : "s"} pendente{orders.length === 1 ? "" : "s"} nesta pagina, de um total de {totalOrders}.
        </p>

        <div className="mt-6 grid gap-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{order.customerName}</p>
                  <p className="text-sm text-slate-500">
                    {order.customerPhone} - {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  PENDENTE
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {order.deliveryAddress === "Nao informado"
                  ? "Endereco nao informado pelo cliente."
                  : `${order.deliveryAddress}, ${order.deliveryNumber || "s/n"}, ${order.deliveryDistrict}, ${order.deliveryCity}`}
              </p>
              {order.deliveryComplement ? (
                <p className="text-sm text-slate-500">Complemento: {order.deliveryComplement}</p>
              ) : null}
              {order.deliveryReference ? (
                <p className="text-sm text-slate-500">Referencia: {order.deliveryReference}</p>
              ) : null}
              {order.notes ? (
                <p className="mt-2 text-sm text-slate-600">Obs: {order.notes}</p>
              ) : null}

              <div className="mt-4 grid gap-2">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      {item.quantity}x {item.productNameSnapshot}
                    </p>
                    <p>{formatCurrency(Number(item.unitPrice))}</p>
                    {item.attributesSnapshotJson ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {safeJsonParse<string[]>(item.attributesSnapshotJson, []).join(" - ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-lg font-semibold text-slate-950">
                  Subtotal: {formatCurrency(Number(order.subtotal))}
                </p>
                <OrderStatusForm
                  orderId={order.id}
                  initialStatus={order.status}
                  initialPaymentMethod={order.paymentMethod}
                />
              </div>
            </article>
          ))}
          {!orders.length ? (
            <EmptyStateCard
              title="Nenhum pedido pendente na fila"
              description="Quando os clientes enviarem pedidos pelo catalogo, eles vao aparecer aqui ate voce marcar como vendido ou cancelado."
              actionHref={`/loja/${user.store?.slug}`}
              actionLabel="Abrir catalogo da loja"
            />
          ) : null}
        </div>

        {totalOrders > pageSize ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-sm text-slate-500">
              Pagina {currentPage} de {totalPages}
            </p>
            <div className="flex gap-3">
              <Link
                href={buildOrdersPageHref(Math.max(1, currentPage - 1))}
                aria-disabled={currentPage <= 1}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  currentPage <= 1
                    ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                Anterior
              </Link>
              <Link
                href={buildOrdersPageHref(Math.min(totalPages, currentPage + 1))}
                aria-disabled={currentPage >= totalPages}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  currentPage >= totalPages
                    ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400"
                    : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                Proxima
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
