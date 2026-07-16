import type { LucideIcon } from "lucide-react";
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
} from "lucide-react";

/** Mirrors the Prisma `UserRole` enum values (string-compatible, no import cycle into generated client). */
export type DashboardRole = "OWNER" | "MANAGER" | "CASHIER" | "INVENTORY_STAFF";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: DashboardRole[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

const ALL_ROLES: DashboardRole[] = ["OWNER", "MANAGER", "CASHIER", "INVENTORY_STAFF"];
const BACK_OFFICE: DashboardRole[] = ["OWNER", "MANAGER"];
const STOCK_ROLES: DashboardRole[] = ["OWNER", "MANAGER", "INVENTORY_STAFF"];

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Ringkasan",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: BACK_OFFICE,
      },
    ],
  },
  {
    title: "Kasir",
    items: [
      {
        href: "/dashboard/pos",
        label: "Kasir (POS)",
        icon: ShoppingCart,
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
      {
        href: "/dashboard/pos/held",
        label: "Transaksi Ditahan",
        icon: PauseCircle,
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
      {
        href: "/dashboard/shifts",
        label: "Shift Kasir",
        icon: Clock,
        roles: ALL_ROLES.filter((r) => r !== "INVENTORY_STAFF"),
      },
    ],
  },
  {
    title: "Katalog & Stok",
    items: [
      {
        href: "/dashboard/products",
        label: "Produk",
        icon: Package,
        roles: STOCK_ROLES,
      },
      {
        href: "/dashboard/categories",
        label: "Kategori",
        icon: Tags,
        roles: STOCK_ROLES,
      },
      {
        href: "/dashboard/stock",
        label: "Kartu Stok",
        icon: Boxes,
        roles: STOCK_ROLES,
      },
      {
        href: "/dashboard/restocks",
        label: "Restock",
        icon: PackagePlus,
        roles: STOCK_ROLES,
      },
      {
        href: "/dashboard/suppliers",
        label: "Supplier",
        icon: Truck,
        roles: STOCK_ROLES,
      },
    ],
  },
  {
    title: "Pelanggan & Transaksi",
    items: [
      {
        href: "/dashboard/customers",
        label: "Pelanggan",
        icon: Users,
        roles: ALL_ROLES.filter((r) => r !== "INVENTORY_STAFF"),
      },
      {
        href: "/dashboard/transactions",
        label: "Transaksi",
        icon: Receipt,
        roles: ALL_ROLES.filter((r) => r !== "INVENTORY_STAFF"),
      },
    ],
  },
  {
    title: "Kelola Toko",
    items: [
      {
        href: "/dashboard/reports",
        label: "Laporan",
        icon: BarChart3,
        roles: BACK_OFFICE,
      },
      {
        href: "/dashboard/users",
        label: "Pengguna",
        icon: UserCog,
        roles: BACK_OFFICE,
      },
      {
        href: "/dashboard/settings",
        label: "Pengaturan",
        icon: Settings,
        roles: ["OWNER"],
      },
      {
        href: "/dashboard/developer",
        label: "Developer",
        icon: Code2,
        roles: ALL_ROLES,
      },
    ],
  },
];

export function getNavSectionsForRole(role: DashboardRole): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.roles.includes(role)),
  })).filter((section) => section.items.length > 0);
}
