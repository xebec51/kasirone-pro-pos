import { Prisma } from "@/app/generated/prisma/client";
import type { Decimalish, SaleTotals, SaleTotalsInput } from "@/lib/pos/types";

export function toDecimal(value: Decimalish): Prisma.Decimal {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function toNumber(value: Decimalish): number {
  return toDecimal(value).toNumber();
}

export function formatCurrencyIDR(value: Decimalish): string {
  const amount = toNumber(value);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Rounds to 2 decimal places to avoid floating point drift before persisting. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateSaleTotals(input: SaleTotalsInput): SaleTotals {
  const subtotal = roundMoney(
    input.items.reduce(
      (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice),
      0,
    ),
  );
  const itemDiscountTotal = roundMoney(
    input.items.reduce(
      (sum, item) => sum + toNumber(item.discountAmount ?? 0),
      0,
    ),
  );
  const transactionDiscount = roundMoney(toNumber(input.transactionDiscount ?? 0));

  const netBeforeTax = Math.max(
    subtotal - itemDiscountTotal - transactionDiscount,
    0,
  );

  const taxAmount = input.taxEnabled
    ? roundMoney((netBeforeTax * toNumber(input.taxRatePercent ?? 0)) / 100)
    : 0;
  const serviceAmount = input.serviceChargeEnabled
    ? roundMoney((netBeforeTax * toNumber(input.serviceRatePercent ?? 0)) / 100)
    : 0;

  const total = roundMoney(netBeforeTax + taxAmount + serviceAmount);

  return {
    subtotal,
    itemDiscountTotal,
    transactionDiscount,
    taxAmount,
    serviceAmount,
    total,
  };
}

export function calculateChange(paidAmount: Decimalish, total: Decimalish): number {
  return roundMoney(Math.max(toNumber(paidAmount) - toNumber(total), 0));
}

export function calculateUnpaidAmount(paidAmount: Decimalish, total: Decimalish): number {
  return roundMoney(Math.max(toNumber(total) - toNumber(paidAmount), 0));
}

export function calculatePaymentStatus(
  paidAmount: Decimalish,
  total: Decimalish,
): "PAID" | "PARTIALLY_PAID" | "UNPAID" {
  const paid = toNumber(paidAmount);
  const totalAmount = toNumber(total);
  if (paid <= 0) return "UNPAID";
  if (paid >= totalAmount) return "PAID";
  return "PARTIALLY_PAID";
}
