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
export type HoldActionResult = { success: boolean; error?: string; sale?: { id: string; saleNumber: string } };

const POS_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const paymentMethods = ["CASH", "BANK_TRANSFER", "QRIS_MANUAL", "DEBIT", "CREDIT", "E_WALLET_MANUAL", "STORE_CREDIT", "OTHER"] as const;
const cartSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().positive().max(999_999), discountAmount: z.number().min(0).max(999_999_999) })).min(1, "Keranjang tidak boleh kosong").max(100),
  customerId: z.string().min(1).nullable().optional(),
  transactionDiscount: z.number().min(0).max(999_999_999).default(0),
  notes: z.string().trim().max(1000).optional(),
  heldSaleId: z.string().min(1).nullable().optional(),
});
const checkoutSchema = cartSchema.extend({
  payments: z.array(z.object({ method: z.enum(paymentMethods), amount: z.number().positive("Jumlah pembayaran harus lebih dari nol").max(999_999_999), reference: z.string().trim().max(150).optional() })).min(1, "Tambahkan minimal satu pembayaran").max(10),
});
const holdSchema = cartSchema;

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

        const [settings, products, heldSale] = await Promise.all([
          tx.storeSetting.findUnique({ where: { storeId: ctx.store.id } }),
          tx.product.findMany({
            where: { storeId: ctx.store.id, id: { in: input.items.map((item) => item.productId) }, status: "ACTIVE" },
            select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true, stock: true },
          }),
          input.heldSaleId
            ? tx.sale.findFirst({
                where: {
                  id: input.heldSaleId,
                  storeId: ctx.store.id,
                  status: "HELD",
                  ...(ctx.member.role === UserRole.CASHIER ? { cashierId: ctx.user.id } : {}),
                },
                select: { id: true, saleNumber: true },
              })
            : Promise.resolve(null),
        ]);
        if (input.heldSaleId && !heldSale) throw new CheckoutError("Transaksi ditahan tidak ditemukan atau sudah diproses.");
        if (products.length !== input.items.length) throw new CheckoutError("Salah satu produk tidak tersedia atau sudah tidak aktif.");

        const customer = input.customerId
          ? await tx.customer.findFirst({ where: { id: input.customerId, storeId: ctx.store.id, status: "ACTIVE" }, select: { id: true, currentDebt: true, creditLimit: true } })
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
        const storeCreditAmount = input.payments.filter((payment) => payment.method === "STORE_CREDIT").reduce((sum, payment) => sum + payment.amount, 0);
        const cashTendered = input.payments.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + payment.amount, 0);
        const nonCashPaid = input.payments.filter((payment) => payment.method !== "CASH" && payment.method !== "STORE_CREDIT").reduce((sum, payment) => sum + payment.amount, 0);
        if (nonCashPaid + storeCreditAmount > totals.total) throw new CheckoutError("Pembayaran non-tunai dan kredit melebihi total transaksi.");
        const requiredCash = Math.max(0, totals.total - nonCashPaid - storeCreditAmount);
        const cashApplied = Math.min(cashTendered, requiredCash);
        const changeAmount = calculateChange(cashTendered, requiredCash);
        const paidAmount = Math.min(totals.total, nonCashPaid + cashApplied);
        const unpaidAmount = Math.max(0, totals.total - paidAmount);
        const paymentStatus: "UNPAID" | "PAID" | "PARTIALLY_PAID" = paidAmount <= 0 ? "UNPAID" : paidAmount >= totals.total ? "PAID" : "PARTIALLY_PAID";
        if ((unpaidAmount > 0 || storeCreditAmount > 0) && !customer) throw new CheckoutError("Pembayaran sebagian atau kredit toko memerlukan pelanggan.");
        if (customer?.creditLimit !== null && customer?.creditLimit !== undefined && toNumber(customer.currentDebt) + unpaidAmount > toNumber(customer.creditLimit)) {
          throw new CheckoutError("Transaksi melebihi batas kredit pelanggan.");
        }

        const dayStart = startOfDay(now);
        const dayEnd = addDays(dayStart, 1);
        const [saleSequence, receiptSequence] = await Promise.all([
          tx.sale.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
          tx.receipt.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        ]);
        const saleNumber = heldSale?.saleNumber ?? generateSaleNumber(now, saleSequence + 1);
        const receiptNumber = generateReceiptNumber(now, receiptSequence + 1);
        const saleData = {
            storeId: ctx.store.id,
            shiftId: shift.id,
            cashierId: ctx.user.id,
            customerId: customer?.id ?? null,
            saleNumber,
            status: "COMPLETED" as const,
            paymentStatus,
            subtotal: totals.subtotal,
            itemDiscountTotal: totals.itemDiscountTotal,
            transactionDiscount: totals.transactionDiscount,
            taxAmount: totals.taxAmount,
            serviceAmount: totals.serviceAmount,
            total: totals.total,
            paidAmount,
            changeAmount,
            unpaidAmount,
            notes: input.notes || null,
            completedAt: now,
        };
        const sale = heldSale
          ? await tx.sale.update({ where: { id: heldSale.id }, data: saleData })
          : await tx.sale.create({ data: saleData });

        if (heldSale) await tx.saleItem.deleteMany({ where: { saleId: heldSale.id } });

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

        let remainingCashApplied = cashApplied;
        const paymentRows: { method: (typeof paymentMethods)[number]; amount: number; reference: string | null }[] = [];
        for (const payment of input.payments) {
          if (payment.method === "CASH") {
            const amount = Math.min(payment.amount, remainingCashApplied);
            remainingCashApplied -= amount;
            if (amount > 0) paymentRows.push({ method: payment.method, amount, reference: payment.reference || null });
            continue;
          }
          paymentRows.push({ method: payment.method, amount: payment.amount, reference: payment.reference || null });
        }
        if (paymentRows.length > 0) {
          await tx.payment.createMany({ data: paymentRows.map((payment) => ({ saleId: sale.id, storeId: ctx.store.id, shiftId: shift.id, ...payment })) });
        }
        if (cashApplied > 0) {
          await tx.cashMovement.create({
            data: { storeId: ctx.store.id, shiftId: shift.id, userId: ctx.user.id, type: "SALE_PAYMENT", amount: cashApplied, notes: `Pembayaran ${saleNumber}` },
          });
        }
        if (customer && unpaidAmount > 0) {
          await tx.customer.update({ where: { id: customer.id }, data: { currentDebt: { increment: unpaidAmount } } });
        }
        await tx.receipt.create({ data: { saleId: sale.id, storeId: ctx.store.id, receiptNumber } });
        await tx.activityLog.create({
          data: { storeId: ctx.store.id, userId: ctx.user.id, action: "CREATE_SALE", module: "pos", description: `Menyelesaikan transaksi ${saleNumber} sebesar Rp ${totals.total.toLocaleString("id-ID")}`, metadataJson: { saleId: sale.id, saleNumber, total: totals.total, paidAmount, unpaidAmount, paymentMethods: input.payments.map((payment) => payment.method), resumedFromHold: Boolean(heldSale) } },
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

export async function holdSale(formData: FormData): Promise<HoldActionResult> {
  const ctx = await requireAnyRole(POS_ROLES);
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { success: false, error: "Data keranjang tidak valid." };
  }
  const parsed = holdSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data keranjang tidak valid." };
  const input = parsed.data;
  if (new Set(input.items.map((item) => item.productId)).size !== input.items.length) return { success: false, error: "Produk duplikat terdeteksi di keranjang." };

  try {
    const held = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const shift = await tx.shift.findFirst({ where: { storeId: ctx.store.id, cashierId: ctx.user.id, status: "OPEN" }, select: { id: true } });
      if (!shift) throw new CheckoutError("Buka shift Anda sebelum menahan transaksi.");
      const [settings, products, existingHeld] = await Promise.all([
        tx.storeSetting.findUnique({ where: { storeId: ctx.store.id } }),
        tx.product.findMany({ where: { storeId: ctx.store.id, id: { in: input.items.map((item) => item.productId) }, status: "ACTIVE" }, select: { id: true, name: true, sku: true, unit: true, sellingPrice: true, costPrice: true } }),
        input.heldSaleId ? tx.sale.findFirst({ where: { id: input.heldSaleId, storeId: ctx.store.id, status: "HELD", ...(ctx.member.role === UserRole.CASHIER ? { cashierId: ctx.user.id } : {}) }, select: { id: true, saleNumber: true } }) : Promise.resolve(null),
      ]);
      if (input.heldSaleId && !existingHeld) throw new CheckoutError("Transaksi ditahan tidak ditemukan atau sudah diproses.");
      if (products.length !== input.items.length) throw new CheckoutError("Salah satu produk tidak tersedia atau sudah tidak aktif.");
      const customer = input.customerId ? await tx.customer.findFirst({ where: { id: input.customerId, storeId: ctx.store.id, status: "ACTIVE" }, select: { id: true } }) : null;
      if (input.customerId && !customer) throw new CheckoutError("Pelanggan tidak ditemukan atau tidak aktif.");
      const productMap = new Map(products.map((product) => [product.id, product]));
      const items = input.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) throw new CheckoutError("Produk tidak ditemukan.");
        const lineGross = toNumber(product.sellingPrice) * item.quantity;
        if (item.discountAmount > lineGross) throw new CheckoutError(`Diskon ${product.name} melebihi subtotal item.`);
        return { input: item, product, lineGross };
      });
      const subtotalAfterItemDiscount = items.reduce((sum, item) => sum + item.lineGross - item.input.discountAmount, 0);
      if (input.transactionDiscount > subtotalAfterItemDiscount) throw new CheckoutError("Diskon transaksi melebihi subtotal.");
      const totals = calculateSaleTotals({ items: items.map(({ input: item, product }) => ({ productId: product.id, quantity: item.quantity, unitPrice: product.sellingPrice, discountAmount: item.discountAmount })), transactionDiscount: input.transactionDiscount, taxEnabled: settings?.taxEnabled ?? false, taxRatePercent: settings?.taxRate ?? 0, serviceChargeEnabled: settings?.serviceChargeEnabled ?? false, serviceRatePercent: settings?.serviceChargeRate ?? 0 });
      if (totals.total <= 0) throw new CheckoutError("Total transaksi harus lebih dari nol.");
      const dayStart = startOfDay(now);
      const saleSequence = existingHeld ? 0 : await tx.sale.count({ where: { createdAt: { gte: dayStart, lt: addDays(dayStart, 1) } } });
      const saleNumber = existingHeld?.saleNumber ?? generateSaleNumber(now, saleSequence + 1);
      const saleData = { storeId: ctx.store.id, shiftId: shift.id, cashierId: ctx.user.id, customerId: customer?.id ?? null, saleNumber, status: "HELD" as const, paymentStatus: "UNPAID" as const, subtotal: totals.subtotal, itemDiscountTotal: totals.itemDiscountTotal, transactionDiscount: totals.transactionDiscount, taxAmount: totals.taxAmount, serviceAmount: totals.serviceAmount, total: totals.total, paidAmount: 0, changeAmount: 0, unpaidAmount: 0, notes: input.notes || null, completedAt: null };
      const sale = existingHeld ? await tx.sale.update({ where: { id: existingHeld.id }, data: saleData }) : await tx.sale.create({ data: saleData });
      if (existingHeld) await tx.saleItem.deleteMany({ where: { saleId: existingHeld.id } });
      await tx.saleItem.createMany({ data: items.map(({ input: item, product, lineGross }) => ({ saleId: sale.id, productId: product.id, productNameSnapshot: product.name, skuSnapshot: product.sku, unitSnapshot: product.unit, quantity: item.quantity, unitPrice: product.sellingPrice, costPriceSnapshot: product.costPrice, discountAmount: item.discountAmount, subtotal: lineGross - item.discountAmount })) });
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "HOLD_SALE", module: "pos", description: `${existingHeld ? "Memperbarui" : "Menahan"} transaksi ${saleNumber}`, metadataJson: { saleId: sale.id, saleNumber, total: totals.total } } });
      return { id: sale.id, saleNumber };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/dashboard/pos/held");
    revalidatePath("/dashboard/pos");
    return { success: true, sale: held };
  } catch (error) {
    if (error instanceof CheckoutError) return { success: false, error: error.message };
    return { success: false, error: "Keranjang gagal ditahan. Coba lagi." };
  }
}

