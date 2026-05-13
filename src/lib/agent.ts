/**
 * AI agent core logic.
 * Builds the store context, calls Claude with tool use, and returns the reply text.
 */

import Anthropic from "@anthropic-ai/sdk";

import { prisma } from "@/lib/prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

// ─── Context builder ────────────────────────────────────────────────────────

async function buildStoreContext(storeId: string): Promise<string> {
  const [store, config, categories] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      select: { name: true, description: true, whatsappNumber: true, address: true },
    }),
    prisma.agentConfig.findUnique({
      where: { storeId },
    }),
    prisma.category.findMany({
      where: { storeId, isActive: true },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!store || !config) return "";

  const lines: string[] = [
    `Você é ${config.agentName}, assistente virtual da loja "${store.name}" no WhatsApp.`,
    ``,
    `## Sobre a loja`,
    store.description ? `Descrição: ${store.description}` : "",
    store.address ? `Endereço: ${store.address}` : "",
    ``,
    `## Entrega`,
    ...parseDeliveryZones(config.deliveryZonesJson),
    config.deliveryTime ? `Prazo de entrega: ${config.deliveryTime}` : "",
    config.deliveryFeeNote ? `Obs.: ${config.deliveryFeeNote}` : "",
    ``,
    `## Formas de pagamento`,
    config.acceptedPaymentsJson
      ? parsePayments(config.acceptedPaymentsJson)
      : "Consulte a loja.",
    ``,
    `## Horário de funcionamento`,
    config.openingHours || "Consulte a loja.",
    ``,
    `## Instruções especiais`,
    config.customInstructions || "Seja cordial, objetivo e ajude o cliente.",
    ``,
    `## Categorias disponíveis`,
    categories.map((c) => `- ${c.name} (id: ${c.id})`).join("\n"),
    ``,
    `## Comportamento`,
    `- Use as ferramentas disponíveis para buscar produtos e criar pedidos.`,
    `- Sempre confirme o pedido com o cliente antes de finalizar.`,
    `- Se não souber algo, diga que vai verificar ou peça ao cliente para ligar.`,
    `- Responda em português brasileiro, de forma amigável e concisa.`,
    `- Não invente informações que não foram fornecidas acima.`,
  ];

  return lines.filter((l) => l !== undefined).join("\n");
}

function parseDeliveryZones(json: string | null | undefined): string[] {
  if (!json) return ["Taxa de entrega: consulte a loja."];
  try {
    const zones = JSON.parse(json) as { area: string; fee: string }[];
    if (!zones.length) return [];
    return [
      "Taxas de entrega por zona:",
      ...zones.map((z) => `  - ${z.area}: ${z.fee}`),
    ];
  } catch {
    return [];
  }
}

function parsePayments(json: string): string {
  try {
    const arr = JSON.parse(json) as string[];
    return arr.join(", ");
  } catch {
    return json;
  }
}

// ─── Tool definitions ────────────────────────────────────────────────────────

const tools: Anthropic.Tool[] = [
  {
    name: "buscar_produtos",
    description:
      "Busca produtos ativos da loja por nome ou categoria. Use para responder dúvidas sobre produtos, preços e disponibilidade.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Texto a buscar no nome do produto (opcional)",
        },
        categoryId: {
          type: "string",
          description: "Filtrar por categoria específica (opcional)",
        },
        limit: {
          type: "number",
          description: "Máximo de resultados (padrão: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "obter_detalhes_produto",
    description:
      "Retorna detalhes completos de um produto, incluindo variações e estoque.",
    input_schema: {
      type: "object" as const,
      properties: {
        productId: {
          type: "string",
          description: "ID do produto",
        },
      },
      required: ["productId"],
    },
  },
  {
    name: "criar_pedido",
    description:
      "Registra um pedido no sistema da loja após confirmação do cliente.",
    input_schema: {
      type: "object" as const,
      properties: {
        customerName: {
          type: "string",
          description: "Nome do cliente",
        },
        customerPhone: {
          type: "string",
          description: "Telefone do cliente (já disponível no contexto)",
        },
        items: {
          type: "array",
          description: "Itens do pedido",
          items: {
            type: "object",
            properties: {
              productId: { type: "string" },
              productVariantId: { type: "string" },
              quantity: { type: "number" },
              unitPrice: { type: "number" },
              productNameSnapshot: { type: "string" },
              productVariantLabelSnapshot: { type: "string" },
            },
            required: ["productId", "quantity", "unitPrice", "productNameSnapshot"],
          },
        },
        deliveryAddress: { type: "string" },
        deliveryDistrict: { type: "string" },
        deliveryCity: { type: "string" },
        notes: { type: "string" },
      },
      required: ["customerName", "customerPhone", "items"],
    },
  },
];

// ─── Tool executors ───────────────────────────────────────────────────────────

