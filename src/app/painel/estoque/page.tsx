import Link from "next/link";

import { deleteProductAction } from "@/app/painel/actions";
import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { ProductManagementCard } from "@/components/shared/product-management-card";
import { ProductStockFilters } from "@/components/shared/product-stock-filters";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StockProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    lowStock?: string;
    trackStock?: string;
    page?: string;
  }>;
}) {
  const query = await searchParams;
  const user = await requireStoreUser();
  const search = String(query.search ?? "").trim();
  const lowStockOnly = query.lowStock === "1";
  const trackStockOnly = query.trackStock === "1" || lowStockOnly;
  const currentPage =
    Number.isInteger(Number(query.page)) && Number(query.page) > 0
      ? Number(query.page)
      : 1;
  const pageSize = 12;
  const productWhere = {
    storeId: user.storeId!,
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              sku: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              barcode: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              slug: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              category: {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
    ...(trackStockOnly ? { trackStock: true } : {}),
    ...(lowStockOnly
      ? {
          OR: [
            { stockQuantity: { lte: 5 } },
            {
              variants: {
                some: {
                  isActive: true,
                  stockQuantity: { lte: 5 },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [totalProducts, products] = await Promise.all([
    prisma.product.count({
      where: productWhere,
    }),
    prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        price: true,
        promotionalPrice: true,
        sku: true,
        barcode: true,
        costPrice: true,
        profitMarginPercent: true,
        color: true,
        size: true,
        fabric: true,
        stockQuantity: true,
        isActive: true,
        isFeatured: true,
        trackStock: true,
        category: {
          select: {
            name: true,
          },
        },
        variants: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            label: true,
            sku: true,
            barcode: true,
            imageUrl: true,
            priceOverride: true,
            promotionalPriceOverride: true,
            discountPercent: true,
            costPriceOverride: true,
            stockQuantity: true,
            isActive: true,
          },
        },
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalProducts / pageSize));
  const pageStart = totalProducts ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = totalProducts ? pageStart + products.length - 1 : 0;

  function buildStockPageHref(page: number) {
    const params = new URLSearchParams();

    if (search) {
      params.set("search", search);
    }
    if (trackStockOnly) {
      params.set("trackStock", "1");
    }
    if (lowStockOnly) {
      params.set("lowStock", "1");
    }
    if (page > 1) {
      params.set("page", String(page));
    }

    const queryString = params.toString();
    return queryString ? `/painel/estoque?${queryString}` : "/painel/estoque";
  }

  return (
    <section className="surface-card p-6 sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">
            Estoque
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Produtos cadastrados
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Consulte produtos, edite cadastro, ajuste o numero atual de estoque e
            veja as variacoes vendaveis de cada produto.
          </p>
        </div>
        <Link
          href="/painel/produtos"
          className="inline-flex w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Cadastrar produto
        </Link>
      </div>

      <ProductStockFilters
        key={`${search}|${trackStockOnly ? "1" : "0"}|${lowStockOnly ? "1" : "0"}`}
        pathname="/painel/estoque"
        initialSearch={search}
        initialLowStockOnly={lowStockOnly}
        initialTrackStockOnly={trackStockOnly}
      />
      <p className="mt-4 text-sm text-slate-500">
        Mostrando {pageStart}-{pageEnd} de {totalProducts} produto
        {totalProducts === 1 ? "" : "s"}
        {search ? ` para "${search}"` : ""}
        {trackStockOnly ? " com controle de estoque" : ""}
        {lowStockOnly ? " e estoque baixo" : ""}.
      </p>
      <div className="mt-6 grid gap-4">
        {products.map((product) => (
          <ProductManagementCard
            key={product.id}
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              categoryName: product.category.name,
              shortDescription: product.shortDescription || "",
              price: Number(product.price),
              promotionalPrice: product.promotionalPrice
                ? Number(product.promotionalPrice)
                : null,
              sku: product.sku || "",
              barcode: product.barcode || "",
              costPrice: product.costPrice ? Number(product.costPrice) : null,
              profitMarginPercent: product.profitMarginPercent
                ? Number(product.profitMarginPercent)
                : null,
              color: product.color || "",
              size: product.size || "",
              fabric: product.fabric || "",
              stockQuantity: product.stockQuantity ?? 0,
              isActive: product.isActive,
              isFeatured: product.isFeatured,
              trackStock: product.trackStock,
              variants: product.variants.map((variant) => ({
                id: variant.id,
                label: variant.label,
                sku: variant.sku || "",
                barcode: variant.barcode || "",
                imageUrl: variant.imageUrl || "",
                priceOverride: variant.priceOverride ? Number(variant.priceOverride) : null,
                promotionalPriceOverride: variant.promotionalPriceOverride
                  ? Number(variant.promotionalPriceOverride)
                  : null,
                discountPercent: variant.discountPercent
                  ? Number(variant.discountPercent)
                  : null,
                costPriceOverride: variant.costPriceOverride
                  ? Number(variant.costPriceOverride)
                  : null,
                stockQuantity: variant.stockQuantity,
                isActive: variant.isActive,
              })),
            }}
            deleteAction={deleteProductAction.bind(null, product.id)}
          />
        ))}
      </div>
      {!products.length ? (
        <div className="mt-4">
          <EmptyStateCard
            title="Nenhum produto encontrado"
            description="Ajuste a busca ou os filtros de estoque para localizar os produtos que voce precisa movimentar."
            actionHref="/painel/estoque"
            actionLabel="Limpar filtros"
          />
        </div>
      ) : null}
      {totalProducts > pageSize ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
          <p className="text-sm text-slate-500">
            Pagina {currentPage} de {totalPages}
          </p>
          <div className="flex gap-3">
            <Link
              href={buildStockPageHref(Math.max(1, currentPage - 1))}
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
              href={buildStockPageHref(Math.min(totalPages, currentPage + 1))}
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
  );
}
