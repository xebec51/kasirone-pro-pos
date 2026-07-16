/** Zero dependencies on the Prisma client — safe to import from Client Components. */

export type StockLevel = "OUT_OF_STOCK" | "LOW" | "NORMAL";

export function calculateLowStockStatus(stock: number, minStock: number): StockLevel {
  if (stock <= 0) return "OUT_OF_STOCK";
  if (minStock > 0 && stock <= minStock) return "LOW";
  return "NORMAL";
}
