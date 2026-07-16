"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAnyRole } from "@/lib/auth/rbac";
import { UserRole } from "@/app/generated/prisma/client";

export type ActionState = { success: boolean; error?: string };

const CUSTOMER_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER];

const customerSchema = z.object({
  name: z.string().trim().min(2, "Nama pelanggan minimal 2 karakter").max(150),
  phone: z.string().trim().max(30).nullish(),
  email: z
    .string()
    .trim()
    .max(150)
    .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), "Email tidak valid")
    .nullish(),
  address: z.string().trim().max(500).nullish(),
  notes: z.string().trim().max(1000).nullish(),
  status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]),
  creditLimit: z.coerce.number().min(0, "Limit kredit tidak valid").nullish(),
});

function readCustomerForm(formData: FormData) {
  return {
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    notes: formData.get("notes"),
    status: formData.get("status"),
    creditLimit: formData.get("creditLimit") || null,
  };
}

export async function createCustomer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireAnyRole(CUSTOMER_ROLES);

  const parsed = customerSchema.safeParse(readCustomerForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        storeId: ctx.store.id,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        status: data.status,
        creditLimit: data.creditLimit ?? null,
      },
    });
    await tx.activityLog.create({
      data: {
        storeId: ctx.store.id,
        userId: ctx.user.id,
        action: "CREATE",
        module: "customers",
        description: `Menambah pelanggan ${data.name}`,
        metadataJson: { customerId: customer.id, status: data.status },
      },
    });
  });

  revalidatePath("/dashboard/customers");
  return { success: true };
}

export async function updateCustomer(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireAnyRole(CUSTOMER_ROLES);

  const parsed = customerSchema.safeParse(readCustomerForm(formData));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }
  const data = parsed.data;

  const customer = await prisma.customer.findFirst({ where: { id, storeId: ctx.store.id } });
  if (!customer) {
    return { success: false, error: "Pelanggan tidak ditemukan." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        status: data.status,
        creditLimit: data.creditLimit ?? null,
      },
    });
    await tx.activityLog.create({
      data: {
        storeId: ctx.store.id,
        userId: ctx.user.id,
        action: "UPDATE",
        module: "customers",
        description:
          customer.status === data.status
            ? `Memperbarui pelanggan ${data.name}`
            : `Mengubah status pelanggan ${data.name} dari ${customer.status} menjadi ${data.status}`,
        metadataJson: {
          customerId: id,
          previousStatus: customer.status,
          status: data.status,
        },
      },
    });
  });

  revalidatePath("/dashboard/customers");
  revalidatePath(`/dashboard/customers/${id}`);
  return { success: true };
}
