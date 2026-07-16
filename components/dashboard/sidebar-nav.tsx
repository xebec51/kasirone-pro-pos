"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  PauseCircle,
  Package,
  Tags,
  Users,
  Truck,
  PackagePlus,
  Receipt,
  Clock,
  Boxes,
  BarChart3,
  UserCog,
  Settings,
  Code2,
  type LucideIcon,
} from "lucide-react";
import type { NavIconKey, NavSection } from "@/lib/dashboard/nav";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  "shopping-cart": ShoppingCart,
  "pause-circle": PauseCircle,
  package: Package,
  tags: Tags,
  users: Users,
  truck: Truck,
  "package-plus": PackagePlus,
  receipt: Receipt,
  clock: Clock,
  boxes: Boxes,
  "bar-chart": BarChart3,
  "user-cog": UserCog,
  settings: Settings,
  code: Code2,
};

type SidebarNavProps = {
  sections: NavSection[];
  onNavigate?: () => void;
};

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ sections, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-6" aria-label="Navigasi dashboard">
      {sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = ICONS[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary-soft text-primary-soft-foreground"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
