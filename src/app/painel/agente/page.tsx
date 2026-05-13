import { requireStoreUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { AgentConfigForm } from "./agent-config-form";

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const user = await requireStoreUser();
  const params = await searchParams;
  const successMsg = params.success ? decodeURIComponent(params.success) : null;
  const errorMsg = params.error ? decodeURIComponent(params.error) : null;

  const config = await prisma.agentConfig.findUnique({
    where: { storeId: user.storeId! },
  });

  return (
    <div className="surface-card p-6">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-orange-500">Agente IA</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">
          Assistente virtual no WhatsApp
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Configure o agente de inteligência artificial que responde clientes no WhatsApp,
          conhece seu catálogo e pode registrar pedidos automaticamente.
        </p>
      </div>

      {successMsg && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      <AgentConfigForm config={config} />
    </div>
  );
}
