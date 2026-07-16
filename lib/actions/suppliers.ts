"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireProductAccess } from "@/lib/auth/rbac";

export type ActionState = { success: boolean; error?: string };

const supplierSchema = z.object({
  name: z.string().trim().min(2, "Nama supplier minimal 2 karakter").max(150),
  contactName: z.string().trim().max(150).nullish(),
  phone: z.string().trim().max(30).nullish(),
  email: z
    .string()
    .trim()
    .max(150)
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Email tidak valid")
    .nullish(),
  address: z.string().trim().max(500).nullish(),
  notes: z.string().trim().max(1000).nullish(),
  isActive: z.coerce.boolean(),
});

function readSupplierForm(formData: FormData) {
  return {
    name: formData.get("name"),
    contactName: formData.get("contactName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive") === "true",
  };
}

export async function createSupplier(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireProductAccess();

  const parsed = supplierSchema.safeParse(readSupplierForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: {
        storeId: ctx.store.id,
        name: data.name,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });
    await tx.activityLog.create({
      data: {
        storeId: ctx.store.id,
        userId: ctx.user.id,
        action: "CREATE",
        module: "suppliers",
        description: `Menambah supplier ${data.name}`,
        metadataJson: { supplierId: supplier.id, isActive: data.isActive },
      },
    });
  });

  revalidatePath("/dashboard/suppliers");
  return { success: true };
}

export async function updateSupplier(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireProductAccess();

  const parsed = supplierSchema.safeParse(readSupplierForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const data = parsed.data;

  const supplier = await prisma.supplier.findFirst({ where: { id, storeId: ctx.store.id } });
  if (!supplier) {
    return { success: false, error: "Supplier tidak ditemukan." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id },
      data: {
        name: data.name,
        contactName: data.contactName || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        isActive: data.isActive,
      },
    });
    await tx.activityLog.create({
      data: {
        storeId: ctx.store.id,
        userId: ctx.user.id,
        action: "UPDATE",
        module: "suppliers",
        description:
          supplier.isActive === data.isActive
            ? `Memperbarui supplier ${data.name}`
            : `${data.isActive ? "Mengaktifkan" : "Menonaktifkan"} supplier ${data.name}`,
        metadataJson: {
          supplierId: id,
          previousIsActive: supplier.isActive,
          isActive: data.isActive,
        },
      },
    });
  });

  revalidatePath("/dashboard/suppliers");
  revalidatePath(`/dashboard/suppliers/${id}`);
  return { success: true };
}
