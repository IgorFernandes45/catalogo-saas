"use client";

import { MessageCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { createWhatsAppLink, buildQuickBuyMessage } from "@/lib/whatsapp";

type QuickBuyButtonProps = {
  store: {
    name: string;
    slug: string;
    whatsappNumber: string;
  };
  product: {
    name: string;
    slug: string;
    unitPrice: number;
    attributes: string[];
  };
  className?: string;
};

export function QuickBuyButton({
  store,
  product,
  className,
}: QuickBuyButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        const message = buildQuickBuyMessage({
          storeName: store.name,
          productName: product.name,
          unitPrice: product.unitPrice,
          attributes: product.attributes,
          productUrl: `${window.location.origin}/loja/${store.slug}/produto/${product.slug}`,
        });

        window.location.assign(createWhatsAppLink(store.whatsappNumber, message));
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400",
        className,
      )}
    >
      <MessageCircle className="size-4" />
      Comprar
    </button>
  );
}
