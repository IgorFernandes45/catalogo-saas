import { splitOptionValues } from "@/lib/utils";

type ProductAttribute = {
  name: string;
  value: string;
};

type ProductVariant = {
  id: string;
  label: string;
  imageUrl?: string | null;
  unitPrice: number;
  regularPrice?: number;
  promotionalPrice?: number | null;
  discountPercent?: number | null;
  sku?: string | null;
  barcode?: string | null;
  stockQuantity: number;
  isActive: boolean;
  attributes: Record<string, string>;
};

type ProductOptionSource = {
  color?: string | null;
  size?: string | null;
  fabric?: string | null;
  trackStock?: boolean;
  stockQuantity?: number | null;
  customAttributes?: ProductAttribute[];
  variants?: ProductVariant[];
};

export type ProductOptionGroup = {
  key: string;
  label: string;
  options: string[];
};

function formatAttributeLabel(key: string) {
  const normalized = key.trim().toLowerCase();

  if (normalized === "cor") {
    return "Cor";
  }

  if (normalized === "tamanho") {
    return "Tamanho";
  }

  return key.trim();
}

export function getProductOptionGroups(product: ProductOptionSource) {
  if (product.variants?.length) {
    const groupsMap = new Map<string, Set<string>>();

    for (const variant of product.variants.filter((item) => item.isActive)) {
      for (const [rawKey, rawValue] of Object.entries(variant.attributes || {})) {
        const key = formatAttributeLabel(rawKey);
        const value = rawValue.trim();

        if (!value) {
          continue;
        }

        if (!groupsMap.has(key)) {
          groupsMap.set(key, new Set());
        }

        groupsMap.get(key)?.add(value);
      }
    }

    return [...groupsMap.entries()]
      .map(([label, options]) => ({
        key: label,
        label,
        options: [...options],
      }))
      .filter((group) => group.options.length > 1);
  }

  const groups: ProductOptionGroup[] = [];

  const colorOptions = splitOptionValues(product.color);
  if (colorOptions.length > 1) {
    groups.push({
      key: "Cor",
      label: "Cor",
      options: colorOptions,
    });
  }

  const sizeOptions = splitOptionValues(product.size);
  if (sizeOptions.length > 1) {
    groups.push({
      key: "Tamanho",
      label: "Tamanho",
      options: sizeOptions,
    });
  }

  for (const attribute of product.customAttributes || []) {
    const options = splitOptionValues(attribute.value);

    if (options.length > 1) {
      groups.push({
        key: attribute.name,
        label: attribute.name,
        options,
      });
    }
  }

  return groups;
}

export function getDefaultProductSelections(groups: ProductOptionGroup[]) {
  return groups.reduce<Record<string, string>>((accumulator, group) => {
    accumulator[group.key] = "";
    return accumulator;
  }, {});
}

export function findMatchingVariant(
  product: ProductOptionSource,
  selections: Record<string, string>,
) {
  if (!product.variants?.length) {
    return null;
  }

  const groups = getProductOptionGroups(product);

  if (!areRequiredSelectionsComplete(groups, selections)) {
    return null;
  }

  return (
    product.variants.find((variant) =>
      groups.every(
        (group) => variant.attributes[group.key] === selections[group.key],
      ),
    ) || null
  );
}

export function getAvailableProductOptions(
  product: ProductOptionSource,
  selections: Record<string, string>,
  targetGroupKey: string,
) {
  const groups = getProductOptionGroups(product);
  const targetGroup = groups.find((group) => group.key === targetGroupKey);

  if (!targetGroup) {
    return [];
  }

  if (!product.variants?.length) {
    if (product.trackStock && (product.stockQuantity ?? 0) <= 0) {
      return [];
    }

    return targetGroup?.options || [];
  }

  const activeVariants = product.variants.filter(
    (variant) => variant.isActive && variant.stockQuantity > 0,
  );

  return targetGroup.options.filter((option) =>
    activeVariants.some((variant) =>
      groups.every((group) => {
        const selectedValue =
          group.key === targetGroupKey ? option : selections[group.key];

        if (!selectedValue) {
          return true;
        }

        return variant.attributes[group.key] === selectedValue;
      }),
    ),
  );
}

export function completeProductSelections(
  product: ProductOptionSource,
  selections: Record<string, string>,
) {
  const groups = getProductOptionGroups(product);
  const completed = { ...selections };

  for (let index = 0; index < groups.length; index += 1) {
    let changed = false;

    for (const group of groups) {
      const availableOptions = getAvailableProductOptions(product, completed, group.key);
      const selectedValue = completed[group.key];

      if (selectedValue && !availableOptions.includes(selectedValue)) {
        completed[group.key] = "";
        changed = true;
        continue;
      }

      if (!selectedValue && availableOptions.length === 1) {
        completed[group.key] = availableOptions[0];
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return completed;
}

export function selectProductOption(
  product: ProductOptionSource,
  selections: Record<string, string>,
  changedGroupKey: string,
  option: string,
) {
  void product;
  const nextOption = selections[changedGroupKey] === option ? "" : option;

  return {
    ...selections,
    [changedGroupKey]: nextOption,
  };
}

export function buildSelectedProductAttributes(
  product: ProductOptionSource,
  selections: Record<string, string> = {},
) {
  const matchingVariant = findMatchingVariant(product, selections);

  if (matchingVariant) {
    const variantAttributes = Object.entries(matchingVariant.attributes).map(
      ([key, value]) => `${formatAttributeLabel(key)} ${value}`,
    );

    return [
      ...variantAttributes,
      ...(product.fabric?.trim() ? [`Tecido ${product.fabric.trim()}`] : []),
    ];
  }

  const optionGroups = getProductOptionGroups(product);
  const optionKeys = new Set(optionGroups.map((group) => group.key));
  const attributes: string[] = [];

  const colorOptions = splitOptionValues(product.color);
  if (colorOptions.length <= 1 && colorOptions[0]) {
    attributes.push(`Cor ${colorOptions[0]}`);
  } else if (selections.Cor) {
    attributes.push(`Cor ${selections.Cor}`);
  }

  const sizeOptions = splitOptionValues(product.size);
  if (sizeOptions.length <= 1 && sizeOptions[0]) {
    attributes.push(`Tam ${sizeOptions[0]}`);
  } else if (selections.Tamanho) {
    attributes.push(`Tam ${selections.Tamanho}`);
  }

  if (product.fabric?.trim()) {
    attributes.push(`Tecido ${product.fabric.trim()}`);
  }

  for (const attribute of product.customAttributes || []) {
    const options = splitOptionValues(attribute.value);

    if (optionKeys.has(attribute.name)) {
      if (selections[attribute.name]) {
        attributes.push(`${attribute.name} ${selections[attribute.name]}`);
      }
      continue;
    }

    if (options[0]) {
      attributes.push(`${attribute.name} ${options[0]}`);
    }
  }

  return attributes;
}

export function areRequiredSelectionsComplete(
  groups: ProductOptionGroup[],
  selections: Record<string, string>,
) {
  return groups.every((group) => Boolean(selections[group.key]?.trim()));
}
