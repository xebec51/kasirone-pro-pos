import { SettingsForm } from "@/components/settings/settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireOwner } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

export default async function SettingsPage() {
  const ctx = await requireOwner();
  const store = await prisma.store.findFirst({ where: { id: ctx.store.id }, select: { name: true, address: true, phone: true, email: true, receiptFooter: true, settings: { select: { allowNegativeStock: true, taxEnabled: true, taxRate: true, serviceChargeEnabled: true, serviceChargeRate: true, receiptWidth: true, receiptFooter: true, lowStockAlertEnabled: true } } } });
  if (!store) return null;
  return <div className="max-w-3xl space-y-6"><PageHeader title="Pengaturan" description="Profil toko, aturan stok, pajak, dan format struk." /><SettingsForm settings={{ name: store.name, address: store.address, phone: store.phone, email: store.email, receiptFooter: store.settings?.receiptFooter ?? store.receiptFooter, receiptWidth: store.settings?.receiptWidth ?? "80mm", taxEnabled: store.settings?.taxEnabled ?? false, taxRate: store.settings ? toNumber(store.settings.taxRate) : 0, serviceChargeEnabled: store.settings?.serviceChargeEnabled ?? false, serviceChargeRate: store.settings ? toNumber(store.settings.serviceChargeRate) : 0, allowNegativeStock: store.settings?.allowNegativeStock ?? false, lowStockAlertEnabled: store.settings?.lowStockAlertEnabled ?? true }} /></div>;
}
