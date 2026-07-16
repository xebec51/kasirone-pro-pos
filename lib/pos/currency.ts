/**
 * Zero dependencies on the Prisma client (unlike money.ts/decimal.ts) —
 * safe to import from Client Components. Every call site in this app
 * already converts Decimal -> number before display, so these only ever
 * need to operate on plain numbers.
 */

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatCurrencyIDR(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
