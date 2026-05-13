"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, MessageCircle, ShoppingBag } from "lucide-react";

type OrderConfirmation = {
  whatsappLink: string;
  storeName: string;
};

export default function PedidoConfirmadoPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const stored = sessionStorage.getItem(`pedido-confirmado:${params.slug}`);
    if (!stored) {
      router.replace(`/loja/${params.slug}`);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as OrderConfirmation;
      setConfirmation(parsed);
      sessionStorage.removeItem(`pedido-confirmado:${params.slug}`);
    } catch {
      router.replace(`/loja/${params.slug}`);
    }
  }, [params.slug, router]);

  useEffect(() => {
    if (!confirmation) {
      return;
    }

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          window.location.assign(confirmation.whatsappLink);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [confirmation]);

  if (!confirmation) {
    return null;
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-[32px] border border-white bg-white p-8 shadow-[0_28px_72px_rgba(15,23,42,0.10)] text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-10 text-emerald-600" />
          </div>

          <h1 className="mt-6 text-2xl font-semibold text-slate-950">
            Pedido enviado!
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Tudo certo. Seu pedido foi registrado com sucesso em{" "}
            <strong className="text-slate-700">{confirmation.storeName}</strong>.
          </p>

          <div className="mt-6 rounded-[24px] bg-emerald-50 px-5 py-4">
            <p className="text-sm font-semibold text-emerald-800">
              Abrindo WhatsApp em {countdown}s
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Você vai finalizar o pedido direto no WhatsApp da loja.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.assign(confirmation.whatsappLink)}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <MessageCircle className="size-4" />
            Abrir WhatsApp agora
          </button>

          <Link
            href={`/loja/${params.slug}`}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            <ShoppingBag className="size-4" />
            Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
