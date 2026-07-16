"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOwner } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";

export type SettingsActionResult = { success: boolean; error?: string };
const settingsSchema = z.object({
  name: z.string().trim().min(2, "Nama toko minimal 2 karakter").max(150),
  address: z.string().trim().max(500).nullish(), phone: z.string().trim().max(30).nullish(),
  email: z.string().trim().max(150).refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Email tidak valid").nullish(),
  receiptFooter: z.string().trim().max(500).nullish(), receiptWidth: z.enum(["58mm", "80mm"]),
  taxEnabled: z.boolean(), taxRate: z.coerce.number().min(0).max(100), serviceChargeEnabled: z.boolean(), serviceChargeRate: z.coerce.number().min(0).max(100),
  allowNegativeStock: z.boolean(), lowStockAlertEnabled: z.boolean(),
});

export async function updateStoreSettings(_prev: SettingsActionResult, formData: FormData): Promise<SettingsActionResult> {
  const ctx = await requireOwner();
  const parsed = settingsSchema.safeParse({ name: formData.get("name"), address: formData.get("address"), phone: formData.get("phone"), email: formData.get("email"), receiptFooter: formData.get("receiptFooter"), receiptWidth: formData.get("receiptWidth"), taxEnabled: formData.get("taxEnabled") === "on", taxRate: formData.get("taxRate"), serviceChargeEnabled: formData.get("serviceChargeEnabled") === "on", serviceChargeRate: formData.get("serviceChargeRate"), allowNegativeStock: formData.get("allowNegativeStock") === "on", lowStockAlertEnabled: formData.get("lowStockAlertEnabled") === "on" });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const data = parsed.data;
  await prisma.$transaction(async (tx) => {
    await tx.store.update({ where: { id: ctx.store.id }, data: { name: data.name, address: data.address || null, phone: data.phone || null, email: data.email || null, receiptFooter: data.receiptFooter || null } });
    await tx.storeSetting.upsert({ where: { storeId: ctx.store.id }, create: { storeId: ctx.store.id, allowNegativeStock: data.allowNegativeStock, taxEnabled: data.taxEnabled, taxRate: data.taxRate, serviceChargeEnabled: data.serviceChargeEnabled, serviceChargeRate: data.serviceChargeRate, receiptWidth: data.receiptWidth, receiptFooter: data.receiptFooter || null, lowStockAlertEnabled: data.lowStockAlertEnabled }, update: { allowNegativeStock: data.allowNegativeStock, taxEnabled: data.taxEnabled, taxRate: data.taxRate, serviceChargeEnabled: data.serviceChargeEnabled, serviceChargeRate: data.serviceChargeRate, receiptWidth: data.receiptWidth, receiptFooter: data.receiptFooter || null, lowStockAlertEnabled: data.lowStockAlertEnabled } });
    await tx.activityLog.create({ data: { storeId: ctx.store.id, userId: ctx.user.id, action: "UPDATE", module: "settings", description: "Memperbarui profil dan pengaturan toko", metadataJson: { receiptWidth: data.receiptWidth, taxEnabled: data.taxEnabled, serviceChargeEnabled: data.serviceChargeEnabled, allowNegativeStock: data.allowNegativeStock, lowStockAlertEnabled: data.lowStockAlertEnabled } } });
  });
  revalidatePath("/dashboard/settings"); revalidatePath("/dashboard"); revalidatePath("/dashboard/pos"); return { success: true };
}
