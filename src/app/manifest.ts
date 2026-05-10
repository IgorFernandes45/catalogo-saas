import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Catalogo SaaS Multiloja",
    short_name: "Catalogo SaaS",
    description:
      "Catalogo multiloja com carrinho, checkout curto e pedido no WhatsApp.",
    start_url: "/loja/casa-aurora-moda",
    display: "standalone",
    background_color: "#fff7ed",
    theme_color: "#f97316",
    orientation: "portrait",
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
