"use server";

import { revalidatePath } from "next/cache";
import { requireSaleAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

export type ReceiptActionResult = { success: boolean; error?: string };

export async function markReceiptPrinted(saleId: string): Promise<ReceiptActionResult> {
  const { ctx } = await requireSaleAccess(saleId);
  const receipt = await prisma.receipt.findFirst({ where: { saleId, storeId: ctx.store.id }, select: { id: true, receiptNumber: true } });
  if (!receipt) return { success: false, error: "Struk tidak tersedia untuk transaksi ini." };
  await prisma.$transaction([
    prisma.receipt.update({ where: { id: receipt.id }, data: { printedAt: new Date() } }),
    prisma.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "UPDATE", module: "receipts", description: `Mencetak ulang struk ${receipt.receiptNumber}`, metadataJson: { saleId, receiptId: receipt.id } } }),
  ]);
  revalidatePath(`/dashboard/transactions/${saleId}`);
  return { success: true };
}
