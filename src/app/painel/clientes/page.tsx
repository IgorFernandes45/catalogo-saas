import { CustomerForm } from "@/components/shared/customer-form";
import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { requireSalesEnabledStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await requireSalesEnabledStoreUser();
  const query = await searchParams;
  const search = String(query.search ?? "").trim();
  const customers = await prisma.customer.findMany({
    where: {
      storeId: user.storeId!,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
              { document: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Clientes</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Base de clientes
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Cadastre clientes da loja. Apenas o nome e obrigatorio; o restante pode ser preenchido depois.
        </p>
        <div className="mt-6">
          <CustomerForm />
        </div>
      </section>

      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Lista</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Clientes cadastrados
        </h2>
        <form className="mt-6">
          <input
            name="search"
            defaultValue={search}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Buscar por nome, telefone, e-mail ou documento"
          />
        </form>

        <div className="mt-6 grid gap-3">
          {customers.map((customer) => (
            <article key={customer.id} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{customer.name}</p>
                  <p className="text-sm text-slate-500">
                    {[customer.phone, customer.email, customer.document].filter(Boolean).join(" - ") || "Sem contato informado"}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                  {formatDateTime(customer.createdAt)}
                </span>
              </div>
              {[customer.address, customer.number, customer.district, customer.city]
                .filter(Boolean)
                .length ? (
                <p className="mt-3 text-sm text-slate-600">
                  {[customer.address, customer.number, customer.district, customer.city]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : null}
              {customer.notes ? (
                <p className="mt-2 text-sm text-slate-500">Obs: {customer.notes}</p>
              ) : null}
            </article>
          ))}
          {!customers.length ? (
            <EmptyStateCard
              title="Nenhum cliente encontrado"
              description="Cadastre o primeiro cliente ou ajuste a busca."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
