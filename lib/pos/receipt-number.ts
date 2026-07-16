import { format } from "date-fns";

/** e.g. RCP-20260716-0001 */
export function generateReceiptNumber(date: Date, sequence: number): string {
  const ymd = format(date, "yyyyMMdd");
  return `RCP-${ymd}-${String(sequence).padStart(4, "0")}`;
}
