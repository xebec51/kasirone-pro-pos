import type { Prisma } from "@/app/generated/prisma/client";

export type Decimalish = Prisma.Decimal | number | string;

export type SaleItemInput = {
  productId: string;
  quantity: Decimalish;
  unitPrice: Decimalish;
  discountAmount?: Decimalish;
};

export type SaleTotals = {
  subtotal: number;
  itemDiscountTotal: number;
  transactionDiscount: number;
  taxAmount: number;
  serviceAmount: number;
  total: number;
};

export type SaleTotalsInput = {
  items: SaleItemInput[];
  transactionDiscount?: Decimalish;
  taxRatePercent?: Decimalish;
  serviceRatePercent?: Decimalish;
  taxEnabled?: boolean;
  serviceChargeEnabled?: boolean;
};

export type CartItem = {
  productId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  availableStock: number;
};

export type PaymentInput = {
  method:
    | "CASH"
    | "BANK_TRANSFER"
    | "QRIS_MANUAL"
    | "DEBIT"
    | "CREDIT"
    | "E_WALLET_MANUAL"
    | "STORE_CREDIT"
    | "OTHER";
  amount: Decimalish;
  reference?: string;
  notes?: string;
};

export type { StockLevel } from "@/lib/pos/stock-level";
