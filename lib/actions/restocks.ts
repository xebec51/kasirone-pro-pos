"use server";

import { addDays, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import { requireProductAccess } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { roundMoney } from "@/lib/pos/currency";
import { toNumber } from "@/lib/pos/money";
import { generateRestockOrderNumber } from "@/lib/pos/sale-number";

export type RestockActionResult = { success: boolean; error?: string; id?: string };
const createSchema = z.object({ supplierId: z.string().min(1, "Supplier wajib dipilih"), notes: z.string().trim().max(1000).nullish() });
const itemSchema = z.object({ productId: z.string().min(1, "Produk wajib dipilih"), quantityOrdered: z.coerce.number().positive("Jumlah harus lebih dari nol").max(999_999), unitCost: z.coerce.number().min(0, "Biaya tidak valid").max(999_999_999) });
const receiveSchema = z.array(z.object({ itemId: z.string().min(1), quantity: z.number().positive().max(999_999) })).min(1, "Pilih item yang diterima");
class RestockError extends Error {}

async function recalculateTotal(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.restockOrderItem.findMany({ where: { restockOrderId: orderId }, select: { subtotal: true } });
  const totalCost = items.reduce((sum, item) => sum + toNumber(item.subtotal), 0);
  await tx.restockOrder.update({ where: { id: orderId }, data: { totalCost } });
}

export async function createRestockOrder(_prev: RestockActionResult, formData: FormData): Promise<RestockActionResult> {
  const ctx = await requireProductAccess();
  const parsed = createSchema.safeParse({ supplierId: formData.get("supplierId"), notes: formData.get("notes") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  try {
    const order = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({ where: { id: parsed.data.supplierId, storeId: ctx.store.id, isActive: true }, select: { id: true, name: true } });
      if (!supplier) throw new RestockError("Supplier tidak ditemukan atau tidak aktif.");
      const now = new Date(); const dayStart = startOfDay(now);
      const sequence = await tx.restockOrder.count({ where: { createdAt: { gte: dayStart, lt: addDays(dayStart, 1) } } });
      const orderNumber = generateRestockOrderNumber(now, sequence + 1);
      const created = await tx.restockOrder.create({ data: { storeId: ctx.store.id, supplierId: supplier.id, orderNumber, notes: parsed.data.notes || null, createdById: ctx.user.id } });
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "CREATE", module: "restocks", description: `Membuat draf restock ${orderNumber} untuk ${supplier.name}`, metadataJson: { restockOrderId: created.id, supplierId: supplier.id } } });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath("/dashboard/restocks");
    return { success: true, id: order.id };
  } catch (error) {
    if (error instanceof RestockError) return { success: false, error: error.message };
    return { success: false, error: "Draf restock gagal dibuat. Coba lagi." };
  }
}

export async function addRestockItem(orderId: string, _prev: RestockActionResult, formData: FormData): Promise<RestockActionResult> {
  const ctx = await requireProductAccess();
  const parsed = itemSchema.safeParse({ productId: formData.get("productId"), quantityOrdered: formData.get("quantityOrdered"), unitCost: formData.get("unitCost") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.restockOrder.findFirst({ where: { id: orderId, storeId: ctx.store.id, status: "DRAFT" }, select: { id: true, orderNumber: true } });
      if (!order) throw new RestockError("Hanya draf restock yang dapat diubah.");
      const product = await tx.product.findFirst({ where: { id: parsed.data.productId, storeId: ctx.store.id }, select: { id: true, name: true } });
      if (!product) throw new RestockError("Produk tidak ditemukan.");
      const duplicate = await tx.restockOrderItem.findFirst({ where: { restockOrderId: order.id, productId: product.id }, select: { id: true } });
      if (duplicate) throw new RestockError("Produk sudah ada di pesanan ini.");
      await tx.restockOrderItem.create({ data: { restockOrderId: order.id, productId: product.id, quantityOrdered: parsed.data.quantityOrdered, unitCost: parsed.data.unitCost, subtotal: roundMoney(parsed.data.quantityOrdered * parsed.data.unitCost) } });
      await recalculateTotal(tx, order.id);
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "UPDATE", module: "restocks", description: `Menambahkan ${product.name} ke ${order.orderNumber}`, metadataJson: { restockOrderId: order.id, productId: product.id, quantityOrdered: parsed.data.quantityOrdered } } });
    });
    revalidatePath(`/dashboard/restocks/${orderId}`); revalidatePath("/dashboard/restocks"); return { success: true };
  } catch (error) { return { success: false, error: error instanceof RestockError ? error.message : "Item gagal ditambahkan." }; }
}

