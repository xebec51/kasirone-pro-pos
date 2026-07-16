"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { requireManagerOrOwner } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

export type ReversalActionResult = { success: boolean; error?: string };
const reasonSchema = z.string().trim().min(3, "Alasan minimal 3 karakter").max(500);
class ReversalError extends Error {}

async function reverseSale(saleId: string, reason: string, kind: "VOID" | "REFUND"): Promise<ReversalActionResult> {
  const ctx = await requireManagerOrOwner();
  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Alasan tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, storeId: ctx.store.id, status: "COMPLETED" },
        select: {
          id: true, saleNumber: true, shiftId: true, customerId: true, unpaidAmount: true,
          items: { select: { productId: true, quantity: true, productNameSnapshot: true } },
          payments: { where: { amount: { gt: 0 } }, select: { id: true, method: true, amount: true, reference: true } },
        },
      });
      if (!sale) throw new ReversalError("Transaksi tidak ditemukan atau sudah dibatalkan/refund.");
      const reversalShift = await tx.shift.findFirst({ where: { storeId: ctx.store.id, cashierId: ctx.user.id, status: "OPEN" }, select: { id: true } });

      for (const item of sale.items) {
        const product = await tx.product.findFirst({ where: { id: item.productId, storeId: ctx.store.id }, select: { id: true, stock: true } });
        if (!product) throw new ReversalError(`Produk ${item.productNameSnapshot} tidak ditemukan.`);
        const stockBefore = toNumber(product.stock);
        const quantity = toNumber(item.quantity);
        const stockAfter = stockBefore + quantity;
        const updated = await tx.product.updateMany({ where: { id: product.id, storeId: ctx.store.id, stock: product.stock }, data: { stock: stockAfter } });
        if (updated.count !== 1) throw new ReversalError("Stok berubah saat reversal diproses. Coba lagi.");
        await tx.stockMovement.create({ data: { storeId: ctx.store.id, productId: product.id, type: kind, quantityChange: quantity, stockBefore, stockAfter, referenceType: "SALE", referenceId: sale.id, reason: parsed.data, createdById: ctx.user.id } });
      }

      if (sale.payments.length > 0) {
        await tx.payment.createMany({
          data: sale.payments.map((payment) => ({ saleId: sale.id, storeId: ctx.store.id, shiftId: reversalShift?.id ?? null, method: payment.method, amount: -toNumber(payment.amount), reference: `REVERSAL:${payment.id}`, notes: `${kind === "VOID" ? "Void" : "Refund"} ${sale.saleNumber}: ${parsed.data}` })),
        });
      }
      const cashRefund = sale.payments.filter((payment) => payment.method === "CASH").reduce((sum, payment) => sum + toNumber(payment.amount), 0);
      if (cashRefund > 0) {
        await tx.cashMovement.create({ data: { storeId: ctx.store.id, shiftId: reversalShift?.id ?? null, userId: ctx.user.id, type: "REFUND", amount: cashRefund, notes: `${kind === "VOID" ? "Void" : "Refund"} ${sale.saleNumber}: ${parsed.data}` } });
      }
      const debtToReverse = toNumber(sale.unpaidAmount);
      if (sale.customerId && debtToReverse > 0) {
        const customer = await tx.customer.findFirst({ where: { id: sale.customerId, storeId: ctx.store.id }, select: { currentDebt: true } });
        if (customer) await tx.customer.update({ where: { id: sale.customerId }, data: { currentDebt: Math.max(0, toNumber(customer.currentDebt) - debtToReverse) } });
      }

      const updatedSale = await tx.sale.updateMany({
        where: { id: sale.id, status: "COMPLETED" },
        data: { status: kind === "VOID" ? "VOIDED" : "REFUNDED", paymentStatus: "REFUNDED", unpaidAmount: 0, ...(kind === "VOID" ? { voidedAt: new Date() } : {}), voidReason: parsed.data },
      });
      if (updatedSale.count !== 1) throw new ReversalError("Transaksi sudah diproses oleh pengguna lain.");
      await tx.activityLog.create({
        data: { storeId: ctx.store.id, userId: ctx.user.id, action: kind === "VOID" ? "VOID_SALE" : "REFUND_SALE", module: "transactions", description: `${kind === "VOID" ? "Membatalkan" : "Refund penuh"} transaksi ${sale.saleNumber}: ${parsed.data}`, metadataJson: { saleId: sale.id, reason: parsed.data, cashRefund, debtReversed: debtToReverse } },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath(`/dashboard/transactions/${saleId}`);
    revalidatePath("/dashboard/transactions");
    revalidatePath("/dashboard/products");
    revalidatePath("/dashboard/stock");
    revalidatePath("/dashboard/customers");
    revalidatePath("/dashboard/shifts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof ReversalError) return { success: false, error: error.message };
    return { success: false, error: "Reversal gagal diproses. Tidak ada perubahan parsial yang disimpan." };
  }
}

export async function voidCompletedSale(saleId: string, reason: string) { return reverseSale(saleId, reason, "VOID"); }
export async function refundCompletedSale(saleId: string, reason: string) { return reverseSale(saleId, reason, "REFUND"); }