export async function cancelHeldSale(saleId: string, reason: string): Promise<HoldActionResult> {
  const ctx = await requireAnyRole(POS_ROLES);
  const parsed = z.string().trim().min(2, "Alasan pembatalan wajib diisi").max(500).safeParse(reason);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Alasan tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const held = await tx.sale.findFirst({ where: { id: saleId, storeId: ctx.store.id, status: "HELD", ...(ctx.member.role === UserRole.CASHIER ? { cashierId: ctx.user.id } : {}) }, select: { id: true, saleNumber: true } });
      if (!held) throw new CheckoutError("Transaksi ditahan tidak ditemukan atau sudah diproses.");
      const updated = await tx.sale.updateMany({ where: { id: held.id, status: "HELD" }, data: { status: "VOIDED", voidedAt: new Date(), voidReason: parsed.data } });
      if (updated.count !== 1) throw new CheckoutError("Transaksi ditahan sudah diproses oleh pengguna lain.");
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "VOID_SALE", module: "pos", description: `Membatalkan transaksi ditahan ${held.saleNumber}: ${parsed.data}`, metadataJson: { saleId: held.id, reason: parsed.data, held: true } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/dashboard/pos/held");
    return { success: true };
  } catch (error) {
    if (error instanceof CheckoutError) return { success: false, error: error.message };
    return { success: false, error: "Transaksi ditahan gagal dibatalkan." };
  }
}
