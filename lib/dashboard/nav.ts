/** Mirrors the Prisma `UserRole` enum values (string-compatible, no import cycle into generated client). */
export type DashboardRole = "OWNER" | "MANAGER" | "CASHIER" | "INVENTORY_STAFF";

/**
 * String keys, not lucide component references: NAV_SECTIONS is built in a
 * Server Component (dashboard layout) and passed as a prop into client nav
 * components — passing the icon function itself would fail React's "cannot
 * pass functions from Server to Client Components" serialization boundary.
 * The client-side icon registry lives in sidebar-nav.tsx.
 */
export type NavIconKey =
  | "dashboard"
  | "shopping-cart"
  | "pause-circle"
  | "package"
  | "tags"
  | "users"
  | "truck"
  | "package-plus"
  | "receipt"
  | "clock"
  | "boxes"
  | "bar-chart"
  | "user-cog"
  | "settings"
  | "code";

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconKey;
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
        icon: "dashboard",
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
        icon: "shopping-cart",
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
      {
        href: "/dashboard/pos/held",
        label: "Transaksi Ditahan",
        icon: "pause-circle",
        roles: ["OWNER", "MANAGER", "CASHIER"],
      },
      {
        href: "/dashboard/shifts",
        label: "Shift Kasir",
        icon: "clock",
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
        icon: "package",
        roles: STOCK_ROLES,
      },
      {
        href: "/dashboard/categories",
        label: "Kategori",
        icon: "tags",
        roles: STOCK_ROLES,
      },
      {
        href: "/dashboard/stock",
        label: "Kartu Stok",
        icon: "boxes",
        roles: STOCK_ROLES,
      },
      {
        href: "/dashboard/restocks",
        label: "Restock",
        icon: "package-plus",
        roles: STOCK_ROLES,
      },
      {
        href: "/dashboard/suppliers",
        label: "Supplier",
        icon: "truck",
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
        icon: "users",
        roles: ALL_ROLES.filter((r) => r !== "INVENTORY_STAFF"),
      },
      {
        href: "/dashboard/transactions",
        label: "Transaksi",
        icon: "receipt",
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
        icon: "bar-chart",
        roles: BACK_OFFICE,
      },
      {
        href: "/dashboard/users",
        label: "Pengguna",
        icon: "user-cog",
        roles: BACK_OFFICE,
      },
      {
        href: "/dashboard/settings",
        label: "Pengaturan",
        icon: "settings",
        roles: ["OWNER"],
      },
      {
        href: "/dashboard/developer",
        label: "Developer",
        icon: "code",
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
