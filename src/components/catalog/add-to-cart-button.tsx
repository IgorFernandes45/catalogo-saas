"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";

import { addItemToCart, buildCartKey } from "@/lib/cart";
import { cn } from "@/lib/utils";

type AddToCartButtonProps = {
  storeSlug: string;
  product: {
    productId: string;
    productName: string;
    slug: string;
    unitPrice: number;
    imageUrl: string;
    attributes: string[];
  };
  className?: string;
};

export function AddToCartButton({
  storeSlug,
  product,
  className,
}: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);
  const selectionKey = `${product.productId}::${product.attributes.join("|")}`;

  return (
    <button
      type="button"
      onClick={() => {
        addItemToCart(buildCartKey(storeSlug), {
          selectionKey,
          ...product,
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800",
        className,
      )}
    >
      <ShoppingCart className="size-4" />
      {added ? "Adicionado ao carrinho" : "Adicionar ao carrinho"}
    </button>
  );
}
