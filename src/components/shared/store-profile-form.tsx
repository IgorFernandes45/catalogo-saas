"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus } from "lucide-react";

import { updateProfileAction } from "@/app/painel/actions";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { useNotify } from "@/components/shared/notify-provider";
import {
  getStoreProfilePreset,
  parseEnabledAttributes,
  serializeEnabledAttributes,
  storeProfilePresets,
  type ProductAttributePreset,
  type StoreProfileKey,
} from "@/lib/store-profiles";

type StoreProfileFormProps = {
  store: {
    name: string;
    slug: string;
    description: string | null;
    whatsappNumber: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    themeMode: string;
    catalogUsesImages: boolean;
    catalogProfile: string;
    productAttributesJson: string | null;
    status: boolean;
  };
};

export function StoreProfileForm({ store }: StoreProfileFormProps) {
  const router = useRouter();
  const notify = useNotify();
  const [isPending, startTransition] = useTransition();
  const [catalogProfile, setCatalogProfile] = useState<StoreProfileKey>(
    (store.catalogProfile || "CUSTOM") as StoreProfileKey,
  );
  const [enabledAttributes, setEnabledAttributes] = useState<ProductAttributePreset[]>(
    () => parseEnabledAttributes(store.productAttributesJson, store.catalogProfile),
  );
  const [customAttributeName, setCustomAttributeName] = useState("");
  const selectedPreset = useMemo(
    () => getStoreProfilePreset(catalogProfile),
    [catalogProfile],
  );

  function applyProfile(nextProfile: StoreProfileKey) {
    setCatalogProfile(nextProfile);
    setEnabledAttributes(getStoreProfilePreset(nextProfile).attributes);
  }

  function toggleAttribute(attribute: ProductAttributePreset) {
    setEnabledAttributes((current) => {
      const exists = current.some((item) => item.key === attribute.key);

      if (exists) {
        return current.filter((item) => item.key !== attribute.key);
      }

      return [...current, attribute];
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const result = await updateProfileAction(formData);
          notify({
            tone: result.status === "success" ? "success" : "error",
            title:
              result.status === "success"
                ? "Perfil salvo"
                : "Não foi possível salvar o perfil",
            message: result.message,
          });

          if (result.status === "success") {
            router.refresh();
          }
        });
      }}
      className="mt-8 grid gap-8"
    >
      <section className="grid gap-5 rounded-[30px] border border-orange-100 bg-orange-50/70 p-5">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-orange-600">
            Perfil da loja
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Escolha o tipo da loja para acelerar o cadastro
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O sistema mostra apenas campos compatíveis com esse perfil. Você pode
            ativar ou desativar atributos quando quiser.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {storeProfilePresets.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => applyProfile(preset.key)}
              className={`rounded-[24px] border p-4 text-left transition ${
                catalogProfile === preset.key
                  ? "border-slate-950 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
                  : "border-white bg-white/70 hover:border-orange-200"
              }`}
            >
              <p className="font-semibold text-slate-950">{preset.name}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {preset.description}
              </p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">
                {preset.examples}
              </p>
            </button>
          ))}
        </div>

        <input type="hidden" name="catalogProfile" value={catalogProfile} />
        <input
          type="hidden"
          name="productAttributesJson"
          value={serializeEnabledAttributes(enabledAttributes)}
        />

        <div className="rounded-[24px] bg-white p-4">
          <p className="text-sm font-semibold text-slate-950">
            Campos ativos para produtos
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Perfil selecionado: {selectedPreset.name}. {selectedPreset.imageHint}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedPreset.attributes.map((attribute) => {
              const isEnabled = enabledAttributes.some((item) => item.key === attribute.key);

              return (
                <button
                  key={attribute.key}
                  type="button"
                  onClick={() => toggleAttribute(attribute)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    isEnabled
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  {attribute.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              value={customAttributeName}
              onChange={(event) => setCustomAttributeName(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
              placeholder="Adicionar atributo personalizado"
            />
            <button
              type="button"
              onClick={() => {
                const label = customAttributeName.trim();

                if (!label) {
                  return;
                }

                const key = label
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/[^a-zA-Z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")
                  .toLowerCase();

                setEnabledAttributes((current) =>
                  current.some((item) => item.key === key)
                    ? current
                    : [...current, { key, label }],
                );
                setCustomAttributeName("");
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              <Plus className="size-4" />
              Adicionar
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Nome da loja
          <input
            required
            name="name"
            defaultValue={store.name}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Slug público
          <input
            required
            name="slug"
            defaultValue={store.slug}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700 lg:col-span-2">
          Descrição
          <textarea
            name="description"
            rows={4}
            defaultValue={store.description || ""}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          WhatsApp da loja
          <input
            required
            name="whatsappNumber"
            defaultValue={store.whatsappNumber}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          E-mail
          <input
            type="email"
            name="email"
            defaultValue={store.email || ""}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Telefone
          <input
            name="phone"
            defaultValue={store.phone || ""}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Endereco
          <input
            name="address"
            defaultValue={store.address || ""}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          />
        </label>
        <ImageUploadField
          name="logoUrl"
          label="Logo da loja"
          purpose="store-logo"
          initialUrl={store.logoUrl}
          helpText="A logo enviada vai para o Cloudinary e ja fica pronta para o catálogo."
        />
        <ImageUploadField
          name="bannerUrl"
          label="Banner da loja"
          purpose="store-banner"
          initialUrl={store.bannerUrl}
          helpText="Use um banner largo para o topo do catálogo público."
          previewAspect="wide"
        />
      </section>

      <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <div>
          <p className="text-sm font-semibold text-slate-950">Fotos no catálogo</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Se desativar, os produtos aparecem em cards de texto sem area de imagem.
          </p>
        </div>
        <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="catalogUsesImages"
            defaultChecked={store.catalogUsesImages}
            className="size-4 rounded border-slate-300"
          />
          Usar fotos nos produtos
        </label>
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Cor principal
          <input
            type="color"
            name="primaryColor"
            defaultValue={store.primaryColor}
            className="h-12 rounded-2xl border border-slate-200 px-2 py-2"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Cor secundaria
          <input
            type="color"
            name="secondaryColor"
            defaultValue={store.secondaryColor}
            className="h-12 rounded-2xl border border-slate-200 px-2 py-2"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Cor destaque
          <input
            type="color"
            name="accentColor"
            defaultValue={store.accentColor}
            className="h-12 rounded-2xl border border-slate-200 px-2 py-2"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Tema
          <select
            name="themeMode"
            defaultValue={store.themeMode}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
          >
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </label>
      </section>

      <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          name="status"
          defaultChecked={store.status}
          className="size-4 rounded border-slate-300"
        />
        Loja ativa
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
        {isPending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}