export async function removeRestockItem(orderId: string, itemId: string): Promise<RestockActionResult> {
  const ctx = await requireProductAccess();
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.restockOrder.findFirst({ where: { id: orderId, storeId: ctx.store.id, status: "DRAFT" }, select: { id: true, orderNumber: true } });
      if (!order) throw new RestockError("Hanya draf restock yang dapat diubah.");
      const item = await tx.restockOrderItem.findFirst({ where: { id: itemId, restockOrderId: order.id }, select: { id: true, product: { select: { name: true } } } });
      if (!item) throw new RestockError("Item tidak ditemukan.");
      await tx.restockOrderItem.delete({ where: { id: item.id } }); await recalculateTotal(tx, order.id);
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "UPDATE", module: "restocks", description: `Menghapus ${item.product.name} dari draf ${order.orderNumber}`, metadataJson: { restockOrderId: order.id, restockItemId: item.id } } });
    });
    revalidatePath(`/dashboard/restocks/${orderId}`); revalidatePath("/dashboard/restocks"); return { success: true };
  } catch (error) { return { success: false, error: error instanceof RestockError ? error.message : "Item gagal dihapus." }; }
}

export async function orderRestock(orderId: string): Promise<RestockActionResult> {
  const ctx = await requireProductAccess();
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.restockOrder.findFirst({ where: { id: orderId, storeId: ctx.store.id, status: "DRAFT" }, select: { id: true, orderNumber: true, supplierId: true, _count: { select: { items: true } } } });
      if (!order) throw new RestockError("Draf restock tidak ditemukan.");
      if (!order.supplierId || order._count.items === 0) throw new RestockError("Supplier dan minimal satu item wajib tersedia.");
      await tx.restockOrder.update({ where: { id: order.id }, data: { status: "ORDERED", orderDate: new Date() } });
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "UPDATE", module: "restocks", description: `Menandai ${order.orderNumber} sebagai dipesan`, metadataJson: { restockOrderId: order.id, status: "ORDERED" } } });
    });
    revalidatePath(`/dashboard/restocks/${orderId}`); revalidatePath("/dashboard/restocks"); return { success: true };
  } catch (error) { return { success: false, error: error instanceof RestockError ? error.message : "Status pesanan gagal diubah." }; }
}

export async function cancelRestock(orderId: string, reason: string): Promise<RestockActionResult> {
  const ctx = await requireProductAccess(); const parsed = z.string().trim().min(3, "Alasan minimal 3 karakter").max(500).safeParse(reason);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Alasan tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.restockOrder.findFirst({ where: { id: orderId, storeId: ctx.store.id, status: { in: ["DRAFT", "ORDERED", "PARTIALLY_RECEIVED"] } }, select: { id: true, orderNumber: true, notes: true } });
      if (!order) throw new RestockError("Pesanan tidak dapat dibatalkan.");
      await tx.restockOrder.update({ where: { id: order.id }, data: { status: "CANCELLED", notes: [order.notes, `Pembatalan: ${parsed.data}`].filter(Boolean).join("\n") } });
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "UPDATE", module: "restocks", description: `Membatalkan ${order.orderNumber}: ${parsed.data}`, metadataJson: { restockOrderId: order.id, status: "CANCELLED", reason: parsed.data } } });
    });
    revalidatePath(`/dashboard/restocks/${orderId}`); revalidatePath("/dashboard/restocks"); return { success: true };
  } catch (error) { return { success: false, error: error instanceof RestockError ? error.message : "Pesanan gagal dibatalkan." }; }
}

