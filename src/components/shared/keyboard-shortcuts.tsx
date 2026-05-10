"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function KeyboardShortcuts({ salesEnabled = true }: { salesEnabled?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTyping) {
        return;
      }

      const routes: Record<string, string> = salesEnabled
        ? {
            F3: "/painel/pedidos",
            F4: "/painel/produtos",
            F6: "/painel/clientes",
            F7: "/painel/relatorios",
          }
        : {
            F4: "/painel/produtos",
          };
      const route = routes[event.key];

      if (route) {
        event.preventDefault();
        router.push(route);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, salesEnabled]);

  return null;
}