async function runTool(
  name: string,
  input: Record<string, unknown>,
  storeId: string,
): Promise<string> {
  if (name === "buscar_produtos") {
    const query = (input.query as string | undefined) || "";
    const categoryId = (input.categoryId as string | undefined) || "";
    const limit = Math.min(Number(input.limit ?? 10), 20);

    const products = await prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
        ...(categoryId ? { categoryId } : {}),
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      },
      select: {
        id: true,
        name: true,
        price: true,
        promotionalPrice: true,
        shortDescription: true,
        trackStock: true,
        stockQuantity: true,
        category: { select: { name: true } },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            label: true,
            priceOverride: true,
            promotionalPriceOverride: true,
            stockQuantity: true,
          },
          take: 5,
        },
      },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
      take: limit,
    });

    if (!products.length) return "Nenhum produto encontrado.";

    return products
      .map((p) => {
        const price = p.promotionalPrice ?? p.price;
        const stock =
          p.trackStock && p.stockQuantity !== null
            ? `Estoque: ${p.stockQuantity}`
            : "Estoque: disponível";
        const variants =
          p.variants.length > 0
            ? `\n  Variações: ${p.variants.map((v) => `${v.label} (R$ ${v.promotionalPriceOverride ?? v.priceOverride ?? price})`).join(", ")}`
            : "";
        return `• ${p.name} — R$ ${price} | ${stock} | Categoria: ${p.category.name}${variants}`;
      })
      .join("\n");
  }

  if (name === "obter_detalhes_produto") {
    const productId = input.productId as string;
    const product = await prisma.product.findFirst({
      where: { id: productId, storeId, isActive: true },
      select: {
        id: true,
        name: true,
        shortDescription: true,
        fullDescription: true,
        price: true,
        promotionalPrice: true,
        trackStock: true,
        stockQuantity: true,
        brandSupplier: true,
        category: { select: { name: true } },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            label: true,
            priceOverride: true,
            promotionalPriceOverride: true,
            stockQuantity: true,
          },
        },
      },
    });

    if (!product) return "Produto não encontrado.";

    const price = product.promotionalPrice ?? product.price;
    const stock =
      product.trackStock && product.stockQuantity !== null
        ? `${product.stockQuantity} unidades`
        : "Disponível";

    const variants =
      product.variants.length > 0
        ? `\nVariações:\n${product.variants.map((v) => `  - ${v.label}: R$ ${v.promotionalPriceOverride ?? v.priceOverride ?? price} | Estoque: ${v.stockQuantity}`).join("\n")}`
        : "";

    return [
      `Produto: ${product.name}`,
      product.brandSupplier ? `Marca: ${product.brandSupplier}` : "",
      `Categoria: ${product.category.name}`,
      `Preço: R$ ${price}`,
      `Estoque: ${stock}`,
      product.shortDescription ? `Descrição: ${product.shortDescription}` : "",
      variants,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (name === "criar_pedido") {
    type OrderItem = {
      productId: string;
      productVariantId?: string;
      quantity: number;
      unitPrice: number;
      productNameSnapshot: string;
      productVariantLabelSnapshot?: string;
    };

    const items = input.items as OrderItem[];
    const subtotal = items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const order = await prisma.order.create({
      data: {
        storeId,
        customerName: input.customerName as string,
        customerPhone: input.customerPhone as string,
        deliveryAddress: (input.deliveryAddress as string) || "Via WhatsApp",
        deliveryDistrict: (input.deliveryDistrict as string) || "Não informado",
        deliveryCity: (input.deliveryCity as string) || "Não informado",
        notes: (input.notes as string) || "Pedido via agente IA (WhatsApp)",
        subtotal,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            productVariantId: item.productVariantId || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productNameSnapshot: item.productNameSnapshot,
            productVariantLabelSnapshot: item.productVariantLabelSnapshot || null,
          })),
        },
      },
    });

    return `Pedido #${order.id.slice(-6).toUpperCase()} criado com sucesso! Total: R$ ${subtotal.toFixed(2)}. O pedido foi registrado no sistema e a loja irá confirmar em breve.`;
  }

  return "Ferramenta desconhecida.";
}

// ─── Main agent runner ────────────────────────────────────────────────────────

export async function runAgent({
  storeId,
  customerPhone,
  customerMessage,
  history,
}: {
  storeId: string;
  customerPhone: string;
  customerMessage: string;
  history: AgentMessage[];
}): Promise<string> {
  const systemPrompt = await buildStoreContext(storeId);
  if (!systemPrompt) return "Desculpe, não consigo processar sua mensagem agora.";

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: customerMessage },
  ];

  let response = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  });

  // Agentic loop: handle tool use
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: await runTool(
          block.name,
          block.input as Record<string, unknown>,
          storeId,
        ),
      })),
    );

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  return textBlock?.text ?? "Desculpe, não consegui gerar uma resposta.";
}

// ─── Conversation persistence ─────────────────────────────────────────────────

export async function loadConversation(
  storeId: string,
  customerPhone: string,
): Promise<AgentMessage[]> {
  const conv = await prisma.agentConversation.findUnique({
    where: { storeId_customerPhone: { storeId, customerPhone } },
    select: { messagesJson: true },
  });
  if (!conv) return [];
  try {
    return JSON.parse(conv.messagesJson) as AgentMessage[];
  } catch {
    return [];
  }
}

export async function saveConversation(
  storeId: string,
  customerPhone: string,
  customerName: string | undefined,
  messages: AgentMessage[],
): Promise<void> {
  // Keep last 40 messages to avoid unbounded growth
  const trimmed = messages.slice(-40);
  await prisma.agentConversation.upsert({
    where: { storeId_customerPhone: { storeId, customerPhone } },
    create: {
      storeId,
      customerPhone,
      customerName: customerName || null,
      messagesJson: JSON.stringify(trimmed),
      lastMessageAt: new Date(),
    },
    update: {
      customerName: customerName || undefined,
      messagesJson: JSON.stringify(trimmed),
      lastMessageAt: new Date(),
    },
  });
}
