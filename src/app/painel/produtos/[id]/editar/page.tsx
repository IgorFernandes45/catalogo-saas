import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deleteProductAction,
  updateProductAction,
} from "@/app/painel/actions";
import { MutationActionButton } from "@/components/shared/mutation-action-button";
import { ProductAdminForm } from "@/components/shared/product-admin-form";
import { ProductStockAdjuster } from "@/components/shared/product-stock-adjuster";
import { requireStoreUser } from "@/lib/auth";
import { parseCategoryVariantGroupsJson } from "@/lib/category-variant-groups";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import {
  parseVariantAttributesJson,
  serializeVariantDefinitions,
} from "@/lib/variant-definitions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireStoreUser();
  const { id } = await params;

  const [store, categories, product] = await Promise.all([
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
    prisma.product.findFirst({
      where: {
        id,
        storeId: user.storeId!,
      },
      include: {
        category: true,
        variants: {
          orderBy: { createdAt: "asc" },
        },
        customValues: {
          include: { attribute: true },
        },
      },
    }),
  ]);

  if (!product) {
    notFound();
  }

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
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="surface-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Produtos</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              Editar produto
            </h1>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Ajuste cadastro, variações, imagens e configurações deste item.
            </p>
          </div>

          <Link
            href="/painel/produtos"
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Voltar para produtos
          </Link>
        </div>

        <div className="mt-8">
          <ProductAdminForm
            categories={categoryOptions}
            action={updateProductAction.bind(null, product.id)}
            storeProfile={store?.catalogProfile}
            productAttributesJson={store?.productAttributesJson}
            catalogUsesImages={store?.catalogUsesImages ?? true}
            submitLabel="Salvar produto"
            successTitle="Produto atualizado"
            errorTitle="Não foi possível atualizar o produto"
            initialValues={{
              categoryId: product.categoryId,
              name: product.name,
              slug: product.slug,
              price: String(product.price).replace(".", ","),
              promotionalPrice: product.promotionalPrice
                ? String(product.promotionalPrice).replace(".", ",")
                : "",
              sku: product.sku || "",
              barcode: product.barcode || "",
              costPrice: product.costPrice
                ? String(product.costPrice).replace(".", ",")
                : "",
              profitMarginPercent: product.profitMarginPercent
                ? String(product.profitMarginPercent).replace(".", ",")
                : "",
              weight: product.weight || "",
              brandSupplier: product.brandSupplier || "",
              productAttributes: safeJsonParse<Record<string, string>>(
                product.attributesJson,
                {},
              ),
              shortDescription: product.shortDescription || "",
              fullDescription: product.fullDescription || "",
              imageUrl: product.imageUrl || "",
              gallery: safeJsonParse<string[]>(product.galleryJson, []).join("\n"),
              variantsDefinition: serializeVariantDefinitions(
                product.variants.map((variant) => ({
                  label: variant.label,
                  sku: variant.sku || undefined,
                  barcode: variant.barcode || undefined,
                  imageUrl: variant.imageUrl || undefined,
                  priceOverride: variant.priceOverride ? Number(variant.priceOverride) : undefined,
                  promotionalPriceOverride: variant.promotionalPriceOverride
                    ? Number(variant.promotionalPriceOverride)
                    : undefined,
                  discountPercent: variant.discountPercent
                    ? Number(variant.discountPercent)
                    : undefined,
                  costPriceOverride: variant.costPriceOverride
                    ? Number(variant.costPriceOverride)
                    : undefined,
                  stockQuantity: variant.stockQuantity,
                  isActive: variant.isActive,
                  attributes: parseVariantAttributesJson(variant.attributesJson),
                })),
              ),
              color: product.color || "",
              size: product.size || "",
              fabric: product.fabric || "",
              stockQuantity: product.stockQuantity ?? 0,
              notes: product.notes || "",
              isActive: product.isActive,
              isFeatured: product.isFeatured,
              trackStock: product.trackStock,
              customValues: Object.fromEntries(
                product.customValues.map((item) => [item.attributeId, item.valueText]),
              ),
            }}
          />
        </div>
      </section>

      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Operação</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Estoque e ações rápidas
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Veja o resumo atual do item e aplique baixa ou reposição sem voltar para a listagem.
        </p>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <p className="text-lg font-semibold text-slate-950">{product.name}</p>
          <p className="mt-1 text-sm text-slate-500">
            {product.category.name} {product.sku ? `- SKU ${product.sku}` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {product.isFeatured ? (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700">Destaque</span>
            ) : null}
            {!product.isActive ? (
              <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">Inativo</span>
            ) : null}
            {product.trackStock ? (
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">
                {product.variants.length
                  ? `${product.variants.length} variação(ões) com estoque`
                  : `Estoque atual: ${product.stockQuantity ?? 0}`}
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-700">
                Sem controle de estoque
              </span>
            )}
          </div>
        </div>

        {product.trackStock ? (
          product.variants.length ? (
            <div className="mt-6 grid gap-3">
              {product.variants.map((variant) => (
                <ProductStockAdjuster
                  key={variant.id}
                  productId={product.id}
                  productVariantId={variant.id}
                  label={variant.label}
                  currentStock={variant.stockQuantity}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <ProductStockAdjuster
                productId={product.id}
                currentStock={product.stockQuantity ?? 0}
              />
            </div>
          )
        ) : null}

        <div className="mt-6">
          <MutationActionButton
            action={deleteProductAction.bind(null, product.id)}
            confirmMessage={`Deseja excluir o produto "${product.name}"? Se ele tiver histórico de vendas ou estoque, o sistema irá apenas desativá-lo para preservar os relatórios.`}
            idleLabel="Excluir produto"
            pendingLabel="Excluindo..."
            successTitle="Produto removido"
            errorTitle="Não foi possível excluir o produto"
          />
        </div>
      </section>
    </div>
  );
}