export async function receiveRestock(orderId: string, payload: string): Promise<RestockActionResult> {
  const ctx = await requireProductAccess(); let raw: unknown;
  try { raw = JSON.parse(payload); } catch { return { success: false, error: "Data penerimaan tidak valid." }; }
  const parsed = receiveSchema.safeParse(raw); if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data penerimaan tidak valid." };
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.restockOrder.findFirst({ where: { id: orderId, storeId: ctx.store.id, status: { in: ["ORDERED", "PARTIALLY_RECEIVED"] } }, select: { id: true, orderNumber: true, items: { select: { id: true, productId: true, quantityOrdered: true, quantityReceived: true, unitCost: true, product: { select: { name: true, stock: true, costPrice: true } } } } } });
      if (!order) throw new RestockError("Pesanan belum dipesan atau sudah selesai.");
      const receiveMap = new Map(parsed.data.map((item) => [item.itemId, item.quantity]));
      for (const entry of parsed.data) if (!order.items.some((item) => item.id === entry.itemId)) throw new RestockError("Item penerimaan tidak ditemukan.");
      for (const item of order.items) {
        const quantity = receiveMap.get(item.id) ?? 0; if (quantity <= 0) continue;
        const ordered = toNumber(item.quantityOrdered); const received = toNumber(item.quantityReceived); if (received + quantity > ordered) throw new RestockError(`Penerimaan ${item.product.name} melebihi jumlah pesanan.`);
        const stockBefore = toNumber(item.product.stock); const stockAfter = stockBefore + quantity; const oldCost = toNumber(item.product.costPrice); const unitCost = toNumber(item.unitCost); const baseStock = Math.max(stockBefore, 0); const weightedCost = baseStock + quantity > 0 ? roundMoney((baseStock * oldCost + quantity * unitCost) / (baseStock + quantity)) : unitCost;
        const updated = await tx.product.updateMany({ where: { id: item.productId, storeId: ctx.store.id, stock: item.product.stock }, data: { stock: stockAfter, costPrice: weightedCost } }); if (updated.count !== 1) throw new RestockError("Stok berubah saat penerimaan. Coba lagi.");
        await tx.restockOrderItem.update({ where: { id: item.id }, data: { quantityReceived: received + quantity } });
        await tx.stockMovement.create({ data: { storeId: ctx.store.id, productId: item.productId, type: "RESTOCK", quantityChange: quantity, stockBefore, stockAfter, referenceType: "RESTOCK_ORDER", referenceId: order.id, reason: `Penerimaan ${order.orderNumber}`, createdById: ctx.user.id } });
      }
      const refreshed = await tx.restockOrderItem.findMany({ where: { restockOrderId: order.id }, select: { quantityOrdered: true, quantityReceived: true } });
      const fullyReceived = refreshed.every((item) => toNumber(item.quantityReceived) >= toNumber(item.quantityOrdered));
      await tx.restockOrder.update({ where: { id: order.id }, data: { status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED", receivedDate: fullyReceived ? new Date() : null } });
      await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "RESTOCK", module: "restocks", description: `Menerima stok ${order.orderNumber}${fullyReceived ? " secara penuh" : " sebagian"}`, metadataJson: { restockOrderId: order.id, receivedItems: parsed.data, status: fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED" } } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidatePath(`/dashboard/restocks/${orderId}`); revalidatePath("/dashboard/restocks"); revalidatePath("/dashboard/products"); revalidatePath("/dashboard/stock"); revalidatePath("/dashboard"); return { success: true };
  } catch (error) { return { success: false, error: error instanceof RestockError ? error.message : "Penerimaan stok gagal diproses." }; }
}
