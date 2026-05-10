"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { createCategoryAction } from "@/app/painel/actions";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { useNotify } from "@/components/shared/notify-provider";

type CategoryAdminFormProps = {
  action?: (formData: FormData) => Promise<{
    status: "idle" | "success" | "error";
    message: string;
    resetToken: number;
  }>;
  submitLabel?: string;
  successTitle?: string;
  errorTitle?: string;
  initialValues?: {
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
    attributesDefinition: string;
  };
};

export function CategoryAdminForm({
  action = createCategoryAction,
  submitLabel = "Criar categoria",
  successTitle = "Categoria criada",
  errorTitle = "Nao foi possivel salvar a categoria",
  initialValues,
}: CategoryAdminFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const notify = useNotify();
  const [isPending, startTransition] = useTransition();
  const [formResetKey, setFormResetKey] = useState(0);
  const isEditing = Boolean(initialValues);

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await action(formData);
          notify({
            tone: result.status === "success" ? "success" : "error",
            title: result.status === "success" ? successTitle : errorTitle,
            message: result.message,
          });

          if (result.status === "success") {
            if (!isEditing) {
              formRef.current?.reset();
              setFormResetKey((current) => current + 1);
            }
            router.refresh();
          }
        });
      }}
      className="mt-8 grid gap-5"
    >
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Nome
        <input
          required
          name="name"
          defaultValue={initialValues?.name || ""}
          className="rounded-2xl border border-slate-200 px-4 py-3"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Slug
        <input
          name="slug"
          defaultValue={initialValues?.slug || ""}
          className="rounded-2xl border border-slate-200 px-4 py-3"
          placeholder="camisetas"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Descricao
        <textarea
          name="description"
          rows={3}
          defaultValue={initialValues?.description || ""}
          className="rounded-2xl border border-slate-200 px-4 py-3"
        />
      </label>
      <ImageUploadField
        key={`category-image-${formResetKey}`}
        name="imageUrl"
        label="Imagem da categoria"
        purpose="category"
        initialUrl={initialValues?.imageUrl}
        helpText="Use uma capa da categoria para enriquecer o catálogo e futuras vitrines."
      />
      <label className="grid gap-2 text-sm font-medium text-slate-700">
        Ordem de exibicao
        <input
          type="number"
          name="sortOrder"
          defaultValue={initialValues?.sortOrder ?? 0}
          className="rounded-2xl border border-slate-200 px-4 py-3"
        />
      </label>

      <div className="grid gap-3 rounded-[28px] bg-slate-50 p-5 text-sm text-slate-700">
        <label className="inline-flex items-center gap-3">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={initialValues ? initialValues.isActive : true}
            className="size-4 rounded border-slate-300"
          />
          Categoria ativa
        </label>
        <p className="text-xs leading-6 text-slate-500">
          Categoria agora serve apenas para organizar e filtrar produtos. Cor,
          tamanho, preco, foto e estoque ficam no cadastro manual do produto.
        </p>
      </div>

      <input type="hidden" name="useStock" value="" />
      <input type="hidden" name="useColor" value="" />
      <input type="hidden" name="useSize" value="" />
      <input type="hidden" name="useFabric" value="" />
      <input type="hidden" name="useDescription" value="on" />
      <input type="hidden" name="allowCustomAttributes" value="" />
      <input type="hidden" name="variantGroupsDefinition" value="" />
      <input type="hidden" name="attributesDefinition" value="" />

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isPending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
