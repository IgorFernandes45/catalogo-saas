"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createEvolutionInstanceAction,
  registerWebhookAction,
  saveAgentConfigAction,
} from "./actions";

type AgentConfig = {
  isEnabled: boolean;
  agentName: string;
  greetingMessage: string | null;
  evolutionUrl: string | null;
  evolutionApiKey: string | null;
  evolutionInstance: string | null;
  phoneNumber: string | null;
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
  try {
    return JSON.parse(json || "[]") as string[];
  } catch {
    return [];
  }
}

type Tab = "conexao" | "entrega" | "pagamentos" | "treinamento";

export function AgentConfigForm({
  config,
  storeId,
}: {
  config: AgentConfig;
  storeId: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("conexao");
  const [connectionStatus, setConnectionStatus] = useState<string>(
    config?.connectionStatus ?? "disconnected",
  );
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPayments = parsePayments(config?.acceptedPaymentsJson ?? null);

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

  // Poll connection status every 5s while a QR code is visible
  useEffect(() => {
    if (qrCode) {
      pollRef.current = setInterval(fetchStatus, 5000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrCode, fetchStatus]);

  const statusLabel = {
    open: "Conectado ✓",
    connecting: "Conectando…",
    close: "Desconectado",
    disconnected: "Desconectado",
  }[connectionStatus] ?? connectionStatus;

  const statusColor = connectionStatus === "open"
    ? "text-green-600"
    : connectionStatus === "connecting"
      ? "text-yellow-600"
      : "text-red-500";

  const tabs: { key: Tab; label: string }[] = [
    { key: "conexao", label: "Conexão WhatsApp" },
    { key: "entrega", label: "Entrega" },
    { key: "pagamentos", label: "Pagamentos" },
    { key: "treinamento", label: "Treinamento" },
  ];

  return (
    <form action={saveAgentConfigAction} className="mt-6 space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          type="checkbox"
          id="isEnabled"
          name="isEnabled"
          defaultChecked={config?.isEnabled ?? false}
          className="h-4 w-4 accent-orange-500"
        />
        <label htmlFor="isEnabled" className="text-sm font-medium text-slate-700">
          Agente ativo — responde clientes automaticamente no WhatsApp
        </label>
      </div>

      {/* Agent name */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field">Nome do agente</label>
          <input
            type="text"
            name="agentName"
            defaultValue={config?.agentName ?? "Assistente"}
            placeholder="Ex.: Assistente, Lara, Robô da Loja"
            className="input-field"
          />
          <p className="mt-1 text-xs text-slate-400">
            Como o agente se apresenta ao cliente.
          </p>
        </div>
        <div>
          <label className="label-field">Mensagem de boas-vindas</label>
          <input
            type="text"
            name="greetingMessage"
            defaultValue={config?.greetingMessage ?? ""}
            placeholder="Olá! Como posso ajudar você hoje?"
            className="input-field"
          />
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Conexão ─────────────────────────────────────────── */}
        {activeTab === "conexao" && (
          <div className="mt-4 space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <p className="font-medium">Como funciona</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-blue-700">
                <li>Instale a Evolution API no seu servidor (Railway, Fly.io, VPS).</li>
                <li>Preencha a URL, API Key e nome da instância abaixo.</li>
                <li>Clique em &quot;Criar instância&quot; e depois em &quot;Ver QR Code&quot;.</li>
                <li>Escaneie o QR Code com o WhatsApp da loja.</li>
                <li>Registre o webhook para o agente começar a responder.</li>
              </ol>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-field">URL da Evolution API</label>
                <input
                  type="url"
                  name="evolutionUrl"
                  defaultValue={config?.evolutionUrl ?? ""}
                  placeholder="https://evolution.seuservidor.com"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">API Key global</label>
                <input
                  type="text"
                  name="evolutionApiKey"
                  defaultValue={config?.evolutionApiKey ?? ""}
                  placeholder="Chave de acesso da Evolution API"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Nome da instância</label>
                <input
                  type="text"
                  name="evolutionInstance"
                  defaultValue={config?.evolutionInstance ?? ""}
                  placeholder="Ex.: loja-roupas, minha-loja"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Identificador único da instância no Evolution API.
                </p>
              </div>
              <div>
                <label className="label-field">Número do WhatsApp</label>
                <input
                  type="text"
                  name="phoneNumber"
                  defaultValue={config?.phoneNumber ?? ""}
                  placeholder="5511999999999"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Número com DDI+DDD, sem espaços ou símbolos.
                </p>
              </div>
            </div>

            {/* Connection status + actions */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex-1">
                <p className="text-xs text-slate-500">Status da conexão</p>
                <p className={`text-sm font-semibold ${statusColor}`}>
                  {statusLoading ? "Verificando…" : statusLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchStatus}
                className="btn-secondary text-xs"
              >
                Verificar status
              </button>
              <button
                type="button"
                onClick={fetchQrCode}
                disabled={qrLoading}
                className="btn-secondary text-xs"
              >
                {qrLoading ? "Carregando…" : "Ver QR Code"}
              </button>
            </div>

            {qrCode && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-700">
                  Escaneie com o WhatsApp da loja
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrCode} alt="QR Code WhatsApp" className="h-56 w-56" />
                <p className="text-xs text-slate-400">
                  O QR Code expira em alguns minutos. Verificando conexão automaticamente…
                </p>
              </div>
            )}

            {/* Create instance & webhook buttons */}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <form action={createEvolutionInstanceAction}>
                <button type="submit" className="btn-secondary text-xs">
                  Criar instância no Evolution
                </button>
              </form>
              <form action={registerWebhookAction}>
                <input type="hidden" name="appUrl" value={getAppUrl()} />
                <button type="submit" className="btn-secondary text-xs">
                  Registrar webhook automaticamente
                </button>
              </form>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
              <p className="font-medium text-slate-700">URL do webhook (para registrar manualmente)</p>
              <code className="mt-1 block break-all text-slate-600">
                {getAppUrl()}/api/agent/webhook?storeId={storeId}
              </code>
            </div>
          </div>
        )}

        {/* ── Tab: Entrega ──────────────────────────────────────────── */}
        {activeTab === "entrega" && (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label-field">Taxa de entrega</label>
                <input
                  type="text"
                  name="deliveryFee"
                  defaultValue={config?.deliveryFee ?? ""}
                  placeholder="Ex.: R$ 5,00 | Grátis acima de R$ 80"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Prazo de entrega</label>
                <input
                  type="text"
                  name="deliveryTime"
                  defaultValue={config?.deliveryTime ?? ""}
                  placeholder="Ex.: 30 a 60 minutos"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Área de entrega</label>
                <input
                  type="text"
                  name="deliveryArea"
                  defaultValue={config?.deliveryArea ?? ""}
                  placeholder="Ex.: Centro, Bairro X, até 10km"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">Observação sobre entrega</label>
                <input
                  type="text"
                  name="deliveryFeeNote"
                  defaultValue={config?.deliveryFeeNote ?? ""}
                  placeholder="Ex.: Retirada no local também disponível"
                  className="input-field"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Pagamentos ───────────────────────────────────────── */}
        {activeTab === "pagamentos" && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-slate-600">
              Selecione as formas de pagamento aceitas. O agente informará estas opções ao cliente.
            </p>
            <div className="space-y-2">
              {PAYMENT_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`payment_${opt}`}
                    defaultChecked={selectedPayments.includes(opt)}
                    className="h-4 w-4 accent-orange-500"
                  />
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
            <div>
              <label className="label-field">Outra forma de pagamento</label>
              <input
                type="text"
                name="paymentCustom"
                defaultValue={
                  selectedPayments.find((p) => !PAYMENT_OPTIONS.includes(p)) ?? ""
                }
                placeholder="Ex.: Boleto, Vale, Cheque"
                className="input-field"
              />
            </div>
          </div>
        )}

        {/* ── Tab: Treinamento ─────────────────────────────────────── */}
        {activeTab === "treinamento" && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="label-field">Horário de funcionamento</label>
              <input
                type="text"
                name="openingHours"
                defaultValue={config?.openingHours ?? ""}
                placeholder="Ex.: Seg a Sex das 9h às 18h, Sáb das 9h às 13h"
                className="input-field"
              />
            </div>
            <div>
              <label className="label-field">Instruções personalizadas</label>
              <textarea
                name="customInstructions"
                rows={10}
                defaultValue={config?.customInstructions ?? ""}
                placeholder={`Escreva como o agente deve se comportar. Exemplos:\n\n- Sempre ofereça entrega grátis para pedidos acima de R$ 100.\n- Se o cliente pedir desconto, conceda até 5%.\n- Nossos produtos têm garantia de 30 dias.\n- Informe que parcelamos em até 3x sem juros no cartão.\n- Para pedidos acima de R$ 200, ligue para confirmar.`}
                className="input-field resize-none font-mono text-sm"
              />
              <p className="mt-1 text-xs text-slate-400">
                Escreva livremente como se estivesse treinando um atendente.
                O agente seguirá estas instruções ao conversar com os clientes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="flex justify-end border-t border-slate-100 pt-4">
        <button type="submit" className="btn-primary">
          Salvar configurações
        </button>
      </div>
    </form>
  );
}

function getAppUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}
