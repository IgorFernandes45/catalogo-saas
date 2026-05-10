export type StoreProfileKey =
  | "FASHION"
  | "BEAUTY"
  | "DRINKS"
  | "FOOD_MARKET"
  | "ELECTRONICS"
  | "CUSTOM";

export type ProductAttributePreset = {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "date" | "select";
  options?: string[];
  required?: boolean;
};

export type StoreProfilePreset = {
  key: StoreProfileKey;
  name: string;
  description: string;
  examples: string;
  attributes: ProductAttributePreset[];
  variationTypes: string[];
  imageHint: string;
};

export const storeProfilePresets: StoreProfilePreset[] = [
  {
    key: "FASHION",
    name: "Moda e Calcados",
    description: "Roupas, sapatos e acessorios de moda.",
    examples: "Tenis, vestidos, bolsas, camisetas e sandalias.",
    attributes: [
      { key: "brand", label: "Marca", placeholder: "Nike, Colcci, Reserva" },
      { key: "model", label: "Modelo", placeholder: "Air, Slim, Wide Leg" },
      { key: "gender", label: "Genero", type: "select", options: ["Masculino", "Feminino", "Unissex", "Infantil"] },
      { key: "material", label: "Material/tecido", placeholder: "Couro, algodao, dry fit" },
    ],
    variationTypes: ["Cor", "Tamanho", "Numeracao", "Modelo"],
    imageHint: "Fotos por cor ou combinacao de cor + numeracao.",
  },
  {
    key: "BEAUTY",
    name: "Maquiagem e Cosmeticos",
    description: "Maquiagem, cosmeticos, skin care e perfumes.",
    examples: "Base, batom, perfume, corretivo, serum e po.",
    attributes: [
      { key: "brand", label: "Marca", placeholder: "Ruby Rose, Eudora, Natura" },
      { key: "collection", label: "Linha/colecao", placeholder: "Niina Secrets, Skin Glow" },
      { key: "productType", label: "Tipo de produto", placeholder: "Base, batom, perfume" },
      { key: "finish", label: "Acabamento", placeholder: "Matte, glow, cremoso" },
      { key: "indication", label: "Indicacao", placeholder: "Pele oleosa, seca, todos os tipos" },
      { key: "validity", label: "Validade", type: "date" },
    ],
    variationTypes: ["Tom", "Cor", "Volume/Peso", "Acabamento"],
    imageHint: "Fotos por tom, cor ou volume.",
  },
  {
    key: "DRINKS",
    name: "Bebidas",
    description: "Distribuidora, adega, conveniencia e loja de bebidas.",
    examples: "Cerveja, whisky, energetico, refrigerante e agua.",
    attributes: [
      { key: "brand", label: "Marca", placeholder: "Heineken, Red Bull, Coca-Cola" },
      { key: "drinkType", label: "Tipo", placeholder: "Cerveja, energetico, suco" },
      { key: "packageType", label: "Embalagem", placeholder: "Lata, garrafa, pack, caixa" },
      { key: "alcoholContent", label: "Teor alcoolico", placeholder: "5%, 40%" },
      { key: "saleUnit", label: "Unidade de venda", placeholder: "Unidade, fardo, caixa" },
      { key: "packageQuantity", label: "Quantidade por embalagem", placeholder: "6, 12, 24" },
    ],
    variationTypes: ["Volume", "Sabor", "Embalagem", "Unidade"],
    imageHint: "Fotos por volume, pack, sabor ou embalagem.",
  },
  {
    key: "FOOD_MARKET",
    name: "Alimentos e Mercado",
    description: "Mercadinho, supermercado, alimentos e hortifruti.",
    examples: "Arroz, cafe, chocolate, frutas, carnes e congelados.",
    attributes: [
      { key: "brand", label: "Marca", placeholder: "Tio Joao, 3 Coracoes" },
      { key: "foodType", label: "Tipo", placeholder: "Graos, congelado, hortifruti" },
      { key: "saleUnit", label: "Unidade de venda", placeholder: "Unidade, kg, pacote, caixa" },
      { key: "validity", label: "Validade", type: "date" },
    ],
    variationTypes: ["Peso/Volume", "Sabor", "Unidade", "Tipo"],
    imageHint: "Fotos por peso, sabor ou embalagem.",
  },
  {
    key: "ELECTRONICS",
    name: "Eletronicos e Acessorios",
    description: "Celulares, informatica, eletronicos e acessorios.",
    examples: "Capinha, carregador, fone, celular e notebook.",
    attributes: [
      { key: "brand", label: "Marca", placeholder: "Apple, Samsung, JBL" },
      { key: "model", label: "Modelo", placeholder: "iPhone 15, Galaxy A55" },
      { key: "compatibility", label: "Compatibilidade", placeholder: "USB-C, iPhone, Android" },
      { key: "capacity", label: "Capacidade", placeholder: "128GB, 20W, 6.5 polegadas" },
      { key: "voltage", label: "Voltagem", placeholder: "110V, 220V, bivolt" },
      { key: "warranty", label: "Garantia", placeholder: "3 meses, 1 ano" },
    ],
    variationTypes: ["Cor", "Modelo", "Capacidade", "Voltagem"],
    imageHint: "Fotos por cor, modelo ou capacidade.",
  },
  {
    key: "CUSTOM",
    name: "Perfil Personalizado",
    description: "Para lojas com atributos proprios.",
    examples: "Servicos, presentes, artesanato ou nichos especificos.",
    attributes: [
      { key: "brand", label: "Marca/fornecedor", placeholder: "Opcional" },
      { key: "model", label: "Modelo", placeholder: "Opcional" },
    ],
    variationTypes: ["Cor", "Tamanho", "Modelo"],
    imageHint: "Escolha as variacoes que fizerem sentido para sua loja.",
  },
];

export function getStoreProfilePreset(profile?: string | null) {
  return (
    storeProfilePresets.find((preset) => preset.key === profile) ||
    storeProfilePresets[storeProfilePresets.length - 1]
  );
}

export function parseEnabledAttributes(rawValue?: string | null, profile?: string | null) {
  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue) as ProductAttributePreset[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch {
      // Fall back to preset below.
    }
  }

  return getStoreProfilePreset(profile).attributes;
}

export function serializeEnabledAttributes(attributes: ProductAttributePreset[]) {
  return JSON.stringify(attributes);
}

export function parseProductAttributeValues(rawValue?: string | null) {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function buildProductAttributeList({
  rawValues,
  enabledAttributes,
  brandSupplier,
}: {
  rawValues?: string | null;
  enabledAttributes: ProductAttributePreset[];
  brandSupplier?: string | null;
}) {
  const values = parseProductAttributeValues(rawValues);
  const labelByKey = new Map(enabledAttributes.map((attribute) => [attribute.key, attribute.label]));
  const entries = Object.entries(values)
    .filter(([, value]) => value?.trim())
    .map(([key, value]) => ({
      name: labelByKey.get(key) || key,
      value,
    }));

  if (brandSupplier?.trim() && !entries.some((entry) => entry.name === "Marca")) {
    entries.unshift({
      name: "Marca",
      value: brandSupplier.trim(),
    });
  }

  return entries.slice(0, 8);
}
