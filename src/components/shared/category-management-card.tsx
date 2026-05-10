"use client";

import { useState } from "react";
import { PencilLine } from "lucide-react";

import { CategoryAdminForm } from "@/components/shared/category-admin-form";
import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { MutationActionButton } from "@/components/shared/mutation-action-button";

type CategoryManagementCardProps = {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    isActive: boolean;
    useStock: boolean;
    useColor: boolean;
    useSize: boolean;
    useFabric: boolean;
    useDescription: boolean;
    allowCustomAttributes: boolean;
    variantGroupsDefinition: string;
    variantGroups: Array<{
      name: string;
      options: string[];
    }>;
    attributesDefinition: string;
    attributes: Array<{
      id: string;
      name: string;
      fieldType: string;
      isRequired: boolean;
      options: string[];
    }>;
  };
  updateAction: (formData: FormData) => Promise<{
    status: "idle" | "success" | "error";
    message: string;
    resetToken: number;
  }>;
  deleteAction: () => Promise<{
    status: "idle" | "success" | "error";
    message: string;
    resetToken: number;
  }>;
};

export function CategoryManagementCard({
  category,
  updateAction,
  deleteAction,
}: CategoryManagementCardProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <article className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-slate-950">{category.name}</p>
          <p className="text-sm text-slate-500">/{category.slug}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            category.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          {category.isActive ? "Ativa" : "Inativa"}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-600">{category.description || "Sem descricao"}</p>

      <div className="mt-4">
        <EmptyStateCard
          title="Categoria de organizacao"
          description="Use apenas para separar e filtrar produtos. As variacoes de cor, tamanho, foto, preco e estoque ficam dentro de cada produto."
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setIsEditing((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          <PencilLine className="size-4" />
          {isEditing ? "Fechar edicao" : "Editar categoria"}
        </button>
        <MutationActionButton
          action={deleteAction}
          confirmMessage={`Deseja excluir a categoria ${category.name}? Essa acao so funciona se ela nao tiver produtos vinculados.`}
          idleLabel="Excluir categoria"
          pendingLabel="Excluindo..."
          successTitle="Categoria removida"
          errorTitle="Nao foi possivel excluir a categoria"
        />
      </div>

      {isEditing ? (
        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5">
          <p className="text-sm uppercase tracking-[0.22em] text-orange-500">Editar categoria</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Atualize a categoria
          </h3>
          <div className="mt-5">
            <CategoryAdminForm
              action={updateAction}
              submitLabel="Salvar categoria"
              successTitle="Categoria atualizada"
              errorTitle="Nao foi possivel atualizar a categoria"
              initialValues={{
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
                variantGroupsDefinition: category.variantGroupsDefinition,
                attributesDefinition: category.attributesDefinition,
              }}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
