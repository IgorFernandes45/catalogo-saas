"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChartBar,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tag,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useState } from "react";

import { KeyboardShortcuts } from "@/components/shared/keyboard-shortcuts";
import { SessionUser } from "@/lib/auth";

const NAV_ICONS: Record<string, React.ReactNode> = {
  "/painel":                    <LayoutDashboard className="size-4 shrink-0" />,
  "/painel/perfil":             <Settings className="size-4 shrink-0" />,
  "/painel/categorias":         <Tag className="size-4 shrink-0" />,
  "/painel/produtos":           <Package className="size-4 shrink-0" />,
  "/painel/estoque":            <Warehouse className="size-4 shrink-0" />,
  "/painel/clientes":           <Users className="size-4 shrink-0" />,
  "/painel/pedidos":            <ShoppingCart className="size-4 shrink-0" />,
  "/painel/vendas":             <Receipt className="size-4 shrink-0" />,
  "/painel/relatorios":         <ChartBar className="size-4 shrink-0" />,
  "/painel/relatorios/estoque": <ChartBar className="size-4 shrink-0" />,
  "/painel/agente":             <Bot className="size-4 shrink-0" />,
  "/painel/agente/conversas":   <MessageSquare className="size-4 shrink-0" />,
};

type DashboardShellProps = {
  title: string;
  subtitle: string;
  session: SessionUser;
  nav: Array<{ href: string; label: string }>;
  salesEnabled?: boolean;
  children: React.ReactNode;
};

export function DashboardShell({
  title,
  subtitle,
  session,
  nav,
  salesEnabled = true,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.28em] text-orange-300">
          Catálogo SaaS
        </p>
        <h1 className="mt-2 text-xl font-semibold leading-tight">{title}</h1>
        <p className="mt-2 text-xs leading-5 text-slate-300">{session.email}</p>
      </div>

      <nav className="mt-4 space-y-1">
        {nav.map((item, i) => {
          // /painel and /painel/agente use exact match to avoid highlighting parent when on a sub-route
          const isActive =
            item.href === "/painel" || item.href === "/painel/agente"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          const icon = NAV_ICONS[item.href];

          const isAgente = item.href === "/painel/agente";
          const isConversas = item.href === "/painel/agente/conversas";
          const prevIsRelatorio = nav[i - 1]?.href.startsWith("/painel/relatorios");

          return (
            <div key={item.href}>
              {(isAgente && (prevIsRelatorio || i > 0)) && (
                <div className="my-2 border-t border-white/10" />
              )}
              <Link
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isConversas ? "pl-7" : ""} ${
                  isActive
                    ? "bg-orange-500/20 text-orange-200"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className={isActive ? "text-orange-300" : "text-slate-400"}>
                  {icon}
                </span>
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl bg-white/5 px-3 py-2.5 text-xs leading-6 text-slate-400">
        {salesEnabled ? (
          <><span className="text-slate-500">F3</span> Pedidos &nbsp;<span className="text-slate-500">F4</span> Produtos &nbsp;<span className="text-slate-500">F6</span> Clientes</>
        ) : (
          <><span className="text-slate-500">F4</span> Produtos &nbsp;· Modo catálogo</>
        )}
      </div>

      <form action="/api/auth/logout" method="post" className="mt-4">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </form>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <KeyboardShortcuts salesEnabled={salesEnabled} />

      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-slate-950 p-4 text-white transition-transform duration-300 lg:hidden ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="rounded-full border border-white/10 p-2 text-white/70 transition hover:text-white"
            aria-label="Fechar menu"
          >
            <X className="size-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-5 px-3 py-3 lg:grid-cols-[250px_1fr]">
        <aside className="hidden rounded-[28px] bg-slate-950 p-4 text-white lg:block lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)]">
          {sidebarContent}
        </aside>

        <main className="min-w-0 py-1">
          <div className="mb-4 rounded-[24px] bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="rounded-2xl border border-slate-200 p-2 text-slate-700 transition hover:border-slate-300 lg:hidden"
                aria-label="Abrir menu de navegação"
              >
                <Menu className="size-5" />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
              </div>
            </div>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
