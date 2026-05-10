import { notFound } from "next/navigation";

import { StoreProfileForm } from "@/components/shared/store-profile-form";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StoreProfilePage() {
  const user = await requireStoreUser();
  const store = await prisma.store.findUnique({
    where: { id: user.storeId! },
  });

  if (!store) {
    notFound();
  }

  return (
    <div className="surface-card p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Perfil</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Identidade da loja e aparencia do catalogo
        </h1>
      </div>
      <StoreProfileForm store={store} />
    </div>
  );
}
