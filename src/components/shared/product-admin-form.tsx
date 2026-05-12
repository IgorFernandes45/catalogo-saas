"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  CheckCircle2,
  LoaderCircle,
  ScanBarcode,
  Sparkles,
} from "lucide-react";

import { ImageUploadField } from "@/components/shared/image-upload-field";
import { MultiImageUploadField } from "@/components/shared/multi-image-upload-field";
import { useNotify } from "@/components/shared/notify-provider";
import { VariantBuilderField } from "@/components/shared/variant-builder-field";
import type { ProductFormActionResult } from "@/lib/product-action-results";
import {
  getStoreProfilePreset,
  parseEnabledAttributes,
  type ProductAttributePreset,
} from "@/lib/store-profiles";
import { formatCurrency, parseCurrency } from "@/lib/utils";

type CategoryOption = {
  id: string;
  name: string;
};

type ProductAdminFormProps = {
  categories: CategoryOption[];
  existingProducts?: Array<{
    id: string;
    name: string;
    categoryId: string;
    price: number;
    imageUrl?: string | null;
  }>;
  action: (formData: FormData) => Promise<ProductFormActionResult>;
  submitLabel?: string;
  successTitle?: string;
  errorTitle?: string;
  storeProfile?: string | null;
  productAttributesJson?: string | null;
  catalogUsesImages?: boolean;
  initialValues?: {
    categoryId: string;
    name: string;
    slug: string;
    price: string;
    promotionalPrice: string;
    sku: string;
    weight: string;
    brandSupplier: string;
    productAttributes: Record<string, string>;
    shortDescription: string;
    fullDescription: string;
    imageUrl: string;
    gallery: string;
    variantsDefinition: string;
    barcode: string;
    costPrice: string;
    profitMarginPercent: string;
    color?: string;
    size?: string;
    fabric?: string;
    stockQuantity: number;
    notes: string;
    isActive: boolean;
    isFeatured: boolean;
    trackStock: boolean;
    customValues?: Record<string, string>;
  };
};

function getInputType(attribute: ProductAttributePreset) {
  if (attribute.type === "date") return "date";
  if (attribute.type === "number") return "number";
  return "text";
}

