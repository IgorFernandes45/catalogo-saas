import {
  deleteCategoryAction,
  updateCategoryAction,
} from "@/app/painel/actions";
import { CategoryAdminForm } from "@/components/shared/category-admin-form";
import { CategoryManagementCard } from "@/components/shared/category-management-card";
import { CategoryReorderList } from "@/components/shared/category-reorder-list";
import { requireStoreUser } from "@/lib/auth";
import { parseCategoryVariantGroupsJson, serializeCategoryVariantGroupsDefinition } from "@/lib/category-variant-groups";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export default async function CategoriesPage() {
  const user = await requireStoreUser();

  const categories = await prisma.category.findMany({
    where: { storeId: user.storeId! },
    include: { attributes: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Categorias</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Crie categorias dinamicas
        </h1>
        <CategoryAdminForm />
      </section>

      <section className="surface-card p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Estrutura atual</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Categorias ja cadastradas
        </h2>
        {categories.length > 1 ? (
          <CategoryReorderList
            initialCategories={categories.map((c) => ({
              id: c.id,
              name: c.name,
              sortOrder: c.sortOrder,
            }))}
          />
        ) : null}
        <div className="mt-6 grid gap-4">
          {categories.map((category) => (
            <CategoryManagementCard
              key={category.id}
              category={{
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                imageUrl: category.imageUrl,
                sortOrder: category.sortOrder,
                isActive: category.isActive,
                useStock: category.useStock,
                useColor: category.useColor,
                useSize: category.useSize,
                useFabric: category.useFabric,
                useDescription: category.useDescription,
                allowCustomAttributes: category.allowCustomAttributes,
                variantGroupsDefinition: serializeCategoryVariantGroupsDefinition(
                  parseCategoryVariantGroupsJson(category.variantGroupsJson),
                ),
                variantGroups: parseCategoryVariantGroupsJson(category.variantGroupsJson),
                attributesDefinition: category.attributes
                  .map((attribute) => {
                    const options = safeJsonParse<string[]>(attribute.optionsJson, []).join(",");
                    return [
                      attribute.name,
                      attribute.fieldType,
                      attribute.isRequired ? "sim" : "nao",
                      options,
                    ].join("|");
                  })
                  .join("\n"),
                attributes: category.attributes.map((attribute) => ({
                  id: attribute.id,
                  name: attribute.name,
                  fieldType: attribute.fieldType,
                  isRequired: attribute.isRequired,
                  options: safeJsonParse<string[]>(attribute.optionsJson, []),
                })),
              }}
              updateAction={updateCategoryAction.bind(null, category.id)}
              deleteAction={deleteCategoryAction.bind(null, category.id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
