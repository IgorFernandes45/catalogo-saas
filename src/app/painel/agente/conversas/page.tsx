import Link from "next/link";

import { EmptyStateCard } from "@/components/shared/empty-state-card";
import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

function lastMessage(messagesJson: string): string {
  try {
    const msgs = JSON.parse(messagesJson) as { role: string; content: string }[];
    if (!msgs.length) return "Sem mensagens";
    const last = msgs[msgs.length - 1];
    const prefix = last.role === "user" ? "Cliente: " : "Agente: ";
    const text = last.content.length > 80 ? last.content.slice(0, 80) + "…" : last.content;
    return prefix + text;
  } catch {
    return "Sem mensagens";
  }
}

function messageCount(messagesJson: string): number {
  try {
    return (JSON.parse(messagesJson) as unknown[]).length;
  } catch {
    return 0;
  }
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const user = await requireStoreUser();
  const query = await searchParams;
  const search = String(query.search ?? "").trim();
  const currentPage = Math.max(1, Number(query.page) || 1);
  const pageSize = 20;

  const where = {
    storeId: user.storeId!,
    ...(search
      ? {
          OR: [
            { customerPhone: { contains: search, mode: "insensitive" as const } },
            { customerName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, conversations] = await Promise.all([
    prisma.agentConversation.count({ where }),
    prisma.agentConversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        customerPhone: true,
        customerName: true,
        messagesJson: true,
        lastMessageAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildHref(page: number) {
    const p = new URLSearchParams();
    if (search) p.set("search", search);
    if (page > 1) p.set("page", String(page));
    const q = p.toString();
    return q ? `/painel/agente/conversas?${q}` : "/painel/agente/conversas";
  }

  return (
    <div className="surface-card p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Agente IA</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">Conversas do WhatsApp</h1>
          <p className="mt-2 text-sm text-slate-500">
            Histórico de todas as conversas gerenciadas pelo agente.
          </p>
        </div>
        <Link
          href="/painel/agente"
          className="mt-4 shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 sm:mt-0"
        >
          ← Configurações
        </Link>
      </div>

      <form className="mt-6 flex gap-3">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Buscar por nome ou telefone"
          className="input-field"
        />
        <button
          type="submit"
          className="shrink-0 rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Buscar
        </button>
        {search && (
          <Link
            href="/painel/agente/conversas"
            className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300"
          >
            Limpar
          </Link>
        )}
      </form>

      <p className="mt-4 text-sm text-slate-500">
        {total} conversa{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
      </p>

      <div className="mt-4 space-y-2">
        {conversations.map((conv) => (
          <Link
            key={conv.id}
            href={`/painel/agente/conversas/${encodeURIComponent(conv.customerPhone)}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 transition hover:border-orange-200 hover:bg-orange-50"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {conv.customerName || "Cliente"}{" "}
                <span className="font-normal text-slate-400">· {conv.customerPhone}</span>
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-500">{lastMessage(conv.messagesJson)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-slate-400">{formatDateTime(conv.lastMessageAt)}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {messageCount(conv.messagesJson)} msg
              </p>
            </div>
          </Link>
        ))}

        {!conversations.length && (
          <EmptyStateCard
            title="Nenhuma conversa ainda"
            description="Quando clientes enviarem mensagens no WhatsApp, as conversas aparecem aqui."
            actionHref="/painel/agente"
            actionLabel="Configurar agente"
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-white px-4 py-4">
          <p className="text-sm text-slate-500">Página {currentPage} de {totalPages}</p>
          <div className="flex gap-3">
            <Link
              href={buildHref(Math.max(1, currentPage - 1))}
              aria-disabled={currentPage <= 1}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${currentPage <= 1 ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            >
              Anterior
            </Link>
            <Link
              href={buildHref(Math.min(totalPages, currentPage + 1))}
              aria-disabled={currentPage >= totalPages}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${currentPage >= totalPages ? "pointer-events-none border border-slate-200 bg-slate-100 text-slate-400" : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"}`}
            >
              Próxima
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
