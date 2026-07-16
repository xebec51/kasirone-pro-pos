"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma, UserRole } from "@/app/generated/prisma/client";
import { requireAnyRole, requireShiftAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { calculateCashDifference, calculateExpectedCash } from "@/lib/pos/shift";
import { toNumber } from "@/lib/pos/money";

export type ShiftActionState = { success: boolean; error?: string; id?: string };

const SHIFT_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];
const openShiftSchema = z.object({
  openingCash: z.coerce.number().min(0, "Modal awal tidak valid").max(999_999_999),
  notes: z.string().trim().max(1000).nullish(),
});
const movementSchema = z.object({
  amount: z.coerce.number().positive("Jumlah harus lebih dari nol").max(999_999_999),
  notes: z.string().trim().min(2, "Catatan wajib diisi").max(1000),
});
const closeShiftSchema = z.object({
  actualCash: z.coerce.number().min(0, "Kas aktual tidak valid").max(999_999_999),
  notes: z.string().trim().max(1000).nullish(),
});

const transactionOptions = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

export async function openShift(_prev: ShiftActionState, formData: FormData): Promise<ShiftActionState> {
  const ctx = await requireAnyRole(SHIFT_ROLES);
  const parsed = openShiftSchema.safeParse({ openingCash: formData.get("openingCash"), notes: formData.get("notes") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  try {
    const shift = await prisma.$transaction(async (tx) => {
      const existing = await tx.shift.findFirst({
        where: { storeId: ctx.store.id, cashierId: ctx.user.id, status: "OPEN" },
        select: { id: true },
      });
      if (existing) throw new Error("OPEN_SHIFT_EXISTS");

      const created = await tx.shift.create({
        data: {
          storeId: ctx.store.id,
          cashierId: ctx.user.id,
          openingCash: parsed.data.openingCash,
          notes: parsed.data.notes || null,
        },
      });
      await tx.cashMovement.create({
        data: {
          storeId: ctx.store.id,
          shiftId: created.id,
          userId: ctx.user.id,
          type: "OPENING_CASH",
          amount: parsed.data.openingCash,
          notes: parsed.data.notes || "Modal awal shift",
        },
      });
      await tx.activityLog.create({
        data: {
          storeId: ctx.store.id,
          userId: ctx.user.id,
          action: "OPEN_SHIFT",
          module: "shifts",
          description: `Membuka shift dengan modal awal Rp ${parsed.data.openingCash.toLocaleString("id-ID")}`,
          metadataJson: { shiftId: created.id, openingCash: parsed.data.openingCash },
        },
      });
      return created;
    }, transactionOptions);
    revalidatePath("/dashboard/shifts");
    revalidatePath("/dashboard");
    return { success: true, id: shift.id };
  } catch (error) {
    if (error instanceof Error && error.message === "OPEN_SHIFT_EXISTS") {
      return { success: false, error: "Anda masih memiliki shift terbuka." };
    }
    return { success: false, error: "Shift gagal dibuka. Coba lagi." };
  }
}

export async function addCashMovement(
  shiftId: string,
  type: "CASH_IN" | "CASH_OUT",
  _prev: ShiftActionState,
  formData: FormData,
): Promise<ShiftActionState> {
  const { ctx } = await requireShiftAccess(shiftId);
  const parsed = movementSchema.safeParse({ amount: formData.get("amount"), notes: formData.get("notes") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  try {
    await prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findFirst({ where: { id: shiftId, storeId: ctx.store.id }, select: { status: true } });
      if (!shift) throw new Error("SHIFT_NOT_FOUND");
      if (shift.status !== "OPEN") throw new Error("SHIFT_CLOSED");
      await tx.cashMovement.create({
        data: { storeId: ctx.store.id, shiftId, userId: ctx.user.id, type, amount: parsed.data.amount, notes: parsed.data.notes },
      });
      await tx.activityLog.create({
        data: {
          storeId: ctx.store.id,
          userId: ctx.user.id,
          action: "UPDATE",
          module: "shifts",
          description: `${type === "CASH_IN" ? "Kas masuk" : "Kas keluar"} Rp ${parsed.data.amount.toLocaleString("id-ID")}: ${parsed.data.notes}`,
          metadataJson: { shiftId, type, amount: parsed.data.amount },
        },
      });
    }, transactionOptions);
    revalidatePath(`/dashboard/shifts/${shiftId}`);
    revalidatePath("/dashboard/shifts");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_CLOSED") return { success: false, error: "Shift sudah ditutup." };
    return { success: false, error: "Pergerakan kas gagal disimpan. Coba lagi." };
  }
}

export async function closeShift(shiftId: string, _prev: ShiftActionState, formData: FormData): Promise<ShiftActionState> {
  const { ctx } = await requireShiftAccess(shiftId);
  const parsed = closeShiftSchema.safeParse({ actualCash: formData.get("actualCash"), notes: formData.get("notes") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  try {
    await prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findFirst({
        where: { id: shiftId, storeId: ctx.store.id },
        select: { status: true, openingCash: true, notes: true, cashMovements: { select: { type: true, amount: true } } },
      });
      if (!shift) throw new Error("SHIFT_NOT_FOUND");
      if (shift.status !== "OPEN") throw new Error("SHIFT_CLOSED");

      const total = (...types: string[]) => shift.cashMovements.filter((item) => types.includes(item.type)).reduce((sum, item) => sum + toNumber(item.amount), 0);
      const expectedCash = calculateExpectedCash({
        openingCash: shift.openingCash,
        cashSalePayments: total("SALE_PAYMENT"),
        cashIn: total("CASH_IN", "DEBT_PAYMENT"),
        cashOut: total("CASH_OUT"),
        cashRefunds: total("REFUND"),
      });
      const difference = calculateCashDifference(parsed.data.actualCash, expectedCash);
      const updated = await tx.shift.updateMany({
        where: { id: shiftId, storeId: ctx.store.id, status: "OPEN" },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          expectedCash,
          actualCash: parsed.data.actualCash,
          cashDifference: difference,
          notes: parsed.data.notes || shift.notes,
        },
      });
      if (updated.count !== 1) throw new Error("SHIFT_CLOSED");
      if (difference !== 0) {
        await tx.cashMovement.create({
          data: {
            storeId: ctx.store.id,
            shiftId,
            userId: ctx.user.id,
            type: "CLOSING_ADJUSTMENT",
            amount: difference,
            notes: parsed.data.notes || "Selisih penutupan shift",
          },
        });
      }
      await tx.activityLog.create({
        data: {
          storeId: ctx.store.id,
          userId: ctx.user.id,
          action: "CLOSE_SHIFT",
          module: "shifts",
          description: `Menutup shift dengan selisih Rp ${difference.toLocaleString("id-ID")}`,
          metadataJson: { shiftId, expectedCash, actualCash: parsed.data.actualCash, difference },
        },
      });
    }, transactionOptions);
    revalidatePath(`/dashboard/shifts/${shiftId}`);
    revalidatePath("/dashboard/shifts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "SHIFT_CLOSED") return { success: false, error: "Shift sudah ditutup." };
    return { success: false, error: "Shift gagal ditutup. Coba lagi." };
  }
}
