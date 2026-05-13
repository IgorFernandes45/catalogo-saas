"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { connectWhatsAppAction, saveAgentConfigAction } from "./actions";

type AgentConfig = {
  isEnabled: boolean;
  agentName: string;
  greetingMessage: string | null;
  evolutionInstance: string | null;
  connectionStatus: string;
  deliveryFee: string | null;
  deliveryFeeNote: string | null;
  deliveryTime: string | null;
  deliveryArea: string | null;
  acceptedPaymentsJson: string | null;
  openingHours: string | null;
  customInstructions: string | null;
} | null;

const PAYMENT_OPTIONS = [
  "PIX",
  "Dinheiro",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência bancária",
];

function parsePayments(json: string | null): string[] {
  try { return JSON.parse(json || "[]") as string[]; }
  catch { return []; }
}

type Tab = "conexao" | "entrega" | "pagamentos" | "treinamento";

const TABS: { key: Tab; label: string }[] = [
  { key: "conexao",     label: "Conexão" },
  { key: "entrega",     label: "Entrega" },
  { key: "pagamentos",  label: "Pagamentos" },
  { key: "treinamento", label: "Treinamento" },
];

export function AgentConfigForm({ config }: { config: AgentConfig }) {
  const [activeTab, setActiveTab] = useState<Tab>("conexao");
  const [connectionStatus, setConnectionStatus] = useState(config?.connectionStatus ?? "disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPayments = parsePayments(config?.acceptedPaymentsJson ?? null);
  const isConfigured = !!config?.evolutionInstance;

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/agent/status");
      const data = (await res.json()) as { status: string };
      setConnectionStatus(data.status);
      if (data.status === "open") {
        setQrCode(null);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchQrCode = useCallback(async () => {
    setQrLoading(true);
    try {
      const res = await fetch("/api/agent/qrcode");
      const data = (await res.json()) as { qr?: { base64?: string } };
      if (data.qr?.base64) {
        const b64 = data.qr.base64;
        setQrCode(b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);
      }
    } finally {
      setQrLoading(false);
    }
  }, []);

  useEffect(() => {
    if (qrCode) {
      pollRef.current = setInterval(fetchStatus, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [qrCode, fetchStatus]);

  const statusConfig = {
    open:         { label: "Conectado",    color: "text-green-600",  dot: "bg-green-500",  bg: "border-green-200 bg-green-50" },
    connecting:   { label: "Conectando…",  color: "text-yellow-600", dot: "bg-yellow-400", bg: "border-yellow-200 bg-yellow-50" },
    close:        { label: "Desconectado", color: "text-red-500",    dot: "bg-red-400",    bg: "border-red-200 bg-red-50" },
    disconnected: { label: "Desconectado", color: "text-red-500",    dot: "bg-red-400",    bg: "border-red-200 bg-red-50" },
  }[connectionStatus] ?? { label: connectionStatus, color: "text-slate-500", dot: "bg-slate-400", bg: "border-slate-200 bg-slate-50" };

  if (!config?.isEnabled) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-2xl">
          🤖
        </div>
        <p className="mt-4 font-semibold text-slate-800">Agente IA não habilitado</p>
        <p className="mt-1 text-sm text-slate-500">
          Entre em contato com o administrador do sistema para ativar o agente para esta loja.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-1 scrollbar-hidden">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Conexão ───────────────────────────────────── */}
      {activeTab === "conexao" && (
        <div className="space-y-4">
          {/* Status */}
          <div className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${statusConfig.bg}`}>
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusConfig.dot}`} />
              <div>
                <p className="text-xs text-slate-500">Status do WhatsApp</p>
                <p className={`text-sm font-semibold ${statusConfig.color}`}>
                  {statusLoading ? "Verificando…" : statusConfig.label}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchStatus}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Atualizar
            </button>
          </div>

          {connectionStatus !== "open" && (
            <>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
                <p className="font-medium text-blue-800">Como conectar</p>
                <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-blue-700">
                  <li>Clique em <strong>Conectar WhatsApp</strong> abaixo.</li>
                  <li>Em seguida, clique em <strong>Ver QR Code</strong>.</li>
                  <li>No celular: WhatsApp → Dispositivos conectados → Conectar dispositivo.</li>
                  <li>Escaneie o QR Code com a câmera.</li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {isConfigured && (
                  <form action={connectWhatsAppAction}>
                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Conectar WhatsApp
                    </button>
                  </form>
                )}
                <button
                  type="button"
                  onClick={fetchQrCode}
                  disabled={qrLoading || !isConfigured}
                  className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 ${!isConfigured ? "col-span-2" : ""}`}
                >
                  {qrLoading ? "Carregando…" : "Ver QR Code"}
                </button>
              </div>
            </>
          )}

          {connectionStatus === "open" && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
              <p className="font-semibold text-green-800">✓ WhatsApp conectado</p>
              <p className="mt-1 text-sm text-green-700">
                O agente está ativo e respondendo mensagens automaticamente.
                A sessão se mantém enquanto o celular tiver internet.
              </p>
            </div>
          )}

          {qrCode && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6">
              <p className="text-sm font-medium text-slate-700">Escaneie com o WhatsApp do celular</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Code WhatsApp" className="h-56 w-56 rounded-xl" />
              <p className="text-xs text-slate-400">Verificando conexão a cada 5 segundos…</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tabs com form ──────────────────────────────────── */}
      {activeTab !== "conexao" && (
        <form action={saveAgentConfigAction} className="space-y-5">

          {/* Entrega */}
          {activeTab === "entrega" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-field">Taxa de entrega</label>
                  <input type="text" name="deliveryFee" defaultValue={config?.deliveryFee ?? ""} placeholder="Ex.: R$ 5,00 ou Grátis acima de R$ 80" className="input-field" />
                </div>
                <div>
                  <label className="label-field">Prazo de entrega</label>
                  <input type="text" name="deliveryTime" defaultValue={config?.deliveryTime ?? ""} placeholder="Ex.: 30 a 60 minutos" className="input-field" />
                </div>
                <div>
                  <label className="label-field">Área de entrega</label>
                  <input type="text" name="deliveryArea" defaultValue={config?.deliveryArea ?? ""} placeholder="Ex.: Centro, Bairro X, até 10 km" className="input-field" />
                </div>
                <div>
                  <label className="label-field">Observação sobre entrega</label>
                  <input type="text" name="deliveryFeeNote" defaultValue={config?.deliveryFeeNote ?? ""} placeholder="Ex.: Retirada no local disponível" className="input-field" />
                </div>
              </div>
              <input type="hidden" name="agentName" value={config?.agentName ?? "Assistente"} />
              <input type="hidden" name="greetingMessage" value={config?.greetingMessage ?? ""} />
              <input type="hidden" name="openingHours" value={config?.openingHours ?? ""} />
              <input type="hidden" name="customInstructions" value={config?.customInstructions ?? ""} />
            </div>
          )}

          {/* Pagamentos */}
          {activeTab === "pagamentos" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500">Selecione as formas de pagamento aceitas.</p>
              <div className="space-y-2">
                {PAYMENT_OPTIONS.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-orange-200 hover:bg-orange-50">
                    <input type="checkbox" name={`payment_${opt}`} defaultChecked={selectedPayments.includes(opt)} className="h-4 w-4 shrink-0 accent-orange-500" />
                    <span className="text-sm font-medium text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="label-field">Outro método de pagamento</label>
                <input type="text" name="paymentCustom" defaultValue={selectedPayments.find((p) => !PAYMENT_OPTIONS.includes(p)) ?? ""} placeholder="Ex.: Boleto, Vale-refeição" className="input-field" />
              </div>
              <input type="hidden" name="agentName" value={config?.agentName ?? "Assistente"} />
              <input type="hidden" name="greetingMessage" value={config?.greetingMessage ?? ""} />
              <input type="hidden" name="deliveryFee" value={config?.deliveryFee ?? ""} />
              <input type="hidden" name="deliveryTime" value={config?.deliveryTime ?? ""} />
              <input type="hidden" name="deliveryArea" value={config?.deliveryArea ?? ""} />
              <input type="hidden" name="deliveryFeeNote" value={config?.deliveryFeeNote ?? ""} />
              <input type="hidden" name="openingHours" value={config?.openingHours ?? ""} />
              <input type="hidden" name="customInstructions" value={config?.customInstructions ?? ""} />
            </div>
          )}

          {/* Treinamento */}
          {activeTab === "treinamento" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label-field">Nome do agente</label>
                  <input type="text" name="agentName" defaultValue={config?.agentName ?? "Assistente"} placeholder="Ex.: Assistente, Lara, Robô" className="input-field" />
                </div>
                <div>
                  <label className="label-field">Mensagem de boas-vindas</label>
                  <input type="text" name="greetingMessage" defaultValue={config?.greetingMessage ?? ""} placeholder="Olá! Como posso ajudar?" className="input-field" />
                </div>
                <div className="sm:col-span-2">
                  <label className="label-field">Horário de funcionamento</label>
                  <input type="text" name="openingHours" defaultValue={config?.openingHours ?? ""} placeholder="Ex.: Seg a Sex das 9h às 18h, Sáb das 9h às 13h" className="input-field" />
                </div>
              </div>
              <div>
                <label className="label-field">Instruções para o agente</label>
                <textarea
                  name="customInstructions"
                  rows={10}
                  defaultValue={config?.customInstructions ?? ""}
                  placeholder={`Escreva como se estivesse treinando um atendente:\n\n- Sempre ofereça frete grátis para pedidos acima de R$ 100.\n- Se o cliente pedir desconto, conceda até 5%.\n- Parcelamos em até 3x sem juros no cartão.`}
                  className="input-field resize-none font-mono text-sm"
                />
                <p className="mt-1 text-xs text-slate-400">O agente seguirá estas instruções ao conversar com os clientes.</p>
              </div>
              <input type="hidden" name="deliveryFee" value={config?.deliveryFee ?? ""} />
              <input type="hidden" name="deliveryTime" value={config?.deliveryTime ?? ""} />
              <input type="hidden" name="deliveryArea" value={config?.deliveryArea ?? ""} />
              <input type="hidden" name="deliveryFeeNote" value={config?.deliveryFeeNote ?? ""} />
            </div>
          )}

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <button type="submit" className="btn-primary">Salvar alterações</button>
          </div>
        </form>
      )}
    </div>
  );
}
