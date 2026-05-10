export type CartItem = {
  selectionKey: string;
  productId: string;
  productVariantId?: string;
  productName: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
  attributes: string[];
  notes?: string;
};

export const cartChangeEvent = "catalogo-cart-change";

export function buildCartKey(slug: string) {
  return `catalogo-cart:${slug}`;
}

export function readCart(cartKey: string): CartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(cartKey);

  if (!stored) {
    return [];
  }

  try {
    return (JSON.parse(stored) as Array<Partial<CartItem>>).map((item) => ({
      selectionKey:
        item.selectionKey ||
        `${item.productId || "product"}::${(item.attributes || []).join("|")}`,
      productId: item.productId || "",
      productVariantId: item.productVariantId || undefined,
      productName: item.productName || "",
      slug: item.slug || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      imageUrl: item.imageUrl || "",
      attributes: item.attributes || [],
      notes: item.notes,
    }));
  } catch {
    return [];
  }
}

export function writeCart(cartKey: string, items: CartItem[]) {
  window.localStorage.setItem(cartKey, JSON.stringify(items));
  window.dispatchEvent(new Event(cartChangeEvent));
}

export function addItemToCart(cartKey: string, item: Omit<CartItem, "quantity">) {
  const current = readCart(cartKey);
  const existing = current.find((entry) => entry.selectionKey === item.selectionKey);

  if (existing) {
    writeCart(
      cartKey,
      current.map((entry) =>
        entry.selectionKey === item.selectionKey
          ? { ...entry, quantity: entry.quantity + 1 }
          : entry,
      ),
    );
    return;
  }

  writeCart(cartKey, [...current, { ...item, quantity: 1 }]);
}
