import { createStoreAction } from "@/app/admin/actions";

export default async function NewStorePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="surface-card p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Nova loja</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Criar nova operacao multiloja
        </h1>
      </div>

      {params.error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error}
        </div>
      ) : null}

      <form action={createStoreAction} className="mt-8 grid gap-8">
        <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
          <label className="grid cursor-pointer gap-2 rounded-[24px] border border-slate-950 bg-slate-950 p-5 text-white">
            <span className="text-sm font-semibold">Catálogo + vendas</span>
            <span className="text-sm leading-6 text-slate-200">
              Libera produtos, categorias, pedidos, vendas, clientes, estoque e relatórios.
            </span>
            <input
              type="radio"
              name="accessMode"
              value="FULL"
              defaultChecked
              className="mt-2 size-4"
            />
          </label>
          <label className="grid cursor-pointer gap-2 rounded-[24px] border border-slate-200 bg-white p-5 text-slate-700">
            <span className="text-sm font-semibold text-slate-950">Somente catálogo</span>
            <span className="text-sm leading-6">
              Libera apenas perfil/aparência, categorias, produtos e catálogo público.
            </span>
            <input
              type="radio"
              name="accessMode"
              value="CATALOG_ONLY"
              className="mt-2 size-4"
            />
          </label>
        </section>

        <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-5 md:grid-cols-2">
          <label className="grid cursor-pointer gap-2 rounded-[24px] border border-slate-950 bg-slate-950 p-5 text-white">
            <span className="text-sm font-semibold">Catalogo com fotos</span>
            <span className="text-sm leading-6 text-slate-200">
              Exibe imagens nos produtos e permite fotos no painel da loja.
            </span>
            <input
              type="radio"
              name="catalogUsesImages"
              value="on"
              defaultChecked
              className="mt-2 size-4"
            />
          </label>
          <label className="grid cursor-pointer gap-2 rounded-[24px] border border-slate-200 bg-slate-50 p-5 text-slate-700">
            <span className="text-sm font-semibold text-slate-950">Catalogo sem fotos</span>
            <span className="text-sm leading-6">
              Mostra cards compactos apenas com textos, valores e botoes de contato.
            </span>
            <input
              type="radio"
              name="catalogUsesImages"
              value=""
              className="mt-2 size-4"
            />
          </label>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Nome da loja
            <input required name="name" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Slug publico
            <input name="slug" placeholder="minha-loja" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
            Descricao
            <textarea name="description" rows={4} className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            WhatsApp da loja
            <input required name="whatsappNumber" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            E-mail da loja
            <input type="email" name="email" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Telefone
            <input name="phone" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Endereco
            <input name="address" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <input type="hidden" name="logoUrl" value="" />
          <input type="hidden" name="bannerUrl" value="" />
        </section>

        <section className="grid gap-5 lg:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cor principal
            <input type="color" name="primaryColor" defaultValue="#102542" className="h-12 rounded-2xl border border-slate-200 px-2 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cor secundaria
            <input type="color" name="secondaryColor" defaultValue="#f97316" className="h-12 rounded-2xl border border-slate-200 px-2 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cor destaque
            <input type="color" name="accentColor" defaultValue="#22c55e" className="h-12 rounded-2xl border border-slate-200 px-2 py-2" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Tema
            <select name="themeMode" className="rounded-2xl border border-slate-200 px-4 py-3">
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </label>
        </section>

        <section className="grid gap-5 rounded-[28px] bg-slate-50 p-6 lg:grid-cols-3">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Nome do gestor
            <input required name="managerName" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            E-mail do gestor
            <input required type="email" name="managerEmail" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Senha inicial
            <input required type="password" name="managerPassword" className="rounded-2xl border border-slate-200 px-4 py-3" />
          </label>
        </section>

        <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
          <input type="checkbox" name="status" defaultChecked className="size-4 rounded border-slate-300" />
          Loja ativa ao criar
        </label>

        <button
          type="submit"
          className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Criar loja
        </button>
      </form>
    </div>
  );
}
