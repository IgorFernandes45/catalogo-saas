import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requireStoreUser, storeHasSales } from "@/lib/auth";

const nav = [
  { href: "/painel", label: "Dashboard" },
  { href: "/painel/perfil", label: "Perfil" },
  { href: "/painel/categorias", label: "Categorias" },
  { href: "/painel/produtos", label: "Produtos" },
  { href: "/painel/estoque", label: "Estoque" },
  { href: "/painel/clientes", label: "Clientes" },
  { href: "/painel/pedidos", label: "Pedidos" },
  { href: "/painel/vendas", label: "Histórico" },
  { href: "/painel/relatorios", label: "Relatórios" },
  { href: "/painel/relatorios/estoque", label: "Mov. Estoque" },
];

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStoreUser();
  const salesEnabled = storeHasSales(user.store?.accessMode);
  const visibleNav = salesEnabled
    ? nav
    : nav.filter((item) =>
        ["/painel", "/painel/perfil", "/painel/categorias", "/painel/produtos", "/painel/estoque"].includes(
          item.href,
        ),
      );

  return (
    <DashboardShell
      title={user.store?.name || "Painel da loja"}
      subtitle={
        salesEnabled
          ? "Gerencie vitrine, estoque, fila de pedidos, vendas presenciais e os relatórios da loja."
          : "Modo somente catálogo: gerencie perfil, categorias, produtos e a vitrine pública."
      }
      session={{
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      }}
      nav={visibleNav}
      salesEnabled={salesEnabled}
    >
      {children}
    </DashboardShell>
  );
}
