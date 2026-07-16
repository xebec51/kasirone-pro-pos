import Link from "next/link";
import { KasironeLogo } from "@/components/brand/kasirone-logo";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import type { NavSection } from "@/lib/dashboard/nav";

type AppShellProps = {
  sections: NavSection[];
  storeName: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  sections,
  storeName,
  headerActions,
  children,
}: AppShellProps) {
  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link href="/dashboard" aria-label="Ke dashboard">
            <KasironeLogo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav sections={sections} />
        </div>
        <div className="border-t border-sidebar-border px-4 py-3 text-xs text-muted-foreground">
          {storeName}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <MobileNav sections={sections} />
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground md:hidden">
            {storeName}
          </p>
          <div className="ml-auto flex items-center gap-2">{headerActions}</div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
