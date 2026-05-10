"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-slate-100">
      <KeyboardShortcuts salesEnabled={salesEnabled} />
      <div className="mx-auto grid min-h-screen max-w-[1500px] gap-5 px-3 py-3 lg:grid-cols-[250px_1fr]">
        <aside className="rounded-[28px] bg-slate-950 p-4 text-white lg:sticky lg:top-3 lg:h-[calc(100vh-1.5rem)]">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.28em] text-orange-300">
              Catalogo SaaS
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
                F7 Relatorios
              </>
            ) : (
              <>
                Modo somente catalogo<br />
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
        </aside>

        <main className="min-w-0 py-1">
          <div className="mb-4 rounded-[24px] bg-white px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
