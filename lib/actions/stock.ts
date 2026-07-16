"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

export type StockActionResult = { success: boolean; error?: string };
const adjustmentSchema = z.object({
  productId: z.string().min(1, "Produk wajib dipilih"),
  quantityChange: z.coerce.number().refine((value) => value !== 0, "Perubahan stok tidak boleh nol").refine((value) => Math.abs(value) <= 999_999, "Perubahan stok terlalu besar"),
  reason: z.string().trim().min(3, "Alasan minimal 3 karakter").max(500),
});

export async function adjustStock(_prev: StockActionResult, formData: FormData): Promise<StockActionResult> {
  const ctx = await requireProductAccess();
  const parsed = adjustmentSchema.safeParse({ productId: formData.get("productId"), quantityChange: formData.get("quantityChange"), reason: formData.get("reason") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id: parsed.data.productId, storeId: ctx.store.id }, select: { id: true, name: true, unit: true, stock: true } });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");
      const stockBefore = toNumber(product.stock);
      const stockAfter = stockBefore + parsed.data.quantityChange;
      if (stockAfter < 0) throw new Error("NEGATIVE_STOCK");
      const updated = await tx.product.updateMany({ where: { id: product.id, storeId: ctx.store.id, stock: product.stock }, data: { stock: stockAfter } });
      if (updated.count !== 1) throw new Error("STOCK_CONFLICT");
      await tx.stockMovement.create({ data: { storeId: ctx.store.id, productId: product.id, type: "MANUAL_ADJUSTMENT", quantityChange: parsed.data.quantityChange, stockBefore, stockAfter, referenceType: "MANUAL_ADJUSTMENT", reason: parsed.data.reason, createdById: ctx.user.id } });
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "ADJUST_STOCK", module: "stock", description: `Menyesuaikan stok ${product.name} ${parsed.data.quantityChange > 0 ? "+" : ""}${parsed.data.quantityChange} ${product.unit}: ${parsed.data.reason}`, metadataJson: { productId: product.id, stockBefore, stockAfter, quantityChange: parsed.data.quantityChange } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/dashboard/stock");
    revalidatePath("/dashboard/products");
    revalidatePath(`/dashboard/products/${parsed.data.productId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") return { success: false, error: "Produk tidak ditemukan." };
    if (error instanceof Error && error.message === "NEGATIVE_STOCK") return { success: false, error: "Penyesuaian akan membuat stok negatif." };
    if (error instanceof Error && error.message === "STOCK_CONFLICT") return { success: false, error: "Stok berubah saat diproses. Muat ulang dan coba lagi." };
    return { success: false, error: "Penyesuaian stok gagal disimpan." };
  }
}
