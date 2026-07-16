"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireProductAccess } from "@/lib/auth/rbac";
import { slugify } from "@/lib/utils";

export type ActionState = { success: boolean; error?: string };

const categorySchema = z.object({
  name: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(100),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await requireProductAccess();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const slug = slugify(parsed.data.name);
  if (!slug) {
    return { success: false, error: "Nama kategori tidak valid." };
  }

  const existing = await prisma.category.findUnique({
    where: { storeId_slug: { storeId: ctx.store.id, slug } },
  });
  if (existing) {
    return { success: false, error: "Kategori dengan nama serupa sudah ada." };
  }

  await prisma.category.create({
    data: {
      storeId: ctx.store.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
    },
  });
  await prisma.activityLog.create({
    data: {
      storeId: ctx.store.id,
      userId: ctx.user.id,
      action: "CREATE",
      module: "categories",
      description: `Menambah kategori ${parsed.data.name}`,
    },
  });

  revalidatePath("/dashboard/categories");
  return { success: true };
}

export async function updateCategory(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ctx = await requireProductAccess();

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const category = await prisma.category.findFirst({ where: { id, storeId: ctx.store.id } });
  if (!category) {
    return { success: false, error: "Kategori tidak ditemukan." };
  }

  const slug = slugify(parsed.data.name);
  if (slug !== category.slug) {
    const existing = await prisma.category.findUnique({
      where: { storeId_slug: { storeId: ctx.store.id, slug } },
    });
    if (existing && existing.id !== id) {
      return { success: false, error: "Kategori dengan nama serupa sudah ada." };
    }
  }

  await prisma.category.update({
    where: { id },
    data: { name: parsed.data.name, slug, description: parsed.data.description || null },
  });
  await prisma.activityLog.create({
    data: {
      storeId: ctx.store.id,
      userId: ctx.user.id,
      action: "UPDATE",
      module: "categories",
      description: `Memperbarui kategori ${parsed.data.name}`,
    },
  });

  revalidatePath("/dashboard/categories");
  return { success: true };
}

export async function deleteCategory(id: string): Promise<ActionState> {
  const ctx = await requireProductAccess();

  const category = await prisma.category.findFirst({
    where: { id, storeId: ctx.store.id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) {
    return { success: false, error: "Kategori tidak ditemukan." };
  }
  if (category._count.products > 0) {
    return {
      success: false,
      error: "Kategori masih memiliki produk. Pindahkan produk terlebih dahulu.",
    };
  }

  await prisma.category.delete({ where: { id } });
  await prisma.activityLog.create({
    data: {
      storeId: ctx.store.id,
      userId: ctx.user.id,
      action: "DELETE",
      module: "categories",
      description: `Menghapus kategori ${category.name}`,
    },
  });

  revalidatePath("/dashboard/categories");
  return { success: true };
}
