import Link from "next/link";
import { notFound } from "next/navigation";

import { StorefrontClient } from "@/components/catalog/storefront-client";
import { resolveCatalogImage } from "@/lib/catalog-images";
import { getPublicStoreShell } from "@/lib/queries";

export default async function CartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getPublicStoreShell(slug);

  if (!store) {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 py-5 sm:py-7">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Checkout</p>
            <h1 className="display-font mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">
              Revise o carrinho da loja {store.name}
            </h1>
          </div>
          <Link
            href={`/loja/${slug}`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Voltar ao catalogo
          </Link>
        </div>

        <StorefrontClient
          cartOnly
          store={{
            slug: store.slug,
            name: store.name,
            description: store.description || "",
            whatsappNumber: store.whatsappNumber,
            logoUrl: resolveCatalogImage(
              store.logoUrl ||
                "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=240&q=80",
              { width: 240, height: 240, crop: "fill" },
            ),
            bannerUrl: resolveCatalogImage(
              store.bannerUrl ||
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
              { width: 1400, height: 720, crop: "fill" },
            ),
            primaryColor: store.primaryColor,
            secondaryColor: store.secondaryColor,
            accentColor: store.accentColor,
            themeMode: store.themeMode,
            accessMode: store.accessMode,
            catalogUsesImages: store.catalogUsesImages,
          }}
          categories={[]}
          products={[]}
        />
      </div>
    </main>
  );
}
