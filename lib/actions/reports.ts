"use server";

import { addDays } from "date-fns";
import { z } from "zod";
import { requireManagerOrOwner } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

type ExportValue = string | number | null;
export type ExportResult = { success: boolean; error?: string; filename?: string; sheetName?: string; rows?: Record<string, ExportValue>[] };
const typeSchema = z.enum(["sales", "products", "shifts", "stock", "debts"]);
const MAX_ROWS = 10_000;

function parseRange(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  const start = new Date(`${from}T00:00:00`); const end = addDays(new Date(`${to}T00:00:00`), 1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return null;
  return { start, end };
}

export async function getReportExport(type: string, from: string, to: string): Promise<ExportResult> {
  const ctx = await requireManagerOrOwner(); const parsedType = typeSchema.safeParse(type); const range = parseRange(from, to);
  if (!parsedType.success || !range) return { success: false, error: "Jenis ekspor atau rentang tanggal tidak valid." };
  let rows: Record<string, ExportValue>[] = []; let sheetName = "Data";
  if (parsedType.data === "sales") {
    const count = await prisma.sale.count({ where: { storeId: ctx.store.id, createdAt: { gte: range.start, lt: range.end } } }); if (count > MAX_ROWS) return { success: false, error: "Data penjualan melebihi 10.000 baris. Persempit rentang tanggal." };
    const data = await prisma.sale.findMany({ where: { storeId: ctx.store.id, createdAt: { gte: range.start, lt: range.end } }, select: { saleNumber: true, status: true, paymentStatus: true, createdAt: true, total: true, paidAmount: true, unpaidAmount: true, cashier: { select: { name: true } }, customer: { select: { name: true } }, payments: { select: { method: true } } }, orderBy: { createdAt: "asc" } });
    rows = data.map((sale) => ({ "No. Transaksi": sale.saleNumber, Tanggal: sale.createdAt.toISOString(), Status: sale.status, "Status Pembayaran": sale.paymentStatus, Kasir: sale.cashier.name, Pelanggan: sale.customer?.name ?? "Umum", Metode: [...new Set(sale.payments.map((payment) => payment.method))].join(", "), Total: toNumber(sale.total), Terbayar: toNumber(sale.paidAmount), "Belum Dibayar": toNumber(sale.unpaidAmount) })); sheetName = "Penjualan";
  } else if (parsedType.data === "products") {
    const count = await prisma.product.count({ where: { storeId: ctx.store.id } }); if (count > MAX_ROWS) return { success: false, error: "Data produk melebihi batas ekspor." };
    const data = await prisma.product.findMany({ where: { storeId: ctx.store.id }, select: { sku: true, barcode: true, name: true, status: true, unit: true, stock: true, minStock: true, costPrice: true, sellingPrice: true, category: { select: { name: true } } }, orderBy: { name: "asc" } });
    rows = data.map((product) => ({ SKU: product.sku, Barcode: product.barcode, Produk: product.name, Kategori: product.category?.name ?? "-", Status: product.status, Satuan: product.unit, Stok: toNumber(product.stock), "Stok Minimum": toNumber(product.minStock), "Harga Modal": toNumber(product.costPrice), "Harga Jual": toNumber(product.sellingPrice) })); sheetName = "Produk";
  } else if (parsedType.data === "shifts") {
    const count = await prisma.shift.count({ where: { storeId: ctx.store.id, openedAt: { gte: range.start, lt: range.end } } }); if (count > MAX_ROWS) return { success: false, error: "Data shift melebihi 10.000 baris. Persempit rentang tanggal." };
    const data = await prisma.shift.findMany({ where: { storeId: ctx.store.id, openedAt: { gte: range.start, lt: range.end } }, select: { status: true, openedAt: true, closedAt: true, openingCash: true, expectedCash: true, actualCash: true, cashDifference: true, cashier: { select: { name: true } } }, orderBy: { openedAt: "asc" } });
    rows = data.map((shift) => ({ Kasir: shift.cashier.name, Status: shift.status, Dibuka: shift.openedAt.toISOString(), Ditutup: shift.closedAt?.toISOString() ?? null, "Modal Awal": toNumber(shift.openingCash), "Kas Diharapkan": shift.expectedCash === null ? null : toNumber(shift.expectedCash), "Kas Aktual": shift.actualCash === null ? null : toNumber(shift.actualCash), Selisih: shift.cashDifference === null ? null : toNumber(shift.cashDifference) })); sheetName = "Shift";
  } else if (parsedType.data === "stock") {
    const count = await prisma.stockMovement.count({ where: { storeId: ctx.store.id, createdAt: { gte: range.start, lt: range.end } } }); if (count > MAX_ROWS) return { success: false, error: "Data kartu stok melebihi 10.000 baris. Persempit rentang tanggal." };
    const data = await prisma.stockMovement.findMany({ where: { storeId: ctx.store.id, createdAt: { gte: range.start, lt: range.end } }, select: { type: true, quantityChange: true, stockBefore: true, stockAfter: true, reason: true, referenceType: true, referenceId: true, createdAt: true, product: { select: { name: true, sku: true, unit: true } }, createdBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } });
    rows = data.map((movement) => ({ Tanggal: movement.createdAt.toISOString(), SKU: movement.product.sku, Produk: movement.product.name, Jenis: movement.type, Perubahan: toNumber(movement.quantityChange), Satuan: movement.product.unit, Sebelum: toNumber(movement.stockBefore), Sesudah: toNumber(movement.stockAfter), Alasan: movement.reason, Referensi: movement.referenceType && movement.referenceId ? `${movement.referenceType}:${movement.referenceId}` : null, Petugas: movement.createdBy?.name ?? "Sistem" })); sheetName = "Kartu Stok";
  } else {
    const data = await prisma.customer.findMany({ where: { storeId: ctx.store.id, currentDebt: { gt: 0 } }, select: { name: true, phone: true, email: true, status: true, currentDebt: true, creditLimit: true }, orderBy: { currentDebt: "desc" }, take: MAX_ROWS });
    rows = data.map((customer) => ({ Pelanggan: customer.name, Telepon: customer.phone, Email: customer.email, Status: customer.status, "Utang Berjalan": toNumber(customer.currentDebt), "Limit Kredit": customer.creditLimit === null ? null : toNumber(customer.creditLimit) })); sheetName = "Utang Pelanggan";
  }
  await prisma.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "EXPORT", module: "reports", description: `Mengekspor ${sheetName} (${rows.length} baris)`, metadataJson: { type: parsedType.data, from, to, rowCount: rows.length } } });
  return { success: true, filename: `kasirone-${parsedType.data}-${from}-${to}.xlsx`, sheetName, rows };
}
