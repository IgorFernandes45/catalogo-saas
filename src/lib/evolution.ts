/**
 * Evolution API client — sends messages and fetches connection status/QR code.
 * All calls are proxied through the store's own Evolution instance URL + API key.
 */

export type EvolutionConnectionStatus =
  | "open"
  | "connecting"
  | "close"
  | "disconnected";

export interface EvolutionStatusResponse {
  instance: {
    instanceName: string;
    state: EvolutionConnectionStatus;
  };
}

export interface EvolutionQrCodeResponse {
  base64?: string;
  code?: string;
  pairingCode?: string | null;
}

export class EvolutionClient {
  private baseUrl: string;
  private apiKey: string;
  private instance: string;

  constructor(baseUrl: string, apiKey: string, instance: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.instance = instance;
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      apikey: this.apiKey,
    };
  }

  async sendText(to: string, text: string): Promise<void> {
    const url = `${this.baseUrl}/message/sendText/${this.instance}`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        number: to,
        options: { delay: 500 },
        textMessage: { text },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Evolution sendText failed: ${res.status} — ${body}`);
    }
  }

  async getStatus(): Promise<EvolutionConnectionStatus> {
    const url = `${this.baseUrl}/instance/connectionState/${this.instance}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) return "disconnected";
    const data = (await res.json()) as EvolutionStatusResponse;
    return data?.instance?.state ?? "disconnected";
  }

  async getQrCode(): Promise<EvolutionQrCodeResponse | null> {
    const url = `${this.baseUrl}/instance/connect/${this.instance}`;
    const res = await fetch(url, { headers: this.headers() });
    if (!res.ok) return null;
    const data = await res.json();
    return data as EvolutionQrCodeResponse;
  }

  async createInstance(): Promise<void> {
    const url = `${this.baseUrl}/instance/create`;
    await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        instanceName: this.instance,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });
  }

  async setWebhook(webhookUrl: string): Promise<void> {
    const url = `${this.baseUrl}/webhook/set/${this.instance}`;
    await fetch(url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          events: ["MESSAGES_UPSERT"],
          webhookByEvents: false,
          webhookBase64: false,
        },
      }),
    });
  }
}

export function buildEvolutionClient(config: {
  evolutionUrl: string | null | undefined;
  evolutionApiKey: string | null | undefined;
  evolutionInstance: string | null | undefined;
}): EvolutionClient | null {
  const { evolutionUrl, evolutionApiKey, evolutionInstance } = config;
  if (!evolutionUrl || !evolutionApiKey || !evolutionInstance) return null;
  return new EvolutionClient(evolutionUrl, evolutionApiKey, evolutionInstance);
}
