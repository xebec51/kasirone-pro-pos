import { toNumber } from "@/lib/pos/money";
import type { Decimalish } from "@/lib/pos/types";

type ExpectedCashInput = {
  openingCash: Decimalish;
  cashSalePayments: Decimalish;
  cashIn: Decimalish;
  cashOut: Decimalish;
  cashRefunds: Decimalish;
};

/** opening cash + cash payments + cash in - cash out - cash refunds */
export function calculateExpectedCash(input: ExpectedCashInput): number {
  return (
    toNumber(input.openingCash) +
    toNumber(input.cashSalePayments) +
    toNumber(input.cashIn) -
    toNumber(input.cashOut) -
    toNumber(input.cashRefunds)
  );
}

export function calculateCashDifference(actualCash: Decimalish, expectedCash: Decimalish): number {
  return toNumber(actualCash) - toNumber(expectedCash);
}
