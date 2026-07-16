import { toNumber } from "@/lib/pos/money";
import type { Decimalish, SaleItemInput, StockLevel } from "@/lib/pos/types";

export function calculateLowStockStatus(
  stock: Decimalish,
  minStock: Decimalish,
): StockLevel {
  const currentStock = toNumber(stock);
  const min = toNumber(minStock);
  if (currentStock <= 0) return "OUT_OF_STOCK";
  if (min > 0 && currentStock <= min) return "LOW";
  return "NORMAL";
}

export function validateStockAvailability(
  availableStock: Decimalish,
  requestedQuantity: Decimalish,
  allowNegativeStock: boolean,
): { ok: boolean; available: number; requested: number } {
  const available = toNumber(availableStock);
  const requested = toNumber(requestedQuantity);
  return {
    ok: allowNegativeStock || requested <= available,
    available,
    requested,
  };
}

export function validateSaleItems(items: SaleItemInput[]): string[] {
  const errors: string[] = [];
  if (items.length === 0) {
    errors.push("Keranjang tidak boleh kosong.");
  }
  items.forEach((item, index) => {
    if (toNumber(item.quantity) <= 0) {
      errors.push(`Item ke-${index + 1}: jumlah harus lebih dari 0.`);
    }
    if (toNumber(item.unitPrice) < 0) {
      errors.push(`Item ke-${index + 1}: harga tidak valid.`);
    }
    if (toNumber(item.discountAmount ?? 0) < 0) {
      errors.push(`Item ke-${index + 1}: diskon tidak valid.`);
    }
  });
  return errors;
}
