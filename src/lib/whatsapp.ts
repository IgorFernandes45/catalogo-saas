import { formatCurrency, normalizeWhatsapp } from "@/lib/utils";

type WhatsAppItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  attributes?: string[];
};

type WhatsAppOrder = {
  storeName: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryNumber?: string;
  deliveryDistrict?: string;
  deliveryCity?: string;
  deliveryComplement?: string;
  deliveryReference?: string;
  notes?: string;
  items: WhatsAppItem[];
};

type QuickBuyMessage = {
  storeName: string;
  productName: string;
  unitPrice: number;
  attributes?: string[];
  productUrl?: string;
};

export function buildWhatsAppMessage(order: WhatsAppOrder) {
  const addressParts = [
    order.deliveryAddress?.trim(),
    order.deliveryNumber?.trim(),
    order.deliveryDistrict?.trim(),
    order.deliveryCity?.trim(),
  ].filter(Boolean);

  const lines = [
    "Ola, quero fazer este pedido:",
    "",
    `Loja: ${order.storeName}`,
    "",
    `Cliente: ${order.customerName}`,
    `Telefone: ${order.customerPhone}`,
  ];

  lines.push(
    addressParts.length ? `Endereco: ${addressParts.join(", ")}` : "Endereco: Nao informado",
  );

  if (order.deliveryComplement) {
    lines.push(`Complemento: ${order.deliveryComplement}`);
  }

  if (order.deliveryReference) {
    lines.push(`Referencia: ${order.deliveryReference}`);
  }

  lines.push("", "Itens:");

  const subtotal = order.items.reduce(
    (total, item) => total + item.quantity * item.unitPrice,
    0,
  );

  order.items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.productName}${item.attributes?.length ? ` - ${item.attributes.join(" - ")}` : ""}`,
      `Qtd: ${item.quantity}`,
      `Preco: ${formatCurrency(item.unitPrice)}`,
    );

    if (item.notes) {
      lines.push(`Obs item: ${item.notes}`);
    }

    lines.push("");
  });

  lines.push(`Subtotal: ${formatCurrency(subtotal)}`);

  if (order.notes) {
    lines.push("", `Observacoes: ${order.notes}`);
  }

  return lines.join("\n");
}

export function createWhatsAppLink(phone: string, message: string) {
  const cleanPhone = normalizeWhatsapp(phone);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildQuickBuyMessage({
  storeName,
  productName,
  unitPrice,
  attributes = [],
  productUrl,
}: QuickBuyMessage) {
  const lines = [
    "Ola, quero comprar este item agora:",
    "",
    `Loja: ${storeName}`,
    `Produto: ${productName}`,
    `Preco: ${formatCurrency(unitPrice)}`,
  ];

  if (attributes.length) {
    lines.push(`Detalhes: ${attributes.join(" - ")}`);
  }

  if (productUrl) {
    lines.push(`Link do produto: ${productUrl}`);
  }

  lines.push("", "Pode me atender por aqui?");

  return lines.join("\n");
}
