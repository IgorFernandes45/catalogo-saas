"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  Package,
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

const steps = [
  "Informacoes",
  "Preco e estoque",
  "Variacoes",
  "Fotos",
  "Publicacao",
];

function getInputType(attribute: ProductAttributePreset) {
  if (attribute.type === "date") {
    return "date";
  }

  if (attribute.type === "number") {
    return "number";
  }

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
  const [currentStep, setCurrentStep] = useState(0);
  const [registrationMode, setRegistrationMode] = useState<"new" | "existing">(
    initialValues ? "new" : "new",
  );
  const [parentProductId, setParentProductId] = useState("");
  const [categoryId, setCategoryId] = useState(
    initialValues?.categoryId || categories[0]?.id || "",
  );
  const [productMode, setProductMode] = useState<"simple" | "variants">(
    initialValues?.variantsDefinition ? "variants" : "simple",
  );
  const [formResetKey, setFormResetKey] = useState(0);
  const [productName, setProductName] = useState(initialValues?.name || "");
  const [price, setPrice] = useState(initialValues?.price || "");
  const [promotionalPrice, setPromotionalPrice] = useState(
    initialValues?.promotionalPrice || "",
  );
  const [costPrice, setCostPrice] = useState(initialValues?.costPrice || "");
  const [barcode, setBarcode] = useState(initialValues?.barcode || "");
  const [brandSupplier, setBrandSupplier] = useState(initialValues?.brandSupplier || "");
  const [attributeValues, setAttributeValues] = useState<Record<string, string>>(
    initialValues?.productAttributes || {},
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEditing = Boolean(initialValues);

  const profilePreset = useMemo(
    () => getStoreProfilePreset(storeProfile),
    [storeProfile],
  );
  const enabledAttributes = useMemo(
    () => parseEnabledAttributes(productAttributesJson, storeProfile),
    [productAttributesJson, storeProfile],
  );
  const visibleAttributes = enabledAttributes.filter((attribute) => attribute.key !== "brand");
  const hasBrandAttribute = enabledAttributes.some((attribute) => attribute.key === "brand");
  const selectedParentProduct = existingProducts.find((product) => product.id === parentProductId);
  const isAddingExistingVariation = registrationMode === "existing" && Boolean(selectedParentProduct);
  const isVariantProduct = productMode === "variants" || isAddingExistingVariation;
  const finalPrice = parseCurrency(promotionalPrice) || parseCurrency(price);
  const cost = parseCurrency(costPrice);
  const estimatedProfit = finalPrice - cost;
  const margin = finalPrice > 0 ? (estimatedProfit / finalPrice) * 100 : 0;
  const serializedProductAttributes = JSON.stringify({
    ...(hasBrandAttribute && brandSupplier.trim() ? { brand: brandSupplier.trim() } : {}),
    ...Object.fromEntries(
      Object.entries(attributeValues).filter(([, value]) => value.trim()),
    ),
  });

  function validateCurrentStep(): Record<string, string> {
    const errors: Record<string, string> = {};

    if (currentStep === 0 && !isAddingExistingVariation) {
      if (!productName.trim()) {
        errors.name = "Informe o nome do produto.";
      } else if (productName.trim().length < 2) {
        errors.name = "O nome precisa ter pelo menos 2 caracteres.";
      }
    }

    if (currentStep === 1 && !isVariantProduct) {
      const parsed = parseCurrency(price);
      if (!price.trim()) {
        errors.price = "Informe o preco do produto.";
      } else if (isNaN(parsed) || parsed <= 0) {
        errors.price = "Preco invalido. Use o formato 59,90.";
      }
    }

    return errors;
  }

  function goToStep(index: number) {
    if (index > currentStep) {
      const errors = validateCurrentStep();
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }
    }
    setFieldErrors({});
    setCurrentStep(Math.max(0, Math.min(steps.length - 1, index)));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

          if (productMode === "simple") {
            formData.set("variantsDefinition", "");
          }

          if (isAddingExistingVariation && selectedParentProduct) {
            formData.set("parentProductId", selectedParentProduct.id);
            formData.set("name", selectedParentProduct.name);
            formData.set("categoryId", selectedParentProduct.categoryId);
            formData.set("price", String(selectedParentProduct.price).replace(".", ","));
            formData.set("slug", "");
            formData.set("variantsDefinition", formData.get("variantsDefinition") || "");
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
              setProductMode("simple");
              setRegistrationMode("new");
              setParentProductId("");
              setAttributeValues({});
              setBrandSupplier("");
              setPrice("");
              setPromotionalPrice("");
              setCostPrice("");
              setBarcode("");
              setFieldErrors({});
              setCurrentStep(0);
              setFormResetKey((current) => current + 1);
            }
            router.refresh();
          }
        });
      }}
      className="grid gap-5"
    >
      <input type="hidden" name="customValues" value="[]" />
      <input type="hidden" name="parentProductId" value={parentProductId} />
      <input type="hidden" name="productAttributesJson" value={serializedProductAttributes} />
      <input type="hidden" name="trackStock" value="on" />

      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">
              Cadastro rapido para {profilePreset.name}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Campos recomendados ja filtrados para esse tipo de loja.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {currentStep + 1} de {steps.length}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-5 gap-2">
          {steps.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => goToStep(index)}
              className={`rounded-full px-2 py-2 text-[11px] font-semibold transition sm:text-xs ${
                currentStep === index
                  ? "bg-slate-950 text-white"
                  : index < currentStep
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-white text-slate-500"
              }`}
            >
              {step}
            </button>
          ))}
        </div>
      </div>

      {!isEditing ? (
        <section className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-orange-500">
              Primeiro passo
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">
              O que voce quer cadastrar?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Produto com variacao funciona como vitrine: o produto base aparece no catalogo
              e cada variacao tem seu proprio preco, estoque, foto e codigo de barras.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setRegistrationMode("new");
                setParentProductId("");
              }}
              className={`rounded-[24px] border p-4 text-left text-sm transition ${
                registrationMode === "new"
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <span className="font-semibold">Produto novo</span>
              <span className="mt-1 block opacity-80">
                Cria um produto simples ou um produto base com variacoes.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!existingProducts.length) {
                  return;
                }
                setRegistrationMode("existing");
                setProductMode("variants");
                setParentProductId((current) => current || existingProducts[0]?.id || "");
                setCurrentStep(2);
              }}
              disabled={!existingProducts.length}
              className={`rounded-[24px] border p-4 text-left text-sm transition ${
                registrationMode === "existing"
                  ? "border-orange-500 bg-orange-50 text-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              }`}
            >
              <span className="font-semibold">Variação de produto existente</span>
              <span className="mt-1 block opacity-80">
                Adiciona cor, tamanho, tom, volume ou sabor ao mesmo produto.
              </span>
            </button>
          </div>

          {registrationMode === "new" ? (
            <div className="grid gap-3 rounded-[24px] bg-slate-50 p-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setProductMode("simple")}
                className={`rounded-[20px] border p-4 text-left text-sm transition ${
                  productMode === "simple"
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className="font-semibold">Produto simples</span>
                <span className="mt-1 block opacity-80">
                  Um preco, um estoque, uma foto e um codigo.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setProductMode("variants")}
                className={`rounded-[20px] border p-4 text-left text-sm transition ${
                  productMode === "variants"
                    ? "border-orange-500 bg-orange-50 text-slate-950"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <span className="font-semibold">Produto com variacoes</span>
                <span className="mt-1 block opacity-80">
                  Ex.: cor/tamanho, tom, volume, sabor ou numeracao.
                </span>
              </button>
            </div>
          ) : null}

          {registrationMode === "existing" ? (
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Produto base
              <select
                value={parentProductId}
                onChange={(event) => {
                  setParentProductId(event.target.value);
                  setProductMode("variants");
                }}
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              >
                {existingProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>
      ) : null}

      <section className={currentStep === 0 ? "grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5" : "hidden"}>
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-orange-500">
              Etapa 1
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              Informacoes basicas
            </h3>
          </div>

          {isAddingExistingVariation && selectedParentProduct ? (
            <div className="rounded-[24px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900">
              <p className="font-semibold">Produto base selecionado</p>
              <p>{selectedParentProduct.name}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Agora preencha os dados da variacao na etapa 3.
              </p>
            </div>
          ) : null}

          <div
            className={`grid gap-4 xl:grid-cols-2 ${
              isAddingExistingVariation ? "hidden" : ""
            }`}
          >
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Nome do produto
              <input
                name="name"
                value={productName}
                onChange={(event) => {
                  setProductName(event.target.value);
                  if (fieldErrors.name) {
                    setFieldErrors((current) => ({ ...current, name: "" }));
                  }
                }}
                className={`min-w-0 rounded-2xl border px-4 py-3 ${
                  fieldErrors.name ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
                placeholder="Ex.: Tenis Nike Air"
              />
              {fieldErrors.name ? (
                <span className="text-xs text-red-600">{fieldErrors.name}</span>
              ) : null}
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Categoria
              <select
                required={!isAddingExistingVariation}
                name="categoryId"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            {hasBrandAttribute ? (
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                Marca/fornecedor
                <input
                  name="brandSupplier"
                  value={brandSupplier}
                  onChange={(event) => setBrandSupplier(event.target.value)}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="Ex.: Nike, Ruby Rose, Coca-Cola"
                />
              </label>
            ) : (
              <input type="hidden" name="brandSupplier" value={brandSupplier} />
            )}

            {visibleAttributes.map((attribute) => (
              <label key={attribute.key} className="grid gap-2 text-sm font-medium text-slate-700">
                {attribute.label}
                {attribute.type === "select" ? (
                  <select
                    value={attributeValues[attribute.key] || ""}
                    onChange={(event) =>
                      setAttributeValues((current) => ({
                        ...current,
                        [attribute.key]: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3"
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
                      setAttributeValues((current) => ({
                        ...current,
                        [attribute.key]: event.target.value,
                      }))
                    }
                    className="rounded-2xl border border-slate-200 px-4 py-3"
                    placeholder={attribute.placeholder || "Opcional"}
                  />
                )}
              </label>
            ))}
          </div>

          <label className={`grid gap-2 text-sm font-medium text-slate-700 ${isAddingExistingVariation ? "hidden" : ""}`}>
            Descricao curta
            <textarea
              name="shortDescription"
              rows={3}
              defaultValue={initialValues?.shortDescription || ""}
              className="rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Uma frase simples para aparecer no catalogo."
            />
          </label>

          <input type="hidden" name="slug" defaultValue={initialValues?.slug || ""} />
          <input type="hidden" name="fullDescription" defaultValue={initialValues?.fullDescription || ""} />
          <input type="hidden" name="weight" defaultValue={initialValues?.weight || ""} />
        </section>

      <section className={currentStep === 1 ? "grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5" : "hidden"}>
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-orange-500">
              Etapa 2
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              Preco e estoque
            </h3>
          </div>

          {isVariantProduct ? (
            <div className="rounded-[24px] bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              Produto com variacao nao usa preco duplicado no produto base. Preencha
              preco, estoque, SKU, codigo de barras e foto diretamente na variacao.
            </div>
          ) : null}

          <div className={`grid gap-4 xl:grid-cols-2 ${isVariantProduct ? "hidden" : ""}`}>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Preco normal
              <input
                name="price"
                value={price}
                onChange={(event) => {
                  setPrice(event.target.value);
                  if (fieldErrors.price) {
                    setFieldErrors((current) => ({ ...current, price: "" }));
                  }
                }}
                placeholder="59,90"
                className={`min-w-0 rounded-2xl border px-4 py-3 ${
                  fieldErrors.price ? "border-red-400 bg-red-50" : "border-slate-200"
                }`}
              />
              {fieldErrors.price ? (
                <span className="text-xs text-red-600">{fieldErrors.price}</span>
              ) : null}
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Preco promocional
              <input
                name="promotionalPrice"
                value={promotionalPrice}
                onChange={(event) => setPromotionalPrice(event.target.value)}
                placeholder="49,90"
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Estoque
              <input
                type="number"
                name="stockQuantity"
                defaultValue={initialValues?.stockQuantity ?? 0}
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Custo do produto
              <input
                name="costPrice"
                value={costPrice}
                onChange={(event) => setCostPrice(event.target.value)}
                placeholder="32,50"
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              SKU/codigo interno
              <input
                name="sku"
                defaultValue={initialValues?.sku || ""}
                className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Codigo de barras
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                <input
                  ref={barcodeRef}
                  name="barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  className="min-w-0 rounded-2xl border border-slate-200 px-4 py-3"
                  placeholder="Clique e leia com o leitor"
                  autoComplete="off"
                  inputMode="numeric"
                />
                <button
                  type="button"
                  onClick={() => barcodeRef.current?.focus()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-3 text-xs font-semibold text-white"
                >
                  <ScanBarcode className="size-4" />
                  Ler
                </button>
              </div>
            </label>
          </div>

          <input type="hidden" name="profitMarginPercent" value={margin ? margin.toFixed(2) : ""} />

          <div className={`grid gap-3 rounded-[24px] bg-slate-50 p-4 text-sm md:grid-cols-3 ${isVariantProduct ? "hidden" : ""}`}>
            <p>
              <span className="block text-xs uppercase tracking-[0.14em] text-slate-500">
                Preco final
              </span>
              <strong>{formatCurrency(finalPrice)}</strong>
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.14em] text-slate-500">
                Lucro estimado
              </span>
              <strong>{formatCurrency(estimatedProfit)}</strong>
            </p>
            <p>
              <span className="block text-xs uppercase tracking-[0.14em] text-slate-500">
                Margem automatica
              </span>
              <strong>{margin.toFixed(1)}%</strong>
            </p>
          </div>
      </section>

      <section className={currentStep === 2 ? "grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5" : "hidden"}>
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-orange-500">
              Etapa 3
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              Produto simples ou com variacoes
            </h3>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                if (!isAddingExistingVariation) {
                  setProductMode("simple");
                }
              }}
              disabled={isAddingExistingVariation}
              className={`rounded-[24px] border p-5 text-left transition ${
                productMode === "simple"
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <Package className="size-6" />
              <p className="mt-3 font-semibold">Cadastrar produto simples</p>
              <p className="mt-1 text-sm opacity-80">
                {isAddingExistingVariation
                  ? "Produto existente sempre recebe uma variacao vendavel."
                  : "Sem cor, tamanho, sabor ou estoque separado."}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setProductMode("variants")}
              className={`rounded-[24px] border p-5 text-left transition ${
                productMode === "variants"
                  ? "border-orange-600 bg-orange-50 text-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              <Sparkles className="size-6 text-orange-600" />
              <p className="mt-3 font-semibold">Cadastrar com variacoes</p>
              <p className="mt-1 text-sm opacity-80">
                Cadastre uma cor, tamanho, volume, tom, sabor ou numeracao por vez.
              </p>
            </button>
          </div>

          {productMode === "variants" ? (
            <VariantBuilderField
              key={`variant-builder-${formResetKey}-${storeProfile}`}
              name="variantsDefinition"
              initialDefinition={initialValues?.variantsDefinition || ""}
              suggestedTypes={profilePreset.variationTypes}
              allowImages={catalogUsesImages}
            />
          ) : (
            <div className="rounded-[24px] bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Produto simples vai usar o preco, estoque, foto e codigo da etapa anterior.
            </div>
          )}
      </section>

      <section className={currentStep === 3 ? "grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5" : "hidden"}>
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-orange-500">
              Etapa 4
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Fotos</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {profilePreset.imageHint}
            </p>
          </div>
          {catalogUsesImages ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <ImageUploadField
              key={`product-image-${formResetKey}`}
              name="imageUrl"
              label="Foto principal"
              purpose="product"
              initialUrl={initialValues?.imageUrl || ""}
              helpText="Essa foto aparece no card do catalogo."
            />
            <MultiImageUploadField
              key={`product-gallery-${formResetKey}`}
              name="gallery"
              label="Fotos extras"
              purpose="product"
              initialUrls={(initialValues?.gallery || "")
                .split("\n")
                .map((item) => item.trim())
                .filter(Boolean)}
              helpText="Use para detalhes do produto. Foto por variacao fica na etapa 3."
            />
          </div>
          ) : (
            <div className="rounded-[24px] bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              Esta loja esta configurada para catalogo sem fotos. O cadastro continua rapido,
              e os produtos aparecem em cards somente com texto e preco.
              <input type="hidden" name="imageUrl" value={initialValues?.imageUrl || ""} />
              <input type="hidden" name="gallery" value={initialValues?.gallery || ""} />
            </div>
          )}
      </section>

      <section className={currentStep === 4 ? "grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5" : "hidden"}>
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-orange-500">
              Etapa 5
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">Publicacao</h3>
          </div>

          <div className="grid gap-3 rounded-[28px] bg-slate-50 p-5 text-sm text-slate-700 sm:grid-cols-3">
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={initialValues ? initialValues.isActive : true}
                className="size-4 rounded border-slate-300"
              />
              Produto ativo
            </label>
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                name="isFeatured"
                defaultChecked={initialValues?.isFeatured || false}
                className="size-4 rounded border-slate-300"
              />
              Destaque
            </label>
            <span className="inline-flex items-center gap-2 font-semibold text-emerald-700">
              <CheckCircle2 className="size-4" />
              Pronto para salvar
            </span>
          </div>

          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Observacoes internas
            <textarea
              name="notes"
              rows={3}
              defaultValue={initialValues?.notes || ""}
              className="rounded-2xl border border-slate-200 px-4 py-3"
              placeholder="Opcional. Nao aparece no catalogo."
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {isPending ? "Salvando..." : submitLabel}
          </button>
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goToStep(currentStep - 1)}
          disabled={currentStep === 0}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => goToStep(currentStep + 1)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
          >
            Proximo
            <ArrowRight className="size-4" />
          </button>
        ) : null}
      </div>
    </form>
  );
}
