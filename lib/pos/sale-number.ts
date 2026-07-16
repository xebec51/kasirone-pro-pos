import { format } from "date-fns";

function sequentialNumber(prefix: string, date: Date, sequence: number): string {
  const ymd = format(date, "yyyyMMdd");
  return `${prefix}-${ymd}-${String(sequence).padStart(4, "0")}`;
}

/** e.g. INV-20260716-0001 */
export function generateSaleNumber(date: Date, sequence: number): string {
  return sequentialNumber("INV", date, sequence);
}

/** e.g. PO-20260716-0001 */
export function generateRestockOrderNumber(date: Date, sequence: number): string {
  return sequentialNumber("PO", date, sequence);
}
