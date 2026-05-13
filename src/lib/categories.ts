import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type CategoryTransaction = Prisma.TransactionClient;

export type StoreCategoryInput = {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  useStock: boolean;
  useColor: boolean;
  useSize: boolean;
  useFabric: boolean;
  useDescription: boolean;
  allowCustomAttributes: boolean;
  variantGroups: Array<{
    name: string;
    options: string[];
  }>;
  attributes: Array<{
    name: string;
    fieldType: "TEXT" | "NUMBER" | "SELECT" | "MULTISELECT";
    isRequired: boolean;
    options: string[];
  }>;
};

type CategoryMutationInput = {
  tx?: CategoryTransaction;
  storeId: string;
  input: StoreCategoryInput;
};

type UpdateCategoryMutationInput = CategoryMutationInput & {
  categoryId: string;
};

type DeleteCategoryMutationInput = {
  tx?: CategoryTransaction;
  storeId: string;
  categoryId: string;
};

export async function createStoreCategory({
  tx,
  storeId,
  input,
}: CategoryMutationInput) {
  const db = tx ?? prisma;

  return db.category.create({
    data: {
      storeId,
      name: input.name,
      slug: input.slug,
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      useStock: input.useStock,
      useColor: input.useColor,
      useSize: input.useSize,
      useFabric: input.useFabric,
      useDescription: input.useDescription,
      allowCustomAttributes: input.allowCustomAttributes,
      variantGroupsJson: input.variantGroups.length
        ? JSON.stringify(input.variantGroups)
        : null,
      attributes: {
        create: input.attributes.map((attribute) => ({
          name: attribute.name,
          fieldType: attribute.fieldType,
          isRequired: attribute.isRequired,
          optionsJson: attribute.options.length
            ? JSON.stringify(attribute.options)
            : null,
        })),
      },
    },
    include: {
      attributes: true,
    },
  });
}

export async function updateStoreCategory({
  tx,
  storeId,
  categoryId,
  input,
}: UpdateCategoryMutationInput) {
  const db = tx ?? prisma;
  const category = await db.category.findFirst({
    where: {
      id: categoryId,
      storeId,
    },
    include: {
      attributes: true,
    },
  });

  if (!category) {
    throw new Error("Categoria não encontrada para esta loja.");
  }

  const nextNames = new Set(input.attributes.map((attribute) => attribute.name.trim().toLowerCase()));
  const existingByName = new Map(
    category.attributes.map((attribute) => [attribute.name.trim().toLowerCase(), attribute]),
  );

  await db.category.update({
    where: { id: category.id },
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
      useStock: input.useStock,
      useColor: input.useColor,
      useSize: input.useSize,
      useFabric: input.useFabric,
      useDescription: input.useDescription,
      allowCustomAttributes: input.allowCustomAttributes,
      variantGroupsJson: input.variantGroups.length
        ? JSON.stringify(input.variantGroups)
        : null,
    },
  });

  for (const attribute of input.attributes) {
    const current = existingByName.get(attribute.name.trim().toLowerCase());

    if (current) {
      await db.categoryCustomAttribute.update({
        where: { id: current.id },
        data: {
          name: attribute.name,
          fieldType: attribute.fieldType,
          isRequired: attribute.isRequired,
          optionsJson: attribute.options.length
            ? JSON.stringify(attribute.options)
            : null,
        },
      });
      continue;
    }

    await db.categoryCustomAttribute.create({
      data: {
        categoryId: category.id,
        name: attribute.name,
        fieldType: attribute.fieldType,
        isRequired: attribute.isRequired,
        optionsJson: attribute.options.length
          ? JSON.stringify(attribute.options)
          : null,
      },
    });
  }

  const attributeIdsToDelete = category.attributes
    .filter((attribute) => !nextNames.has(attribute.name.trim().toLowerCase()))
    .map((attribute) => attribute.id);

  if (attributeIdsToDelete.length) {
    await db.categoryCustomAttribute.deleteMany({
      where: {
        id: {
          in: attributeIdsToDelete,
        },
      },
    });
  }

  return db.category.findUniqueOrThrow({
    where: { id: category.id },
    include: { attributes: true },
  });
}

export async function deleteStoreCategory({
  tx,
  storeId,
  categoryId,
}: DeleteCategoryMutationInput) {
  const db = tx ?? prisma;
  const category = await db.category.findFirst({
    where: {
      id: categoryId,
      storeId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  if (!category) {
    throw new Error("Categoria não encontrada para esta loja.");
  }

  if (category._count.products > 0) {
    throw new Error("Remova ou mova os produtos desta categoria antes de excluir.");
  }

  await db.category.delete({
    where: {
      id: category.id,
    },
  });

  return {
    categoryName: category.name,
    categorySlug: category.slug,
  };
}
