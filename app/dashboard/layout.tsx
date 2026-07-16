import { requireStoreMember } from "@/lib/auth/rbac";
import { getNavSectionsForRole } from "@/lib/dashboard/nav";
import { AppShell } from "@/components/dashboard/app-shell";
import { UserMenu } from "@/components/dashboard/user-menu";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireStoreMember();
  const sections = getNavSectionsForRole(ctx.member.role);

  return (
    <AppShell
      sections={sections}
      storeName={ctx.store.name}
      headerActions={<UserMenu name={ctx.user.name} email={ctx.user.email} role={ctx.member.role} />}
    >
      {children}
    </AppShell>
  );
}
