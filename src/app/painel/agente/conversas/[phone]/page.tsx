import { notFound } from "next/navigation";
import Link from "next/link";

import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ phone: string }>;
}) {
  const user = await requireStoreUser();
  const { phone } = await params;
  const customerPhone = decodeURIComponent(phone);

  const conv = await prisma.agentConversation.findUnique({
    where: { storeId_customerPhone: { storeId: user.storeId!, customerPhone } },
    select: {
      customerPhone: true,
      customerName: true,
      messagesJson: true,
      lastMessageAt: true,
      createdAt: true,
    },
  });

  if (!conv) notFound();

  let messages: Message[] = [];
  try {
    messages = JSON.parse(conv.messagesJson) as Message[];
  } catch {
    messages = [];
  }

  return (
    <div className="surface-card p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Conversa</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {conv.customerName || "Cliente"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {conv.customerPhone} · Iniciada em {formatDateTime(conv.createdAt)} ·{" "}
            {messages.length} mensagens
          </p>
        </div>
        <Link
          href="/painel/agente/conversas"
          className="mt-4 shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 sm:mt-0"
        >
          ← Todas as conversas
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Nenhuma mensagem nesta conversa.</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "rounded-tl-sm bg-slate-100 text-slate-800"
                  : "rounded-tr-sm bg-slate-900 text-white"
              }`}
            >
              <p className={`mb-1 text-xs font-semibold ${msg.role === "user" ? "text-slate-400" : "text-orange-300"}`}>
                {msg.role === "user" ? (conv.customerName || "Cliente") : "Agente IA"}
              </p>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-slate-400">
        Última mensagem: {formatDateTime(conv.lastMessageAt)}
      </p>
    </div>
  );
}
