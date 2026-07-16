import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { UserRole } from "@/app/generated/prisma/client";
import { PosWorkspace, type PosCustomer, type PosProduct } from "@/components/pos/pos-workspace";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireAnyRole } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/pos/money";

const POS_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];

export default async function PosPage() {
  const ctx = await requireAnyRole(POS_ROLES);
  const [shift, products, categories, customers, settings] = await Promise.all([
    prisma.shift.findFirst({ where: { storeId: ctx.store.id, cashierId: ctx.user.id, status: "OPEN" }, select: { id: true, openedAt: true } }),
    prisma.product.findMany({ where: { storeId: ctx.store.id, status: "ACTIVE" }, select: { id: true, name: true, sku: true, barcode: true, categoryId: true, sellingPrice: true, stock: true, unit: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.category.findMany({ where: { storeId: ctx.store.id }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { storeId: ctx.store.id, status: "ACTIVE" }, select: { id: true, name: true, phone: true, currentDebt: true, creditLimit: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.storeSetting.findUnique({ where: { storeId: ctx.store.id }, select: { allowNegativeStock: true, taxEnabled: true, taxRate: true, serviceChargeEnabled: true, serviceChargeRate: true } }),
  ]);

  if (!shift) {
    return <div className="mx-auto max-w-xl space-y-6"><Alert><AlertTriangle aria-hidden="true" /><AlertTitle>Shift belum dibuka</AlertTitle><AlertDescription>Setiap operator harus membuka shift sendiri sebelum memproses transaksi.</AlertDescription></Alert><Button render={<Link href="/dashboard/shifts" />}>Buka Shift</Button></div>;
  }

  const productRows: PosProduct[] = products.map((product) => ({ id: product.id, name: product.name, sku: product.sku, barcode: product.barcode, categoryId: product.categoryId, sellingPrice: toNumber(product.sellingPrice), stock: toNumber(product.stock), unit: product.unit }));
  const customerRows: PosCustomer[] = customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone, currentDebt: toNumber(customer.currentDebt), creditLimit: customer.creditLimit === null ? null : toNumber(customer.creditLimit) }));

  return <PosWorkspace
    shift={{ id: shift.id, openedAt: shift.openedAt.toISOString() }}
    products={productRows}
    categories={categories}
    customers={customerRows}
    settings={{ taxEnabled: settings?.taxEnabled ?? false, taxRate: settings ? toNumber(settings.taxRate) : 0, serviceChargeEnabled: settings?.serviceChargeEnabled ?? false, serviceChargeRate: settings ? toNumber(settings.serviceChargeRate) : 0, allowNegativeStock: settings?.allowNegativeStock ?? false }}
  />;
}
