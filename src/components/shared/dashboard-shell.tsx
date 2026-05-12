"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

import { KeyboardShortcuts } from "@/components/shared/keyboard-shortcuts";
import { SessionUser } from "@/lib/auth";

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

      <nav className="mt-4 grid gap-2">
        {nav.map((item) => {
          const isActive =
            item.href === "/painel"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileNavOpen(false)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "border-orange-300 bg-orange-500/15 text-white"
                  : "border-white/10 text-slate-100 hover:border-orange-300 hover:text-orange-200"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 rounded-2xl bg-white/5 px-4 py-3 text-xs leading-6 text-slate-300">
        {salesEnabled ? (
          <>
            F3 Pedidos/Venda<br />
            F4 Produtos<br />
            F6 Clientes<br />
            F7 Relatórios
          </>
        ) : (
          <>
            Modo somente catálogo<br />
            F4 Produtos
          </>
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
