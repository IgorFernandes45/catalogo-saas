import Link from "next/link";

import { createProductAction } from "@/app/painel/actions";
import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { ProductAdminForm } from "@/components/shared/product-admin-form";
import { requireStoreUser } from "@/lib/auth";
import { parseCategoryVariantGroupsJson } from "@/lib/category-variant-groups";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
}) {
  const query = await searchParams;
  const user = await requireStoreUser();

  const [store, categories, existingProducts] = await Promise.all([
    prisma.store.findUnique({
      where: { id: user.storeId! },
      select: {
        catalogProfile: true,
        productAttributesJson: true,
        catalogUsesImages: true,
      },
    }),
    prisma.category.findMany({
      where: { storeId: user.storeId! },
      include: { attributes: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.product.findMany({
      where: { storeId: user.storeId!, isActive: true },
      select: {
        id: true,
        name: true,
        categoryId: true,
        price: true,
        imageUrl: true,
      },
      orderBy: { name: "asc" },
      take: 200,
    }),
  ]);

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
    useStock: category.useStock,
    useColor: category.useColor,
    useSize: category.useSize,
    useFabric: category.useFabric,
    useDescription: category.useDescription,
    variantGroups: parseCategoryVariantGroupsJson(category.variantGroupsJson),
    attributes: category.attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      fieldType: attribute.fieldType,
      isRequired: attribute.isRequired,
      options: safeJsonParse<string[]>(attribute.optionsJson, []),
    })),
  }));

  return (
    <div className="grid gap-6">
      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
              Cadastro de produtos
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">
              Cadastre produto simples ou com variações
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Crie um produto novo ou adicione uma variação a um produto existente.
              Produtos com variação usam o produto base como vitrine, e cada
              variação recebe preço, estoque, foto e código próprios.
            </p>
          </div>
          <Link
            href="/painel/estoque"
            className="inline-flex w-fit rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Ver produtos cadastrados
          </Link>
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

        {categoryOptions.length ? (
          <div className="mt-8">
            <ProductAdminForm
              categories={categoryOptions}
              existingProducts={existingProducts.map((product) => ({
                ...product,
                price: Number(product.price),
              }))}
              storeProfile={store?.catalogProfile}
              productAttributesJson={store?.productAttributesJson}
              catalogUsesImages={store?.catalogUsesImages ?? true}
              action={createProductAction}
            />
          </div>
        ) : (
          <div className="mt-8">
            <EmptyStateCard
              title="Você ainda não tem categorias"
              description="Crie ao menos uma categoria para liberar o cadastro manual de produtos."
              actionHref="/painel/categorias"
              actionLabel="Criar categoria"
            />
          </div>
        )}
      </section>
    </div>
  );
}
