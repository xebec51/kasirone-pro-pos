"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { requireAnyRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

export type DebtActionResult = { success: boolean; error?: string };
const CUSTOMER_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const methods = ["CASH", "BANK_TRANSFER", "QRIS_MANUAL", "DEBIT", "CREDIT", "E_WALLET_MANUAL", "OTHER"] as const;
const paymentSchema = z.object({ amount: z.coerce.number().positive("Jumlah harus lebih dari nol").max(999_999_999), method: z.enum(methods), reference: z.string().trim().max(150).nullish(), notes: z.string().trim().max(500).nullish() });
class DebtError extends Error {}

export async function recordDebtPayment(customerId: string, _prev: DebtActionResult, formData: FormData): Promise<DebtActionResult> {
  const ctx = await requireAnyRole(CUSTOMER_ROLES);
  const parsed = paymentSchema.safeParse({ amount: formData.get("amount"), method: formData.get("method"), reference: formData.get("reference"), notes: formData.get("notes") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: customerId, storeId: ctx.store.id }, select: { id: true, name: true, currentDebt: true } });
      if (!customer) throw new DebtError("Pelanggan tidak ditemukan.");
      const currentDebt = toNumber(customer.currentDebt);
      if (currentDebt <= 0) throw new DebtError("Pelanggan tidak memiliki utang berjalan.");
      if (parsed.data.amount > currentDebt) throw new DebtError("Pembayaran melebihi utang pelanggan.");
      const shift = await tx.shift.findFirst({ where: { storeId: ctx.store.id, cashierId: ctx.user.id, status: "OPEN" }, select: { id: true } });
      if (parsed.data.method === "CASH" && ctx.member.role === UserRole.CASHIER && !shift) throw new DebtError("Buka shift sebelum menerima pembayaran utang tunai.");
      const updated = await tx.customer.updateMany({ where: { id: customer.id, storeId: ctx.store.id, currentDebt: customer.currentDebt }, data: { currentDebt: currentDebt - parsed.data.amount } });
      if (updated.count !== 1) throw new DebtError("Saldo utang berubah saat diproses. Muat ulang dan coba lagi.");
      const payment = await tx.debtPayment.create({ data: { storeId: ctx.store.id, customerId: customer.id, receivedById: ctx.user.id, shiftId: shift?.id ?? null, amount: parsed.data.amount, method: parsed.data.method, reference: parsed.data.reference || null, notes: parsed.data.notes || null } });
      if (parsed.data.method === "CASH") await tx.cashMovement.create({ data: { storeId: ctx.store.id, shiftId: shift?.id ?? null, userId: ctx.user.id, type: "DEBT_PAYMENT", amount: parsed.data.amount, notes: `Pembayaran utang ${customer.name}${parsed.data.notes ? `: ${parsed.data.notes}` : ""}` } });
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "RECEIVE_PAYMENT", module: "customers", description: `Menerima pembayaran utang ${customer.name} Rp ${parsed.data.amount.toLocaleString("id-ID")}`, metadataJson: { customerId: customer.id, debtPaymentId: payment.id, amount: parsed.data.amount, method: parsed.data.method, shiftId: shift?.id ?? null } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath(`/dashboard/customers/${customerId}`); revalidatePath("/dashboard/customers"); revalidatePath("/dashboard/shifts"); revalidatePath("/dashboard/reports"); revalidatePath("/dashboard"); return { success: true };
  } catch (error) { return { success: false, error: error instanceof DebtError ? error.message : "Pembayaran utang gagal diproses." }; }
}
