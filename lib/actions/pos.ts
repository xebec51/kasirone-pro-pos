"use server";

import { addDays, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { requireAnyRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { calculateChange, calculateSaleTotals, toNumber } from "@/lib/pos/money";
import { generateReceiptNumber } from "@/lib/pos/receipt-number";
import { generateSaleNumber } from "@/lib/pos/sale-number";

export type PosActionResult = {
  success: boolean;
  error?: string;
  sale?: { id: string; saleNumber: string; receiptNumber: string; total: number; changeAmount: number };
};

const POS_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const paymentMethods = ["CASH", "BANK_TRANSFER", "QRIS_MANUAL", "DEBIT", "CREDIT", "E_WALLET_MANUAL", "OTHER"] as const;
const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().positive().max(999_999), discountAmount: z.number().min(0).max(999_999_999) })).min(1, "Keranjang tidak boleh kosong").max(100),
  customerId: z.string().min(1).nullable().optional(),
  transactionDiscount: z.number().min(0).max(999_999_999).default(0),
  paymentMethod: z.enum(paymentMethods),
  cashReceived: z.number().min(0).max(999_999_999).optional(),
  reference: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(1000).optional(),
});

class CheckoutError extends Error {}
class CheckoutConflict extends Error {}

function isRetryable(error: unknown) {
  return error instanceof CheckoutConflict || (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2034" || error.code === "P2002"));
}

export async function completeSale(formData: FormData): Promise<PosActionResult> {
  const ctx = await requireAnyRole(POS_ROLES);
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { success: false, error: "Data transaksi tidak valid." };
  }
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data transaksi tidak valid." };
  const input = parsed.data;
  if (new Set(input.items.map((item) => item.productId)).size !== input.items.length) {
    return { success: false, error: "Produk duplikat terdeteksi di keranjang." };
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const completed = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const shift = await tx.shift.findFirst({
          where: { storeId: ctx.store.id, cashierId: ctx.user.id, status: "OPEN" },
          select: { id: true },
        });
        if (!shift) throw new CheckoutError("Buka shift Anda sebelum menyelesaikan transaksi.");

        const [settings, products] = await Promise.all([
          tx.storeSetting.findUnique({ where: { storeId: ctx.store.id } }),
          tx.product.findMany({
            where: { storeId: ctx.store.id, id: { in: input.items.map((item) => item.productId) }, status: "ACTIVE" },
            select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true, stock: true },
          }),
        ]);
        if (products.length !== input.items.length) throw new CheckoutError("Salah satu produk tidak tersedia atau sudah tidak aktif.");

        const customer = input.customerId
          ? await tx.customer.findFirst({ where: { id: input.customerId, storeId: ctx.store.id, status: "ACTIVE" }, select: { id: true } })
          : null;
        if (input.customerId && !customer) throw new CheckoutError("Pelanggan tidak ditemukan atau tidak aktif.");

        const productMap = new Map(products.map((product) => [product.id, product]));
        const saleItems = input.items.map((item) => {
          const product = productMap.get(item.productId);
          if (!product) throw new CheckoutError("Produk tidak ditemukan.");
          const lineGross = toNumber(product.sellingPrice) * item.quantity;
          if (item.discountAmount > lineGross) throw new CheckoutError(`Diskon ${product.name} melebihi subtotal item.`);
          return { input: item, product, lineGross };
        });
        const subtotalAfterItemDiscount = saleItems.reduce((sum, item) => sum + item.lineGross - item.input.discountAmount, 0);
        if (input.transactionDiscount > subtotalAfterItemDiscount) throw new CheckoutError("Diskon transaksi melebihi subtotal.");

        const totals = calculateSaleTotals({
          items: saleItems.map(({ input: item, product }) => ({ productId: product.id, quantity: item.quantity, unitPrice: product.sellingPrice, discountAmount: item.discountAmount })),
          transactionDiscount: input.transactionDiscount,
          taxEnabled: settings?.taxEnabled ?? false,
          taxRatePercent: settings?.taxRate ?? 0,
          serviceChargeEnabled: settings?.serviceChargeEnabled ?? false,
          serviceRatePercent: settings?.serviceChargeRate ?? 0,
        });
        if (totals.total <= 0) throw new CheckoutError("Total transaksi harus lebih dari nol.");
        const cashReceived = input.paymentMethod === "CASH" ? input.cashReceived ?? 0 : totals.total;
        if (input.paymentMethod === "CASH" && cashReceived < totals.total) throw new CheckoutError("Uang tunai yang diterima masih kurang.");
        const changeAmount = input.paymentMethod === "CASH" ? calculateChange(cashReceived, totals.total) : 0;

        const dayStart = startOfDay(now);
        const dayEnd = addDays(dayStart, 1);
        const [saleSequence, receiptSequence] = await Promise.all([
          tx.sale.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
          tx.receipt.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        ]);
        const saleNumber = generateSaleNumber(now, saleSequence + 1);
        const receiptNumber = generateReceiptNumber(now, receiptSequence + 1);
        const sale = await tx.sale.create({
          data: {
            storeId: ctx.store.id,
            shiftId: shift.id,
            cashierId: ctx.user.id,
            customerId: customer?.id ?? null,
            saleNumber,
            status: "COMPLETED",
            paymentStatus: "PAID",
            subtotal: totals.subtotal,
            itemDiscountTotal: totals.itemDiscountTotal,
            transactionDiscount: totals.transactionDiscount,
            taxAmount: totals.taxAmount,
            serviceAmount: totals.serviceAmount,
            total: totals.total,
            paidAmount: totals.total,
            changeAmount,
            unpaidAmount: 0,
            notes: input.notes || null,
            completedAt: now,
          },
        });

        await tx.saleItem.createMany({
          data: saleItems.map(({ input: item, product, lineGross }) => ({
            saleId: sale.id,
            productId: product.id,
            productNameSnapshot: product.name,
            skuSnapshot: product.sku,
            unitSnapshot: product.unit,
            quantity: item.quantity,
            unitPrice: product.sellingPrice,
            costPriceSnapshot: product.costPrice,
            discountAmount: item.discountAmount,
            subtotal: lineGross - item.discountAmount,
          })),
        });

        for (const { input: item, product } of saleItems) {
          const stockBefore = toNumber(product.stock);
          const stockAfter = stockBefore - item.quantity;
          if (!(settings?.allowNegativeStock ?? false) && stockAfter < 0) {
            throw new CheckoutError(`Stok ${product.name} tidak cukup. Tersedia ${stockBefore} ${product.unit}.`);
          }
          const updated = await tx.product.updateMany({
            where: { id: product.id, storeId: ctx.store.id, stock: product.stock },
            data: { stock: stockAfter },
          });
          if (updated.count !== 1) throw new CheckoutConflict("Stok berubah saat transaksi diproses.");
          await tx.stockMovement.create({
            data: { storeId: ctx.store.id, productId: product.id, type: "SALE", quantityChange: -item.quantity, stockBefore, stockAfter, referenceType: "SALE", referenceId: sale.id, reason: `Penjualan ${saleNumber}`, createdById: ctx.user.id },
          });
        }

        await tx.payment.create({
          data: { saleId: sale.id, storeId: ctx.store.id, shiftId: shift.id, method: input.paymentMethod, amount: totals.total, reference: input.reference || null },
        });
        if (input.paymentMethod === "CASH") {
          await tx.cashMovement.create({
            data: { storeId: ctx.store.id, shiftId: shift.id, userId: ctx.user.id, type: "SALE_PAYMENT", amount: totals.total, notes: `Pembayaran ${saleNumber}` },
          });
        }
        await tx.receipt.create({ data: { saleId: sale.id, storeId: ctx.store.id, receiptNumber } });
        await tx.activityLog.create({
          data: { storeId: ctx.store.id, userId: ctx.user.id, action: "CREATE_SALE", module: "pos", description: `Menyelesaikan transaksi ${saleNumber} sebesar Rp ${totals.total.toLocaleString("id-ID")}`, metadataJson: { saleId: sale.id, saleNumber, total: totals.total, paymentMethod: input.paymentMethod } },
        });
        return { id: sale.id, saleNumber, receiptNumber, total: totals.total, changeAmount };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      revalidatePath("/dashboard/pos");
      revalidatePath("/dashboard/products");
      revalidatePath("/dashboard/stock");
      revalidatePath("/dashboard/transactions");
      revalidatePath("/dashboard/shifts");
      revalidatePath("/dashboard");
      return { success: true, sale: completed };
    } catch (error) {
      if (error instanceof CheckoutError) return { success: false, error: error.message };
      if (isRetryable(error) && attempt < 2) continue;
      return { success: false, error: "Transaksi gagal diproses. Stok dan pembayaran tidak berubah. Coba lagi." };
    }
  }
  return { success: false, error: "Transaksi gagal diproses. Coba lagi." };
}
