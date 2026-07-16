import { startOfDay, subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";
import { calculateLowStockStatus } from "@/lib/pos/stock-level";

const RECENT_ACTIVITY_LIMIT = 8;
const TOP_PRODUCTS_LIMIT = 5;
const LOW_STOCK_LIMIT = 6;

export async function getSalesToday(storeId: string) {
  const since = startOfDay(new Date());
  const result = await prisma.sale.aggregate({
    where: { storeId, status: "COMPLETED", createdAt: { gte: since } },
    _sum: { total: true },
    _count: { id: true },
  });
  return {
    total: toNumber(result._sum.total ?? 0),
    count: result._count.id,
  };
}

export async function getOpenShifts(storeId: string) {
  const shifts = await prisma.shift.findMany({
    where: { storeId, status: "OPEN" },
    select: {
      id: true,
      openedAt: true,
      openingCash: true,
      cashier: { select: { name: true } },
    },
    orderBy: { openedAt: "asc" },
  });
  return shifts.map((s) => ({
    id: s.id,
    cashierName: s.cashier.name,
    openedAt: s.openedAt,
    openingCash: toNumber(s.openingCash),
  }));
}

export async function getLowStockProducts(storeId: string) {
  const products = await prisma.product.findMany({
    where: { storeId, status: "ACTIVE" },
    select: { id: true, name: true, sku: true, stock: true, minStock: true, unit: true },
    take: 500,
  });

  const withStatus = products
    .map((p) => {
      const stock = toNumber(p.stock);
      const minStock = toNumber(p.minStock);
      return { ...p, stock, minStock, level: calculateLowStockStatus(stock, minStock) };
    })
    .filter((p): p is typeof p & { level: "OUT_OF_STOCK" | "LOW" } => p.level !== "NORMAL")
    .sort((a, b) => a.stock - b.stock);

  return {
    items: withStatus.slice(0, LOW_STOCK_LIMIT),
    totalCount: withStatus.length,
    outOfStockCount: withStatus.filter((p) => p.level === "OUT_OF_STOCK").length,
  };
}

export async function getTopProducts(storeId: string, days = 7) {
  const since = subDays(new Date(), days);
  const recentSales = await prisma.sale.findMany({
    where: { storeId, status: "COMPLETED", createdAt: { gte: since } },
    select: { id: true },
  });
  if (recentSales.length === 0) return [];

  const grouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: { saleId: { in: recentSales.map((s) => s.id) } },
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: TOP_PRODUCTS_LIMIT,
  });
  if (grouped.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: grouped.map((g) => g.productId) } },
    select: { id: true, name: true, sku: true },
  });
  const productById = new Map(products.map((p) => [p.id, p]));

  return grouped.map((g) => ({
    productId: g.productId,
    name: productById.get(g.productId)?.name ?? "(dihapus)",
    sku: productById.get(g.productId)?.sku ?? "-",
    quantitySold: toNumber(g._sum.quantity ?? 0),
    revenue: toNumber(g._sum.subtotal ?? 0),
  }));
}

export async function getPaymentMethodSummaryToday(storeId: string) {
  const since = startOfDay(new Date());
  const grouped = await prisma.payment.groupBy({
    by: ["method"],
    where: { storeId, createdAt: { gte: since } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  return grouped.map((g) => ({
    method: g.method,
    total: toNumber(g._sum.amount ?? 0),
  }));
}

export async function getCashierPerformanceToday(storeId: string) {
  const since = startOfDay(new Date());
  const grouped = await prisma.sale.groupBy({
    by: ["cashierId"],
    where: { storeId, status: "COMPLETED", createdAt: { gte: since } },
    _sum: { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: "desc" } },
  });
  if (grouped.length === 0) return [];

  const cashiers = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.cashierId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(cashiers.map((c) => [c.id, c.name]));

  return grouped.map((g) => ({
    cashierId: g.cashierId,
    name: nameById.get(g.cashierId) ?? "(dihapus)",
    total: toNumber(g._sum.total ?? 0),
    count: g._count.id,
  }));
}

export async function getRecentActivity(storeId: string) {
  const logs = await prisma.activityLog.findMany({
    where: { storeId },
    select: {
      id: true,
      action: true,
      module: true,
      description: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: RECENT_ACTIVITY_LIMIT,
  });
  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    module: l.module,
    description: l.description,
    createdAt: l.createdAt,
    userName: l.user?.name ?? "Sistem",
  }));
}

export async function getCustomersWithDebtCount(storeId: string) {
  return prisma.customer.count({ where: { storeId, currentDebt: { gt: 0 } } });
}
