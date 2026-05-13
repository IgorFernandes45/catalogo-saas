import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requireSuperAdmin } from "@/lib/auth";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/stores", label: "Lojas" },
  { href: "/admin/stores/new", label: "Nova loja" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSuperAdmin();

  return (
    <DashboardShell
      title="Painel do super admin"
      subtitle="Gerencie lojas, acompanhe métricas da plataforma e mantenha o ecossistema multiloja organizado."
      session={{
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        storeId: user.storeId,
      }}
      nav={nav}
    >
      {children}
    </DashboardShell>
  );
}