export function ProductAdminForm({
  categories,
  existingProducts = [],
  action,
  submitLabel = "Salvar produto",
  successTitle = "Produto salvo",
  errorTitle = "Nao foi possivel salvar",
  storeProfile = "CUSTOM",
  productAttributesJson,
  catalogUsesImages = true,
  initialValues,
}: ProductAdminFormProps) {
  const router = useRouter();
  const notify = useNotify();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [hasVariants, setHasVariants] = useState(
    Boolean(initialValues?.variantsDefinition),
  );
  const [addToExisting, setAddToExisting] = useState(false);
  const [parentProductId, setParentProductId] = useState(
    existingProducts[0]?.id || "",
  );
  const [categoryId, setCategoryId] = useState(
    initialValues?.categoryId || categories[0]?.id || "",
  );
  const [formResetKey, setFormResetKey] = useState(0);
  const [productName, setProductName] = useState(initialValues?.name || "");
  const [price, setPrice] = useState(initialValues?.price || "");
  const [promotionalPrice, setPromotionalPrice] = useState(
    initialValues?.promotionalPrice || "",
  );
  const [costPrice, setCostPrice] = useState(initialValues?.costPrice || "");
  const [barcode, setBarcode] = useState(initialValues?.barcode || "");
  const [brandSupplier, setBrandSupplier] = useState(
    initialValues?.brandSupplier || "",
  );
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>(
    initialValues?.productAttributes || {},
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const isEditing = Boolean(initialValues);
  const selectedParentProduct = existingProducts.find(
    (p) => p.id === parentProductId,
  );
  const isAddingExistingVariation =
    !isEditing && addToExisting && Boolean(selectedParentProduct);
  const isVariantProduct = hasVariants || isAddingExistingVariation;

  const finalPrice = parseCurrency(promotionalPrice) || parseCurrency(price);
  const cost = parseCurrency(costPrice);
  const estimatedProfit = finalPrice - cost;
  const margin = finalPrice > 0 ? (estimatedProfit / finalPrice) * 100 : 0;

  const profilePreset = useMemo(
    () => getStoreProfilePreset(storeProfile),
    [storeProfile],
  );
  const enabledAttributes = useMemo(
    () => parseEnabledAttributes(productAttributesJson, storeProfile),
    [productAttributesJson, storeProfile],
  );
  const visibleAttributes = enabledAttributes.filter((a) => a.key !== "brand");
  const hasBrandAttribute = enabledAttributes.some((a) => a.key === "brand");

  const serializedProductAttributes = JSON.stringify({
    ...(hasBrandAttribute && brandSupplier.trim()
      ? { brand: brandSupplier.trim() }
      : {}),
    ...Object.fromEntries(
      Object.entries(attributeValues).filter(([, v]) => v.trim()),
    ),
  });

  function validateForm(): Record<string, string> {
    const errors: Record<string, string> = {};
    if (!isAddingExistingVariation) {
      if (!productName.trim()) {
        errors.name = "Informe o nome do produto.";
      } else if (productName.trim().length < 2) {
        errors.name = "O nome precisa ter pelo menos 2 caracteres.";
      }
    }
    if (!isVariantProduct) {
      const parsed = parseCurrency(price);
      if (!price.trim()) {
        errors.price = "Informe o preco do produto.";
      } else if (isNaN(parsed) || parsed <= 0) {
        errors.price = "Preco invalido. Use o formato 59,90.";
      }
    }
    return errors;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          const firstErrorKey = Object.keys(errors)[0];
          document.querySelector<HTMLElement>(`[name="${firstErrorKey}"]`)?.focus();
          return;
        }
        setFieldErrors({});

        const form = event.currentTarget;
        const formData = new FormData(form);

        if (!isVariantProduct) {
          formData.set("variantsDefinition", "");
        }

        if (isAddingExistingVariation && selectedParentProduct) {
          formData.set("parentProductId", selectedParentProduct.id);
          formData.set("name", selectedParentProduct.name);
          formData.set("categoryId", selectedParentProduct.categoryId);
          formData.set(
            "price",
            String(selectedParentProduct.price).replace(".", ","),
          );
          formData.set("slug", "");
        } else {
          formData.set("parentProductId", "");
        }

        startTransition(async () => {
          const result = await action(formData);
          notify({
            tone: result.status === "success" ? "success" : "error",
            title: result.status === "success" ? successTitle : errorTitle,
            message: result.message,
          });

          if (result.status === "success") {
            if (!isEditing) {
              form.reset();
              setProductName("");
              setCategoryId(categories[0]?.id ?? "");
              setHasVariants(false);
              setAddToExisting(false);
              setParentProductId(existingProducts[0]?.id || "");
              setAttributeValues({});
              setBrandSupplier("");
              setPrice("");
              setPromotionalPrice("");
              setCostPrice("");
              setBarcode("");
              setFieldErrors({});
              setFormResetKey((k) => k + 1);
            }
            router.refresh();
          }
        });
      }}
      className="grid gap-5"
    >
      <input type="hidden" name="customValues" value="[]" />
      <input type="hidden" name="parentProductId" value={parentProductId} />
      <input
        type="hidden"
        name="productAttributesJson"
        value={serializedProductAttributes}
      />
      <input type="hidden" name="trackStock" value="on" />
      <input
        type="hidden"
        name="slug"
        defaultValue={initialValues?.slug || ""}
      />
      <input
        type="hidden"
        name="fullDescription"
        defaultValue={initialValues?.fullDescription || ""}
      />
      <input
        type="hidden"
        name="weight"
        defaultValue={initialValues?.weight || ""}
      />
      <input
        type="hidden"
        name="profitMarginPercent"
        value={margin ? margin.toFixed(2) : ""}
      />
      {isVariantProduct ? (
        <input type="hidden" name="stockQuantity" value="0" />
      ) : null}

      {/* Add to existing product banner */}
      {!isEditing && existingProducts.length > 0 ? (
        <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
          {addToExisting ? (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="grid gap-1.5 text-sm font-medium text-slate-700">
                <span className="flex items-center gap-2">
                  <Sparkles className="size-3.5 text-orange-500" />
                  Produto base (adicionando variacao)
                </span>
                <select
                  value={parentProductId}
                  onChange={(event) => setParentProductId(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900"
                >
                  {existingProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setAddToExisting(false);
                  setHasVariants(false);
                }}
                className="self-end rounded-full border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAddToExisting(true);
                setHasVariants(true);
              }}
              className="flex w-full items-center justify-between gap-3 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <span>
                Adicionar variacao (cor, tamanho...) a um produto ja cadastrado?
              </span>
              <ChevronDown className="size-4 shrink-0 text-slate-400" />
            </button>
          )}
        </div>
      ) : null}

      {isAddingExistingVariation && selectedParentProduct ? (
        <div className="rounded-[24px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900">
          <p className="font-semibold">
            Adicionando variacao a: {selectedParentProduct.name}
          </p>
          <p className="text-xs">
            Preencha apenas os dados da nova variacao abaixo.
          </p>
        </div>
      ) : null}

      {/* Two-column layout */}
      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div className="grid gap-5 content-start">

          {/* Name */}
          {!isAddingExistingVariation ? (
            <div className="grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Nome do produto
                <input
                  name="name"
                  value={productName}
                  onChange={(event) => {
                    setProductName(event.target.value);
                    if (fieldErrors.name) {
                      setFieldErrors((c) => ({ ...c, name: "" }));
                    }
                  }}
                  className={`rounded-2xl border px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 ${
                    fieldErrors.name
                      ? "border-red-400 bg-red-50"
                      : "border-slate-200 bg-white"
                  }`}
                  placeholder="Ex.: Camiseta Oversized Preta"
                  autoFocus={!isEditing}
                />
                {fieldErrors.name ? (
                  <span className="text-xs text-red-600">{fieldErrors.name}</span>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Descricao curta
                <textarea
                  name="shortDescription"
                  rows={2}
                  defaultValue={initialValues?.shortDescription || ""}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
                  placeholder="Uma frase que aparece no catalogo. Ex.: 100% algodao, lavagem a mao."
                />
              </label>
            </div>
          ) : null}

          {/* Images */}
          {catalogUsesImages ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">Fotos</p>
              <p className="mt-1 text-xs text-slate-500">{profilePreset.imageHint}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <ImageUploadField
                  key={`product-image-${formResetKey}`}
                  name="imageUrl"
                  label="Foto principal"
                  purpose="product"
                  initialUrl={initialValues?.imageUrl || ""}
                  helpText="Aparece no card do catalogo."
                />
                <MultiImageUploadField
                  key={`product-gallery-${formResetKey}`}
                  name="gallery"
                  label="Fotos extras"
                  purpose="product"
                  initialUrls={(initialValues?.gallery || "")
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)}
                  helpText="Galeria na pagina do produto."
                />
              </div>
            </div>
          ) : (
            <>
              <input
                type="hidden"
                name="imageUrl"
                value={initialValues?.imageUrl || ""}
              />
              <input
                type="hidden"
                name="gallery"
                value={initialValues?.gallery || ""}
              />
            </>
          )}

          {/* Price and stock — only for simple products */}
          {!isVariantProduct ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">
                Preco e estoque
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Preco normal
                  <input
                    name="price"
                    value={price}
                    onChange={(event) => {
                      setPrice(event.target.value);
                      if (fieldErrors.price) {
                        setFieldErrors((c) => ({ ...c, price: "" }));
                      }
                    }}
                    placeholder="59,90"
                    className={`rounded-2xl border px-4 py-3 text-slate-900 ${
                      fieldErrors.price
                        ? "border-red-400 bg-red-50"
                        : "border-slate-200 bg-white"
                    }`}
                  />
                  {fieldErrors.price ? (
                    <span className="text-xs text-red-600">
                      {fieldErrors.price}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Preco promocional
                  <input
                    name="promotionalPrice"
                    value={promotionalPrice}
                    onChange={(event) => setPromotionalPrice(event.target.value)}
                    placeholder="49,90 (opcional)"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Estoque inicial
                  <input
                    type="number"
                    name="stockQuantity"
                    defaultValue={initialValues?.stockQuantity ?? 0}
                    min={0}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Custo do produto
                  <input
                    name="costPrice"
                    value={costPrice}
                    onChange={(event) => setCostPrice(event.target.value)}
                    placeholder="32,50 (opcional)"
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  SKU / codigo interno
                  <input
                    name="sku"
                    defaultValue={initialValues?.sku || ""}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                    placeholder="Opcional"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Codigo de barras
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <input
                      ref={barcodeRef}
                      name="barcode"
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                      placeholder="Leia com o leitor"
                      autoComplete="off"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() => barcodeRef.current?.focus()}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-3 text-xs font-semibold text-white"
                    >
                      <ScanBarcode className="size-3.5" />
                      Ler
                    </button>
                  </div>
                </label>
              </div>

              {/* Live margin calculator */}
              {finalPrice > 0 ? (
                <div className="mt-4 grid grid-cols-3 gap-3 rounded-[20px] bg-slate-50 px-4 py-3 text-sm">
                  <p>
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Preco final
                    </span>
                    <strong className="text-slate-950">
                      {formatCurrency(finalPrice)}
                    </strong>
                  </p>
                  <p>
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Lucro est.
                    </span>
                    <strong
                      className={
                        estimatedProfit >= 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      }
                    >
                      {formatCurrency(estimatedProfit)}
                    </strong>
                  </p>
                  <p>
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      Margem
                    </span>
                    <strong
                      className={margin >= 20 ? "text-emerald-700" : "text-slate-950"}
                    >
                      {margin.toFixed(1)}%
                    </strong>
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-[28px] border border-orange-200 bg-orange-50 px-5 py-4 text-sm leading-6 text-orange-900">
              <p className="font-semibold">Preco e estoque por variacao</p>
              <p className="text-xs">
                Cada variacao tem seu proprio preco, estoque, foto e codigo de barras. Preencha
                esses dados na secao de variacoes abaixo.
              </p>
            </div>
          )}

          {/* Variants section */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">
                  Variacoes
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Cor, tamanho, volume, sabor, numeracao, etc.
                </p>
              </div>
              {!isAddingExistingVariation ? (
                <button
                  type="button"
                  onClick={() => setHasVariants((v) => !v)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    hasVariants ? "bg-slate-950" : "bg-slate-200"
                  }`}
                  role="switch"
                  aria-checked={hasVariants}
                >
                  <span
                    className={`inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${
                      hasVariants ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              ) : null}
            </div>

            {isVariantProduct ? (
              <div className="mt-4">
                <VariantBuilderField
                  key={`variant-builder-${formResetKey}-${storeProfile}`}
                  name="variantsDefinition"
                  initialDefinition={initialValues?.variantsDefinition || ""}
                  suggestedTypes={profilePreset.variationTypes}
                  allowImages={catalogUsesImages}
                />
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                Desativado — produto simples com um preco e um estoque.
              </p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="grid gap-5 content-start">
          {/* Organization */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-950">Organizacao</p>

            <div className="mt-4 grid gap-4">
              {!isAddingExistingVariation ? (
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Categoria
                  <select
                    required
                    name="categoryId"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {hasBrandAttribute ? (
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Marca / fornecedor
                  <input
                    name="brandSupplier"
                    value={brandSupplier}
                    onChange={(event) => setBrandSupplier(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    placeholder="Ex.: Nike, Ruby Rose"
                  />
                </label>
              ) : (
                <input type="hidden" name="brandSupplier" value={brandSupplier} />
              )}

              {visibleAttributes.map((attribute) => (
                <label
                  key={attribute.key}
                  className="grid gap-2 text-sm font-medium text-slate-700"
                >
                  {attribute.label}
                  {attribute.type === "select" ? (
                    <select
                      value={attributeValues[attribute.key] || ""}
                      onChange={(event) =>
                        setAttributeValues((c) => ({
                          ...c,
                          [attribute.key]: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                    >
                      <option value="">Selecione</option>
                      {(attribute.options || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={getInputType(attribute)}
                      value={attributeValues[attribute.key] || ""}
                      onChange={(event) =>
                        setAttributeValues((c) => ({
                          ...c,
                          [attribute.key]: event.target.value,
                        }))
                      }
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                      placeholder={attribute.placeholder || "Opcional"}
                    />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Publication */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-950">Publicacao</p>
            <div className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={initialValues ? initialValues.isActive : true}
                  className="size-4 rounded border-slate-300 accent-slate-950"
                />
                Produto ativo no catalogo
              </label>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="isFeatured"
                  defaultChecked={initialValues?.isFeatured || false}
                  className="size-4 rounded border-slate-300 accent-slate-950"
                />
                Destacar no topo
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Observacoes internas
              <textarea
                name="notes"
                rows={3}
                defaultValue={initialValues?.notes || ""}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900"
                placeholder="Nao aparece no catalogo. Ex.: fornecedor, lote."
              />
            </label>
          </div>

          {/* Save */}
          <div className="rounded-[28px] border border-slate-200 bg-white p-5">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {isPending ? "Salvando..." : submitLabel}
            </button>
            {!isEditing ? (
              <p className="mt-3 text-center text-xs text-slate-400">
                Apos salvar, o form e resetado para voce cadastrar o proximo produto.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
