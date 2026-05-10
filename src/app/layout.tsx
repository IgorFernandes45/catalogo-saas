import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";

import { NotifyProvider } from "@/components/shared/notify-provider";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";

import "./globals.css";

const appSans = Manrope({
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
});

const appDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-app-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Catalogo SaaS Multiloja",
  description:
    "MVP de SaaS multiloja com painel administrativo, catalogo publico premium, carrinho e pedido no WhatsApp.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Catalogo SaaS",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#f97316",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${appSans.variable} ${appDisplay.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-slate-100 text-slate-950 antialiased">
        <NotifyProvider>
          <ServiceWorkerRegister />
          {children}
        </NotifyProvider>
      </body>
    </html>
  );
}
