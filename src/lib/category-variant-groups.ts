export type CategoryVariantGroup = {
  name: string;
  options: string[];
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export function parseCategoryVariantGroupsDefinition(rawValue: string) {
  return rawValue
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", optionsRaw = ""] = line.split("|").map((item) => item.trim());

      return {
        name,
        options: optionsRaw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      } satisfies CategoryVariantGroup;
    })
    .filter((group) => group.name);
}

export function serializeCategoryVariantGroupsDefinition(groups: CategoryVariantGroup[]) {
  return groups
    .map((group) =>
      group.options.length ? `${group.name}|${group.options.join(",")}` : group.name,
    )
    .join("\n");
}

export function parseCategoryVariantGroupsJson(rawValue: string | null | undefined) {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as CategoryVariantGroup[];

    return parsed
      .filter((group) => group?.name && Array.isArray(group.options))
      .map((group) => ({
        name: group.name.trim(),
        options: group.options.map((option) => option.trim()).filter(Boolean),
      }))
      .filter((group) => group.name);
  } catch {
    return [];
  }
}

export function validateVariantAttributesAgainstGroups(
  groups: CategoryVariantGroup[],
  attributes: Record<string, string>,
) {
  if (!groups.length) {
    return true;
  }

  const groupMap = new Map(
    groups.map((group) => [
      normalizeKey(group.name),
      new Set(group.options.map((option) => normalizeKey(option))),
    ]),
  );
  const attributeEntries = Object.entries(attributes);

  if (attributeEntries.length !== groups.length) {
    return false;
  }

  return attributeEntries.every(([key, value]) => {
    const allowedOptions = groupMap.get(normalizeKey(key));

    if (!allowedOptions || !value.trim()) {
      return false;
    }

    return !allowedOptions.size || allowedOptions.has(normalizeKey(value));
  });
}
