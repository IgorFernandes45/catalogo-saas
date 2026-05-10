import { notFound } from "next/navigation";

import { updateStoreAction } from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";

export default async function EditStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      users: {
        where: { role: "STORE_ADMIN" },
        take: 1,
      },
    },
  });

  if (!store) {
    notFound();
  }

  return (
    <div className="surface-card p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Editar loja</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">{store.name}</h1>
      </div>

      {query.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {query.error}
        </div>
      ) : null}

      {query.success ? (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {query.success}
        </div>
      ) : null}

      <form action={updateStoreAction} className="mt-8 grid gap-8">
        <input type="hidden" name="storeId" value={store.id} />

        <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
          <label
            className={`grid cursor-pointer gap-2 rounded-[24px] border p-5 ${
              store.accessMode !== "CATALOG_ONLY"
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span className="text-sm font-semibold">Catálogo + vendas</span>
            <span className="text-sm leading-6 opacity-80">
              Libera pedidos, vendas, clientes, estoque e relatórios.
            </span>
            <input
              type="radio"
              name="accessMode"
              value="FULL"
              defaultChecked={store.accessMode !== "CATALOG_ONLY"}
              className="mt-2 size-4"
            />
          </label>
          <label
            className={`grid cursor-pointer gap-2 rounded-[24px] border p-5 ${
              store.accessMode === "CATALOG_ONLY"
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            <span className="text-sm font-semibold">Somente catálogo</span>
            <span className="text-sm leading-6 opacity-80">
              Mantém só perfil/aparência, categorias, produtos e catálogo público.
            </span>
            <input
              type="radio"
              name="accessMode"
              value="CATALOG_ONLY"
              defaultChecked={store.accessMode === "CATALOG_ONLY"}
              className="mt-2 size-4"
            />
          </label>
        </section>

        <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:grid-cols-2">
          <label
            className={`grid cursor-pointer gap-2 rounded-[24px] border p-5 ${
              store.catalogUsesImages
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <span className="text-sm font-semibold">Catalogo com fotos</span>
            <span className="text-sm leading-6 opacity-80">
              Exibe imagens nos produtos e permite fotos no painel da loja.
            </span>
            <input
              type="radio"
              name="catalogUsesImages"
              value="on"
              defaultChecked={store.catalogUsesImages}
              className="mt-2 size-4"
            />
          </label>
          <label
            className={`grid cursor-pointer gap-2 rounded-[24px] border p-5 ${
              !store.catalogUsesImages
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <span className="text-sm font-semibold">Catalogo sem fotos</span>
            <span className="text-sm leading-6 opacity-80">
              Mostra cards compactos apenas com textos, valores e botoes de contato.
            </span>
            <input
              type="radio"
              name="catalogUsesImages"
              value=""
              defaultChecked={!store.catalogUsesImages}
              className="mt-2 size-4"
            />
          </label>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Nome da loja
            <input required name="name" defaultValue={store.name} className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Slug publico
            <input required name="slug" defaultValue={store.slug} className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
            Descricao
            <textarea name="description" rows={4} defaultValue={store.description || ""} className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            WhatsApp da loja
            <input required name="whatsappNumber" defaultValue={store.whatsappNumber} className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            E-mail da loja
            <input type="email" name="email" defaultValue={store.email || ""} className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Telefone
            <input name="phone" defaultValue={store.phone || ""} className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Endereco
            <input name="address" defaultValue={store.address || ""} className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <input type="hidden" name="logoUrl" value={store.logoUrl || ""} />
          <input type="hidden" name="bannerUrl" value={store.bannerUrl || ""} />
        </section>

        <section className="grid gap-5 lg:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cor principal
            <input type="color" name="primaryColor" defaultValue={store.primaryColor} className="h-12 rounded-2xl border border-slate-200 px-2 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cor secundaria
            <input type="color" name="secondaryColor" defaultValue={store.secondaryColor} className="h-12 rounded-2xl border border-slate-200 px-2 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cor destaque
            <input type="color" name="accentColor" defaultValue={store.accentColor} className="h-12 rounded-2xl border border-slate-200 px-2 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tema
            <select name="themeMode" defaultValue={store.themeMode} className="rounded-2xl border border-slate-200 px-4 py-3">
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </label>
        </section>

        <div className="rounded-[28px] bg-slate-50 p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Gestor principal</p>
          <p className="mt-2">{store.users[0]?.name || "Nao cadastrado"}</p>
          <p>{store.users[0]?.email || "-"}</p>
        </div>

        <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
          <input type="checkbox" name="status" defaultChecked={store.status} className="size-4 rounded border-slate-300" />
          Loja ativa
        </label>

        <button
          type="submit"
          className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Salvar alteracoes
        </button>
      </form>
    </div>
  );
}
