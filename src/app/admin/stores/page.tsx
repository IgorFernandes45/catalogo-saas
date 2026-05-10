import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const stores = await prisma.store.findMany({
    include: {
      users: {
        where: { role: "STORE_ADMIN" },
        take: 1,
      },
      _count: {
        select: {
          categories: true,
          products: true,
          orders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="surface-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Lojas</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Gerencie todas as lojas
          </h1>
        </div>
        <Link
          href="/admin/stores/new"
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Nova loja
        </Link>
      </div>

      {params.success ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {params.success}
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead>
            <tr className="text-sm uppercase tracking-[0.2em] text-slate-500">
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Gestor</th>
              <th className="px-4 py-3">Metricas</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Criada</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stores.map((store) => (
              <tr key={store.id} className="align-top text-sm text-slate-600">
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-950">{store.name}</p>
                  <p>/{store.slug}</p>
                  <p className="mt-2">{store.whatsappNumber}</p>
                  <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {store.accessMode === "CATALOG_ONLY"
                      ? "Somente catalogo"
                      : "Catalogo + vendas"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <p className="font-medium text-slate-900">
                    {store.users[0]?.name || "Sem gestor"}
                  </p>
                  <p>{store.users[0]?.email || "-"}</p>
                </td>
                <td className="px-4 py-4">
                  <p>{store._count.categories} categorias</p>
                  <p>{store._count.products} produtos</p>
                  <p>{store._count.orders} pedidos</p>
                </td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${store.status ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}
                  >
                    {store.status ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-4">{formatDateTime(store.createdAt)}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/admin/stores/${store.id}/edit`}
                      className="font-semibold text-orange-600"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/loja/${store.slug}`}
                      className="font-semibold text-slate-700"
                    >
                      Abrir catalogo
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
